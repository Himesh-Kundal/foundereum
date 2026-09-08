# 01 — Product Design

## 1. Problem

AI agents can reason about on-chain finance but can't act in it safely: no wallet, no way to pay for the APIs they call, no guardrails against prompt injection, and no live blockchain data. Businesses that want to deploy agents face the same gap from the other side: how do I give an agent a budget, restrict what it can touch, and get an auditable bill?

## 2. Vision

**"A business account, a spending policy, and a metered toolbelt for your AI agents — settled on Hedera."**

A team signs in, creates a project, gets Privy-secured server wallets on Hedera, sets a policy (daily cap, allowed contracts, approvers), funds the treasury with test USDC, and receives an x402 API key. One line in Claude Desktop's MCP config later, the agent can swap, transfer, deploy, and query live blockchain data through The Graph — each call paid for with a sub-cent HTS transfer via Blocky402, each payment mirrored to an HCS audit topic.

## 3. Personas

| Persona | Goal | Touchpoint |
|---------|------|-----------|
| **Operator (business/dev)** | Give agents a budget + guardrails; get an auditable bill | React dashboard |
| **Approver (teammate)** | Sign off on withdrawals / policy changes | Dashboard approvals inbox |
| **Agent** (Claude Desktop / Code / any MCP client) | Do Web3 work cheaply and reliably | MCP server → x402 gateway |
| **Foundereum (us)** | Sell tools per call without seats or subscriptions | Gateway, facilitator, HCS topic |

## 4. Developer journey

```
1. Sign in with Privy (email OTP / Google)   → org created
2. Create project "market-scout"             → Privy server wallets: treasury + agent wallet (Hedera, ECDSA)
3. Invite teammate as Approver               → 2-of-2 quorum for withdrawals > 100 USDC and policy edits
4. Set policy                                → 25 USDC/day, allowlist: SaucerSwap router, Foundereum payTo, USDC
5. Fund treasury                             → faucet button (testnet USDC + HBAR) or send to shown account id
6. Issue API key                             → fnd_sk_live_…  (x402-enabled, bound to agent wallet + policy)
7. Paste MCP config into Claude Desktop      → 14 tools appear
8. "Which stablecoin pool on Base has the healthiest liquidity right now? Then swap 5 USDC → HBAR."
                                             → 3 Graph queries ($0.00003 total) + 1 swap ($0.01), all paid on Hedera
9. Dashboard                                 → live call log, spend meter, HCS audit link, approvals inbox
```

Target: **< 4 minutes from sign-in to first paid agent action.**

## 5. Feature inventory

### Tier 0 — must ship (all three prize baselines depend on these)

| Feature | Sponsor requirement it satisfies |
|---------|----------------------------------|
| Privy login (email/OAuth) + org + team members with roles | Privy: "team permissions", "business use case" |
| Project → Privy server wallets (treasury + per-agent) on Hedera | Privy: "create/use ≥1 Privy wallet"; Hedera |
| Policy editor → Privy Policy Engine (velocity, allowlists, selectors) | Privy: "≥1 Privy control (policies)" |
| Treasury funding (faucet / direct) + balance sync | Privy: "treasury operation" |
| x402 API key issuance | Hedera |
| x402 gateway + **Blocky402** settlement, HTS USDC | Hedera: "live x402-gated service settled through Blocky402" |
| MCP server + `npx foundereum-mcp` bridge | Hedera: "platform that consumes it"; Graph: "AI tooling" |
| `swap_tokens` (SaucerSwap testnet), `transfer_token`, `get_balances` | Something worth paying for |
| **Graph tools:** `search_subgraphs`, `get_subgraph_schema`, `execute_subgraph_query` behind x402, metered by bytes | Graph: "x402 payment tooling", "live data from a Graph provider" |
| **Graph decision tools:** `analyze_pool_health`, `compare_protocol_tvl` (Messari standardized subgraphs → structured verdict) | Graph: "meaningful work with the data: reasoning, decisions" |
| Dashboard: projects, wallets, policies, keys, live call log, spend meter | Privy/Hedera: "working frontend and backend" |

### Tier 1 — should ship (extra points / stronger story)

| Feature | Sponsor |
|---------|---------|
| **HCS audit trail**: every settled payment → HCS topic message; dashboard links to HashScan topic | Hedera extra points: "verifiable payment audit trails on HCS" |
| **Key quorum approvals**: withdrawals over threshold and policy edits require m-of-n approver signatures (Privy key quorum) | Privy: "quorum approvals" |
| **Pay-per-use metering** UI: show per-call price breakdown (bytes × rate) | Hedera extra points: "metering rather than flat charge" |
| ERC-8004 `AgentIdentityRegistry` on Hedera EVM; `verify_agent` tool | Hedera extra points: "on-chain agent identity using ERC-8004" |
| Service directory page `/services` (machine-readable JSON + human page listing tools, prices, payTo) | Hedera extra points: "directory that makes your service findable" |

### Tier 2 — stretch

