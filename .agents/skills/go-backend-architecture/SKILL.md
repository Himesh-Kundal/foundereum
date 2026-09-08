---
name: go-backend-architecture
description: >-
  Use this skill when designing, writing, refactoring, or reviewing Go backend code in Foundereum.
  Enforces four-binary layout (api, gateway, mcp, worker), internal/ package structure,
  sqlc+pgx patterns, error envelopes, adapter interfaces, and money handling idioms.
---

# Go Backend Architecture & Idioms

## 1. Four-Binary Layout

Foundereum is a Go 1.23 single module containing four distinct binaries in `cmd/`:

1. **`cmd/api` (port 8080):**
   - Control plane API for human operators and dashboard.
   - Handles auth (Privy session JWT verification, dev bypass), orgs, projects, policy CRUD, API key issuance, approvals, statistics, and SSE events.
   - Holds Privy app secret, JWT secret, faucet operator key.

2. **`cmd/gateway` (port 8081):**
   - High-throughput machine gateway serving x402-gated calls: `POST /v1/tools/{tool}` and `POST /v1/payments/build`.
   - Middleware chain: `RequestID` → `RealIP` → `slog` → `Recoverer` → `CORS` → `APIKeyAuth` (`Bearer fnd_sk_...`) → `RateLimit` (Redis token bucket: 10 rps, burst 30) → `Idempotency` (`Idempotency-Key` header) → `ToolResolve` (spec lookup & price estimate) → `X402` (challenge vs verify + settle) → `ToolHandler` (Privy sign + tool execute + audit enqueue).
   - Holds Privy authorization key (wallet signing only, no policy mutation), Blocky402 / facilitator credentials, Graph API key.

3. **`cmd/mcp` (port 8082):**
   - Model Context Protocol server exposing tools over Streamable HTTP (`/mcp`) using `modelcontextprotocol/go-sdk`.
   - Session keyed by `Mcp-Session-Id`; developers authenticate via `Authorization: Bearer fnd_sk_...`.
   - Executes x402 client loop: sends initial request → receives HTTP 402 challenge → calls `/v1/payments/build` → retries request with `X-PAYMENT` header → parses response into MCP format.
   - Formats untrusted external data with prefix `data (untrusted):`.

4. **`cmd/worker`:**
   - Background task worker driven by `hibiken/asynq`.
   - Tasks include:
     - `bootstrap_hedera`: auto-create Hedera ECDSA alias, associate USDC, seed test funds, create HCS topic.
     - `sync_balances`: mirror node balance polls → update `wallets` cache + create deposit ledger entries + emit SSE.
     - `confirm_receipts`: poll submitted self-facilitated payments until settled.
     - `hcs_audit`: write settled payments to HCS topic (`TopicMessageSubmitTransaction`).
     - `refund_failed_calls`: credit back settled payments if tool execution failed.

---

## 2. Package Organization (`internal/`)

```
internal/
├── config/       # Environment parsing using caarlos0/env
├── db/           # Database connections (pgxpool) and generated sqlc code
│   └── queries/  # .sql queries for sqlc compilation
├── httpx/        # HTTP error envelope helpers, JSON serialization, middleware helpers
├── ledger/       # THE ONLY PACKAGE authorized to mutate balances and ledger_entries
├── privy/        # Privy client (server wallets, policy push, raw_sign, eth_signTransaction)
├── hedera/       # Hedera SDK client wrapper (HTS, HCS, transfers, token association)
├── tools/        # Tool registry, ToolSpec definition, and tool implementations
│   ├── graph/    # Subgraph MCP proxy, Messari standardized queries, pool analytics
│   ├── swap/     # SaucerSwap router EVM bindings and swap executors
│   └── wallet/   # Balance queries, token transfers, project info
├── x402/         # x402 types (Challenge, Requirement, Payload), pricing math, facilitator interface
│   ├── blocky/   # Blocky402 facilitator client
│   └── self/     # Self-facilitation fallback countersigning with platform fee-payer
```

---

## 3. Strict Rules & Architectural Invariants

1. **Rule of Isolation for Ledger:**
   - **NEVER** write to `wallets.balance`, `wallets.usdc_balance`, `wallets.hbar_balance`, or insert into `ledger_entries` outside `internal/ledger`.
   - All balance changes must go through `internal/ledger` within an active Postgres transaction (`pgx.Tx`).

2. **Decimals for Money:**
   - **NEVER** use floating-point types (`float32`, `float64`) for token balances, transaction amounts, or USD pricing.
   - Use `shopspring/decimal.Decimal` in Go structs and calculations.
   - Represent token base units (e.g. 6 decimals for USDC, tinybars for HBAR) as big integers or `decimal.Decimal`.

3. **Adapters Behind Interfaces:**
   - External dependencies (`wallet.Signer`, `x402.Facilitator`, `graph.Client`) MUST be interfaces to allow `MOCK_CHAINS=true` test execution without live Hedera/Privy/Graph networks.

---

## 4. Error Envelope Conventions (`httpx`)

Standard JSON API error format:

```json
{
  "error": {
    "code": "PAYMENT_REQUIRED",
    "message": "x402 payment required to access this resource",
    "details": {}
  }
}
```

### Go Idiom for HTTP Responses:
```go
package httpx

import (
    "encoding/json"
    "net/http"
)

type ErrorEnvelope struct {
    Error ErrorBody `json:"error"`
}

type ErrorBody struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details any    `json:"details,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(data)
}

func Err(w http.ResponseWriter, status int, code, message string, details ...any) {
    var det any
    if len(details) > 0 {
        det = details[0]
    }
    JSON(w, status, ErrorEnvelope{
        Error: ErrorBody{
            Code:    code,
            Message: message,
            Details: det,
        },
    })
}
```

Standard error codes:
- `UNAUTHORIZED` (401)
- `PAYMENT_REQUIRED` (402)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `PAYMENT_REPLAYED` (409)
- `POLICY_VIOLATION` (422)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## 5. sqlc + pgx Patterns

- Use `jackc/pgx/v5` with `pgxpool.Pool`.
- Wrap transactional workflows with a `WithTx` runner:

```go
func (s *Service) RunInTx(ctx context.Context, fn func(q *db.Queries) error) error {
    tx, err := s.pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback(ctx)

    q := s.queries.WithTx(tx)
    if err := fn(q); err != nil {
        return err
    }
    return tx.Commit(ctx)
}
```

- Always pass `context.Context` as the first argument to query and service methods.
- Handle database errors with typed error checks:
  ```go
  if errors.Is(err, pgx.ErrNoRows) {
      return nil, ErrNotFound
  }
  ```
