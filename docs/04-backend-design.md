# 04 — Backend Design (Go)

## 1. Principles

1. **Adapters behind interfaces.** `wallet.Signer`, `x402.Facilitator`, `graph.Client` are interfaces; Privy/Blocky402/subgraph-mcp implement them; `MOCK_CHAINS=true` swaps in fakes so the UI can be built and the demo can survive a testnet outage.
2. **Gateway holds no root keys.** It can only ask Privy to sign with agent wallets inside policies it cannot edit.
3. **Every money mutation is a `ledger` call inside a Postgres tx.**
4. **Tools are data.** name + JSON schema + pricing rule + executor. MCP server and gateway read one registry.

## 2. Binaries

### `cmd/api` (:8080)
Routes in `06`. Startup: config → PG/Redis → goose migrations → `privy.Client`, `hedera.Client` (faucet operator) → chi → serve. Also serves `/services` (public directory JSON).

### `cmd/gateway` (:8081)
Middleware chain for `POST /v1/tools/{tool}`:

```
RequestID → RealIP → slog → Recoverer → CORS
→ APIKeyAuth      Bearer fnd_sk_… → ctx{project, agentWallet, key, policy}
→ RateLimit       Redis token bucket per key (10 rps, burst 30)
→ Idempotency     Idempotency-Key → replay cached response
→ ToolResolve     registry → ToolSpec; pricing.Estimate(args) → USD → USDC units
→ X402            no X-PAYMENT → 402 challenge ; with → verify + settle via Blocky402
→ ToolHandler     executor (policy pre-check → Privy sign → broadcast) ; post-metering ; audit enqueue
```

Plus `POST /v1/payments/build` (nonce → partially-signed HTS transfer via agent wallet) so the MCP server stays thin.

### `cmd/mcp` (:8082)
- Transport: Streamable HTTP at `/mcp`; session keyed by `Mcp-Session-Id`; `Authorization: Bearer fnd_sk_…` stored on session.
- Every registry tool exposed with its JSON schema. Handler = x402 client loop:

```go
func (s *Server) call(ctx context.Context, name string, args json.RawMessage) (*mcp.CallToolResult, error) {
    idem := uuid.NewString()
    resp := s.gw.Post(ctx, "/v1/tools/"+name, args, idem, "")
    if resp.Status == 402 {
        var ch x402.Challenge; json.Unmarshal(resp.Body, &ch)
        pay := s.gw.BuildPayment(ctx, ch.Nonce)          // POST /v1/payments/build
        resp = s.gw.Post(ctx, "/v1/tools/"+name, args, idem, pay.XPayment)
    }
    return toMCP(resp), nil   // errors → IsError:true with code+message; data → "data (untrusted): …"
}
```

- `bridge/` npm package `foundereum-mcp`: ~60-line stdio↔Streamable-HTTP proxy for Claude Desktop. Claude Code hits the HTTP URL directly.

Dashboard-generated config:

```json
{ "mcpServers": { "foundereum": {
    "command": "npx", "args": ["-y", "foundereum-mcp", "--url", "https://mcp.foundereum.xyz/mcp"],
    "env": { "FOUNDEREUM_API_KEY": "fnd_sk_live_…" } } } }
```

### `cmd/worker` (asynq)

| Task | Trigger | Does |
|------|---------|------|
| `bootstrap_hedera` | project create | HBAR to EVM alias (auto-create), resolve account ids, USDC associate (Privy raw_sign), seed USDC, create HCS topic |
| `sync_balances` | every 10s | Mirror node balances → `wallets.balance` + deposit ledger entries + SSE |
| `confirm_receipts` | every 5s | `payments.status=submitted` (self-facilitator mode) → receipt → settled/failed |
| `hcs_audit` | per settled payment | `TopicMessageSubmitTransaction` → store seq/ts |
| `refund_failed_calls` | cron (Tier 2) | credit back settled payments whose tool failed |
| `substreams_deploy` | tool call (Tier 2) | sandbox container running Substreams SKILLs; stream logs |
| `agent_topup` | Privy intent / cron (Tier 2) | treasury → agent HTS transfer when balance < floor |

## 3. Core packages

### `internal/x402`

```go
type Challenge struct {
    X402Version int          `json:"x402Version"`
    Nonce       string       `json:"nonce"`
    Expires     time.Time    `json:"expires"`
    Resource    string       `json:"resource"`
    Accepts     []Requirement `json:"accepts"`
}
type Requirement struct {
    Scheme  string         `json:"scheme"`   // "hedera-exact"
    Network string         `json:"network"`  // "hedera-testnet"
    Asset   string         `json:"asset"`    // HTS token id "0.0.xxxx"
    Amount  string         `json:"amount"`   // base units (6 dp)
    PayTo   string         `json:"payTo"`    // "0.0.PLATFORM"
    Extra   map[string]any `json:"extra"`    // memo, maxTimeoutSeconds
}

type Facilitator interface {
    Verify(ctx, payload Payload, req Requirement) (VerifyResult, error)
    Settle(ctx, payload Payload, req Requirement) (SettleResult, error)   // idempotent by nonce
}
```

