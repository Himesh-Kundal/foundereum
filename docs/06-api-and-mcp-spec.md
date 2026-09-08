# 06 — API & MCP Specification

Surfaces: **control plane REST** (`api`, JWT), **x402 gateway** (`gateway`, API key), **MCP** (`mcp`, Streamable HTTP). Errors use `{ "error": { code, message, details } }`.

---

## 1. Control plane (`/v1`, `Authorization: Bearer <session jwt>`)

### Auth & org
| Method | Path | Body → Returns |
|--------|------|----------------|
| POST | `/auth/session` | Privy access token in header → `{jwt, user, org, role}` |
| POST | `/auth/dev` | `{name}` (dev only) → `{jwt,…}` |
| GET | `/me` | → `{user, org, role}` |
| GET | `/orgs/{id}/members` | → `[member]` |
| POST | `/orgs/{id}/members` | `{email, role}` → `201 member` (owner only) |
| POST | `/orgs/{id}/members/me/auth-key` | `{pubkey}` → registers approver key (Privy authorization key or app P-256) |

### Projects
| Method | Path | Body → Returns |
|--------|------|----------------|
| GET | `/projects` | → `[project]` |
| POST | `/projects` | `{name, slug?, policy_template, quorum:{threshold, withdraw_min_usd}}` → `201 {project, wallets}` |
| GET | `/projects/{id}` | → `{project, wallets, balances_usd, spend_24h_usd, cap_usd, hcs_topic, identity}` |
| GET | `/projects/{id}/mcp-config` | → `{claude_desktop: {...}, http_url}` |

### Wallets & treasury
| Method | Path | Returns |
|--------|------|---------|
| GET | `/projects/{id}/wallets` | `[{id, kind, evm_address, hedera_account_id, usdc, hbar, status, hashscan_url}]` |
| POST | `/projects/{id}/faucet` | `{txs}` (testnet; per-org rate limit) |
| POST | `/projects/{id}/topup` | `{amount_usdc}` treasury → agent; below quorum threshold executes immediately, else creates approval |
| POST | `/projects/{id}/withdraw` | `{to_account, amount_usdc}` → `201 approval` (quorum) or `{tx_id}` |

### Policy
| Method | Path | Body → Returns |
|--------|------|----------------|
| GET | `/projects/{id}/policy` | → `{spec, version, privy_policy_id, pushed_at}` |
| PUT | `/projects/{id}/policy` | `{spec}` → `{spec, version}` or `201 approval` when quorum enabled |
| POST | `/projects/{id}/policy/push` | → `{privy_policy_id}` |
| POST | `/projects/{id}/policy/simulate` | `{to, data, value}` → `{allowed, reasons}` |

### Keys
| Method | Path | Body → Returns |
|--------|------|----------------|
| GET | `/projects/{id}/keys` | → `[{id, name, prefix, status, last_used_at, carry_usd}]` |
| POST | `/projects/{id}/keys` | `{name}` → `201 {key (once)}` or `402 TREASURY_UNDERFUNDED` |
| DELETE | `/projects/{id}/keys/{kid}` | → `204` |

### Approvals
| Method | Path | Body → Returns |
|--------|------|----------------|
| GET | `/projects/{id}/approvals?status=pending` | → `[approval]` |
| POST | `/approvals/{id}/approve` | `{signature}` → `{status, signatures_count, result_tx_id?}` |
| POST | `/approvals/{id}/reject` | → `{status}` |

### Activity
| Method | Path | Returns |
|--------|------|---------|
| GET | `/projects/{id}/calls?limit&cursor&tool&status` | `{items, next_cursor}` |
| GET | `/projects/{id}/calls/{cid}` | `{call, payment}` |
| GET | `/projects/{id}/payments` | `[payment]` |
| GET | `/projects/{id}/audit?limit` | `{topic_id, hashscan_url, messages:[{seq, ts, body, matched_payment_id}]}` |
| GET | `/projects/{id}/stats?range=7d` | `{spend_by_day, calls_by_tool}` |
| GET | `/projects/{id}/events` | SSE |

### Public
| Method | Path | Returns |
|--------|------|---------|
| GET | `/services` | Directory: `{name:"Foundereum", x402:{scheme:"hedera-exact", network:"hedera-testnet", asset, payTo}, tools:[{name, description, pricing, input_schema}]}` — agent-discoverable |

---

## 2. Gateway (`/v1`, `Authorization: Bearer fnd_sk_…`)

```
POST /v1/tools/{tool}
  Idempotency-Key: <uuid>
  X-PAYMENT: <base64>   (absent on first attempt)
Body: tool args
```

**402 challenge**
```json
{
  "x402Version": 1,
  "resource": "execute_subgraph_query",
  "nonce": "b1f2c3…",
  "expires": "2026-09-08T10:15:00Z",
  "pricing": { "estimate_usd": "0.00003", "rule": "base 0.00001 + 0.000002/KB × est 10KB", "carry_usd": "0" },
  "accepts": [{
    "scheme": "hedera-exact", "network": "hedera-testnet",
    "asset": "0.0.429274", "amount": "30", "payTo": "0.0.5551234",
    "extra": { "memo": "fnd:b1f2c3", "maxTimeoutSeconds": 120 }
  }]
}
```