| Feature | Sponsor |
|---------|---------|
| **Substreams single-prompt deploy** `deploy_substreams_pipeline` using Substreams SKILLs → Postgres sink | Graph featured challenge |
| Scheduled Transactions for recurring agent budgets (top-up treasury→agent wallet weekly) | Hedera extra points |
| Privy `intents` / event-driven auto-topup when agent balance < floor | Privy "automated transactions" |

## 6. Dashboard screens

```
/login                        Privy modal (email OTP, Google). Dev bypass in local env.
/org                          Org name, members (Owner / Approver / Viewer), invite.
/projects                     List + "New project".
/projects/:id                 Overview: treasury + agent balances (USDC, HBAR), spend today/cap, MCP config copy.
/projects/:id/wallets         Wallet cards (Hedera account id + EVM alias), deposit info, faucet, "withdraw" (quorum-gated).
/projects/:id/policy          Policy form → JSON preview → Push to Privy. Edits go to approvals if quorum enabled.
/projects/:id/keys            API keys (masked), create/revoke.
/projects/:id/calls           Live call log (SSE): tool, metered price, HashScan tx, latency, status.
/projects/:id/audit           HCS topic id, last N messages, HashScan link.
/projects/:id/approvals       Pending quorum actions; approve/reject (signs with approver's Privy key).
/projects/:id/pipelines       Substreams deployments (stretch).
/services                     Public: tool directory with prices + x402 payTo — "findable by other agents".
```

## 7. Pricing model (what the 402 charges) — metered, not flat

| Tool | Price rule | Example |
|------|-----------|---------|
| `get_balances`, `get_project_info`, `list_services` | free | — |
| `search_subgraphs`, `get_subgraph_schema` | $0.00001 flat | 1 unit-ish |
| `execute_subgraph_query` | $0.00001 + $0.000002 per KB returned | 10 KB → $0.00003 |
| `analyze_pool_health`, `compare_protocol_tvl` | $0.0005 + Graph pass-through | ~$0.0006 |
| `transfer_token` | $0.002 | — |
| `swap_tokens` | $0.005 + 0.05% of notional (capped $0.05) | 5 USDC swap → $0.0075 |
| `deploy_contract` | $0.02 + $0.001 per KB bytecode | — |
| `deploy_substreams_pipeline` | $0.25 | — |

USD → HTS USDC at 6 decimals; floor of 1 unit ($0.000001). Price computed *before* the challenge for fixed parts and reconciled after execution for variable parts (byte-metered tools issue a challenge for an estimate; overage under $0.0001 is absorbed, larger overage is charged on the next call as a `carry` — keeps the flow single-round-trip).

## 8. Prize checklist (verbatim requirements → where we satisfy them)

### Hedera — AI & Agentic Payments on Hedera
- [ ] Live x402-gated service on Hedera testnet settled through Blocky402 → `gateway` + `internal/x402/hedera`
- [ ] Platform/agent that consumes it, ≥1 real paid request end to end → `mcp` + Claude Desktop demo
- [ ] Public repo, README with setup, architecture, payment flow → README + this `docs/`
- [ ] Demo video ≤ 5 min showing the paid request → demo script §10
- Extra: metering ✅, ERC-8004 identity (Tier 1), HTS token in settlement path ✅, HCS audit trail (Tier 1), directory (Tier 1), Scheduled Transactions (Tier 2)

### The Graph — Best AI Tooling or AI Use Case (From Scratch)
- [ ] The Graph load-bearing: tooling targets the Subgraph MCP **and** the agent uses Subgraphs as its data source ✅
- [ ] Live data from a Graph provider (Subgraph Studio API key) — no mocks in the demo ✅
- [ ] Meaningful work with data: `analyze_pool_health` / `compare_protocol_tvl` return decisions the agent acts on ✅
- [ ] Reusable tooling: `foundereum-mcp` is a generic MCP server + x402 client anyone can point at any x402 Graph endpoint; README + SKILL.md ✅
- [ ] Public repo + 2–4 min video ✅
- [ ] Pool: **Start Fresh** ✅
- Featured: Substreams single-prompt deploy (Tier 2)

### Privy — Best B2B financial product
- [ ] Privy core to the product ✅ (auth + server wallets + policies)
- [ ] ≥1 Privy wallet created ✅
- [ ] Business/organization use case ✅ (org, members, treasury, agent spend management)
- [ ] ≥1 functional B2B workflow ✅ (treasury funding, policy push, quorum-gated withdrawal)
- [ ] ≥1 Privy control: policies ✅, key quorums (Tier 1)
- [ ] Working demo + source ✅
- [ ] Explain how Privy enables it → README section "Why Privy"

## 9. Non-goals

- Mainnet. Testnet only.
- Fiat on-ramps, KYC.
- Any chain other than Hedera for execution (Graph reads are chain-agnostic).
- Custom DEX contracts. We call SaucerSwap's existing testnet router.
- Hosting an LLM. We're an MCP server; the model is the user's.

## 10. Demo success criteria

- Sign-in → first paid tool call in < 4 min, live.
- One Claude prompt that triggers **Graph queries + a decision + a Hedera swap**, every step visible in the call log with HashScan links.
- A **policy rejection** (Privy TEE says no).
- The **HCS audit topic** showing the payments just made.
- A **quorum approval** for a treasury withdrawal.