`x402/hedera`:
- `BuildTransfer(agent AccountRef, req Requirement, memo string) (frozenBytes, bodyHash)`: `NewTransferTransaction().AddTokenTransfer(usdc, agent, -amt).AddTokenTransfer(usdc, platform, +amt).SetTransactionMemo(memo).SetTransactionID(TransactionIDGenerate(agent)).SetTransactionValidDuration(120s).FreezeWith(client)`.
- `AttachSignature(frozenBytes, pubKey, sig)` → `AddSignature`.
- `blocky.Client` implements `Facilitator` against Blocky402 `/verify` and `/settle`. `self.Facilitator` (env `FACILITATOR_MODE=self`) countersigns with our fee-payer and `Execute`s — same request/response shape, so switching is config only.

Middleware (abridged):

```go
func (m *Middleware) Handler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        spec, key := ToolFromCtx(r.Context()), KeyFromCtx(r.Context())
        xp := r.Header.Get("X-PAYMENT")
        if xp == "" {
            ch := m.challenge(spec, key, PriceFromCtx(r.Context()))   // nonce → Redis SETEX 120s
            httpx.JSON(w, 402, ch); return
        }
        pl, err := DecodePayload(xp)
        ch, ok := m.takeChallenge(pl.Nonce)                          // GETDEL → single use
        if !ok { httpx.Err(w, 409, "PAYMENT_REPLAYED"); return }
        if _, err := m.fac.Verify(r.Context(), pl, ch.Accepts[0]); err != nil { httpx.Err(w, 402, "PAYMENT_INVALID", err); return }
        st, err := m.fac.Settle(r.Context(), pl, ch.Accepts[0])
        if err != nil { httpx.Err(w, 402, "PAYMENT_FAILED", err); return }
        m.ledger.RecordPayment(r.Context(), key, spec, st)           // calls + payments + debit, one tx
        next.ServeHTTP(w, r.WithContext(WithSettlement(r.Context(), st)))
    })
}
```

### `internal/x402/pricing.go` — metering

```go
type Rule struct {
    BaseUSD        decimal.Decimal
    PerKBUSD       decimal.Decimal   // subgraph results
    NotionalBps    int               // swaps
    NotionalCapUSD decimal.Decimal
    PerKBBytecode  decimal.Decimal   // deploys
}
func Estimate(rule Rule, args json.RawMessage) decimal.Decimal   // pre-challenge
func Actual(rule Rule, out Output) decimal.Decimal               // post-execution
// carry = max(0, Actual − Estimate) stored on calls; added to next challenge for the key; overage < $0.0001 absorbed.
```

### `internal/tools`

```go
type Spec struct {
    Name, Description string
    InputSchema       json.RawMessage
    Pricing           pricing.Rule      // zero = free
    Executor          Executor
    Tags              []string          // "graph", "hedera", "wallet" — used by /services directory
}
type Executor interface { Execute(ctx, Input) (Output, error) }
type Input  struct { Project project.Project; Wallet wallet.Ref; Args json.RawMessage; Settlement x402.SettleResult }
type Output struct { Result any; Bytes int; TxHash string; Meta map[string]any }
var Registry = map[string]Spec{}   // init() in each tool package
```

`tools/graph`:
- `proxy.go`: MCP client to `subgraph-mcp` (Streamable HTTP). Wraps `search_subgraphs_by_keyword`, `get_schema_by_deployment_id`, `execute_query_by_deployment_id`. Enforces query ≤ 8 KB, `first` ≤ 1000, 10 s timeout. Returns byte count for metering.
- `standardized.go`: catalog of Messari standardized deployment ids by `(protocol, network)`; canned GraphQL for `liquidityPools`, `liquidityPoolHourlySnapshots`, `swaps`, `protocol.totalValueLockedUSD`.
- `analyze.go`: `analyze_pool_health` → verdict struct `{score 0–100, risks []string, tvl_usd, vol_tvl_24h, top_swap_share, suggested_max_notional_usd}`; `compare_protocol_tvl` → ranked table with 7-day deltas. Pure functions + tests.

`tools/swap`: abigen bindings for a UniswapV2-style router (SaucerSwap testnet); `getAmountsOut`, `approve`, `swapExactTokensForTokens` / `…ForETH`.

`tools/deploy`: `eth_signTransaction` with `to=nil`, bytecode+ctor args; returns address from receipt.

`tools/identity`: `verify_agent` reads `AgentIdentityRegistry` on Hedera EVM.

### `internal/wallet`