**Payment build**
```
POST /v1/payments/build  { "nonce": "b1f2c3…" }
→ { "x_payment": "<base64>", "expires": "…" }
```
`X-PAYMENT` decodes to:
```json
{ "x402Version": 1, "scheme": "hedera-exact", "network": "hedera-testnet", "nonce": "b1f2c3…",
  "payload": { "transaction": "<base64 partially-signed TransferTransaction bytes>" } }
```

**200**
```json
{
  "result": { … },
  "call_id": "…",
  "payment": { "hedera_tx_id": "0.0.1234@1757300000.123", "amount": "30", "amount_usd": "0.00003",
               "hashscan_url": "https://hashscan.io/testnet/transaction/…", "facilitator": "blocky402" },
  "metering": { "estimate_usd": "0.00003", "actual_usd": "0.000028", "bytes": 9120 },
  "latency_ms": 1420
}
```

Free (no 402): `GET /v1/tools`, `GET /v1/self`, `GET /v1/services`.

---

## 3. MCP tool catalog

| Tool | Pricing | Input | Output |
|------|---------|-------|--------|
| **Wallet** | | | |
| `get_project_info` | free | `{}` | project, wallets, hcs topic, identity |
| `get_balances` | free | `{}` | USDC/HBAR per wallet |
| `transfer_token` | $0.002 | `{to_account, token:"USDC"\|"HBAR", amount}` | `{hedera_tx_id, hashscan_url}` |
| **DeFi (Hedera)** | | | |
| `get_swap_quote` | $0.0001 | `{token_in, token_out, amount_in}` | `{amount_out, path, price_impact_bps}` |
| `swap_tokens` | $0.005 + 5 bps (cap $0.05) | `{token_in, token_out, amount_in, slippage_bps?}` | `{tx_hash, amount_out, hashscan_url}` |
| `deploy_contract` | $0.02 + $0.001/KB | `{bytecode, abi, constructor_args}` | `{address, tx_hash}` |
| **The Graph** | | | |
| `search_subgraphs` | $0.00001 | `{keyword}` | deployments |
| `get_subgraph_schema` | $0.00001 | `{deployment_id}` | SDL |
| `execute_subgraph_query` | $0.00001 + $0.000002/KB | `{deployment_id, query, variables?}` | rows |
| `analyze_pool_health` | $0.0005 + pass-through | `{protocol, network, pool}` | `{score, risks, tvl_usd, vol_tvl_24h, top_swap_share, suggested_max_notional_usd, evidence}` |
| `compare_protocol_tvl` | $0.0005 + pass-through | `{protocols:[…], network}` | ranked `[{protocol, tvl_usd, delta_7d_pct, deployment_id}]` |
| `deploy_substreams_pipeline` | $0.25 | `{prompt, network}` | `{pipeline_id, tables, status}` (stretch) |
| `query_pipeline` | $0.00001/KB | `{pipeline_id, sql}` | rows (stretch) |
| **Identity** | | | |
| `verify_agent` | $0.00001 | `{agent_id \| evm_address}` | `{registered, owner, uri}` |
| **Directory** | | | |
| `list_services` | free | `{}` | same as `/services` |

Example schema:

```json
{
  "name": "analyze_pool_health",
  "description": "Assess a DEX liquidity pool using live data from The Graph (Messari standardized subgraphs). Returns a 0-100 health score, named risks, and a suggested maximum trade size. Costs ~$0.0006 paid from your agent wallet on Hedera.",
  "inputSchema": {
    "type": "object", "required": ["protocol", "network", "pool"],
    "properties": {
      "protocol": { "type": "string", "enum": ["uniswap-v3", "sushiswap", "aerodrome", "curve"] },
      "network":  { "type": "string", "enum": ["mainnet", "base", "arbitrum", "optimism"] },
      "pool":     { "type": "string", "description": "pool address or 'TOKENA/TOKENB fee' e.g. 'USDC/WETH 0.05%'" }
    }
  }
}
```

---

## 4. SSE events
```
call.challenged {call_id, tool, estimate_usd}
call.paid       {call_id, hedera_tx_id}
call.completed  {call_id, status, actual_usd, latency_ms, tx_hash?}
call.failed     {call_id, error}
wallet.balance  {wallet_id, usdc, hbar}
audit.published {payment_id, hcs_seq}
approval.update {approval_id, status, signatures_count}
project.ready   {project_id}
```

---

## 5. `SKILL.md` (repo root, for Graph judges)

Short Markdown telling an agent: what Foundereum is, how to get a key, the MCP config, the recommended flow (`search_subgraphs` → `get_subgraph_schema` → `execute_subgraph_query`, or the standardized helpers), how prices are metered, and how to read the `payment` block. This is what makes the tooling "reusable infrastructure, not a single end-user app."