```go
type Signer interface {
    RawSign(ctx, walletID string, hash32 []byte) (sig64 []byte, err error)   // Hedera native txs (r‖s)
    SignEVMTx(ctx, walletID string, tx *types.Transaction, chainID *big.Int) ([]byte, error)
}
```
`privy.Signer` (REST: `raw_sign`, `eth_signTransaction`) and `local.Signer` (age-encrypted keys, dev/fallback). Hedera account bootstrap in `wallet/hedera_bootstrap.go`.

### `internal/policy`

Two layers: **local pre-check** (fast, explainable — decodes `to`, selector, value; rolling 24h spend from ledger; payTo allowlist for payments) then **Privy Policy Engine** (authoritative, TEE, `default_action: DENY`). Policy spec (JSONB) rendered to Privy rules on push:

```json
{
  "velocity": { "max_usd_per_24h": "25", "max_usd_per_call": "5" },
  "contract_allowlist": ["0xSaucerRouter", "0xUSDC_HTS_EVM", "0xAgentIdentityRegistry"],
  "selector_allowlist": ["approve(address,uint256)", "swapExactTokensForTokens(...)", "swapExactTokensForETH(...)", "register(...)"],
  "payment": { "pay_to": ["0.0.PLATFORM"], "max_usd_per_call": "1" },
  "raw_sign": { "allowed_purposes": ["hts_transfer_to_platform", "token_associate"] }
}
```

Privy raw_sign has no calldata to inspect, so the local pre-check is the only inspection for native payments; Privy limits raw_sign to the agent wallet and caps via velocity; and the *destination* is fixed by the gateway (it builds the tx, not Claude).

### `internal/approvals`

Quorum actions: `withdraw`, `policy_update`, `key_rotate`. State machine `pending → (n/threshold) → executed | rejected | expired`. Signature collection via Privy key-quorum authorization keys (`QUORUM_MODE=privy`) or app-level P-256 signatures over a challenge (`QUORUM_MODE=app`).

### `internal/ledger`

```go
func (l *Ledger) RecordPayment(ctx, key KeyCtx, spec tools.Spec, st x402.SettleResult) (callID uuid.UUID, err error) // calls + payments + debit
func (l *Ledger) Deposit(ctx, walletID, amt, txID)
func (l *Ledger) SpendLast24h(ctx, projectID) (decimal.Decimal, error)
```
Truth = `SUM(ledger_entries)`; `wallets.balance` is a cache reconciled by `sync_balances`.

### `internal/hcs`
`Publish(ctx, topicID, AuditMessage)`; message schema in `05`.

## 4. Error model

```json
{ "error": { "code": "POLICY_REJECTED", "message": "Swap rejected by project policy: 0xDEAD… is not in the contract allowlist.", "details": { "rule": "contract_allowlist", "to": "0xDEAD…" } } }
```
Codes: `PAYMENT_REQUIRED, PAYMENT_INVALID, PAYMENT_FAILED, PAYMENT_REPLAYED, POLICY_REJECTED, TREASURY_UNDERFUNDED, TOOL_FAILED, UPSTREAM_ERROR, RATE_LIMITED`.

## 5. Config (env)

```
DATABASE_URL, REDIS_URL, ENV, LOG_LEVEL
# api
JWT_SECRET, PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_VERIFICATION_KEY, AUTH_DEV_BYPASS
HEDERA_NETWORK=testnet, HEDERA_FAUCET_ACCOUNT, HEDERA_FAUCET_KEY, HEDERA_USDC_TOKEN_ID
QUORUM_MODE=privy|app
# gateway
PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_AUTH_KEY (authorization key for wallet requests)
WALLET_SIGNER=privy|local
FACILITATOR_MODE=blocky|self, BLOCKY402_URL, HEDERA_FEEPAYER_ACCOUNT/KEY (self mode)
HEDERA_PLATFORM_ACCOUNT, HEDERA_USDC_TOKEN_ID, HEDERA_JSON_RPC=https://testnet.hashio.io/api, HEDERA_EVM_CHAIN_ID=296
SAUCERSWAP_ROUTER, WHBAR_ADDR
SUBGRAPH_MCP_URL, GRAPH_API_KEY
MOCK_CHAINS=false
# worker
HEDERA_OPERATOR_ACCOUNT/KEY (HCS submits, receipts), SUBSTREAMS_SANDBOX_IMAGE
```

## 6. Observability
`slog` JSON with `request_id, project_id, tool`; Prometheus `/metrics`: `fnd_tool_calls_total{tool,status}`, `fnd_tool_latency_seconds`, `fnd_payments_total{status}`, `fnd_metered_usd_total{tool}`, `fnd_hcs_lag_seconds`. SSE fan-out via Redis pub/sub.

## 7. Tests
- Unit: x402 middleware with fake facilitator; pricing rules; policy pre-check; `analyze.go` verdicts against fixture rows.
- Integration (compose, `MOCK_CHAINS=true`): MCP → gateway → 402 → build → settle → tool, asserts one `payments` row and one debit.
- Manual E2E on Hedera testnet + The Graph the night before; video recorded.
