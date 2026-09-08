# 10 — Hackathon Execution Plan

Three prize submissions: **Hedera (AI & Agentic Payments)**, **The Graph (AI Tooling / Use Case — Start Fresh)**, **Privy (Best B2B Financial Product)**. Everything below is ordered so the three baselines are green first.

## 1. Lanes (4 people; collapse B into A for 3)

| Lane | Deliverables |
|------|--------------|
| **A — Payments core (Go)** | `gateway` x402 middleware, Hedera transfer build/partial-sign, Blocky402 client (+ `self` fallback), metering, ledger, `mcp` server + npm bridge, HCS audit worker |
| **B — Privy + tools (Go)** | Privy client (wallets, policies, raw_sign, eth_signTransaction, key quorums), Hedera bootstrap worker, policy pre-check, approvals, `swap_tokens`, `transfer_token`, `deploy_contract`, ERC-8004 registry + `verify_agent` |
| **C — Graph (Go + docs)** | subgraph-mcp sidecar, proxy tools with byte metering, standardized-subgraph catalog, `analyze_pool_health`, `compare_protocol_tvl`, `SKILL.md`, Substreams stretch |
| **D — Frontend + DX** | Privy login, org/members, projects, wallets/faucet, policy editor, keys + MCP config, live call log, audit page, approvals inbox, `/services`, README/video |

## 2. Timeline (48h)

**H0–4 — foundations (all).** Scaffold; compose runs all binaries; migrations; freeze `tools.Spec`, `x402.Facilitator`, `wallet.Signer` interfaces; start Day-0 checklist (`09 §7`) immediately — Privy `raw_sign` and Blocky402 shape are the two unknowns to resolve first.

**H4–12.**
- A: 402 challenge → `payments/build` → settle with a *mock* facilitator; MCP server exposing `get_balances` + one paid stub. **Milestone: Claude Desktop pays for a tool call (mock).**
- B: Privy wallet create + policy push; Hedera auto-create via HBAR to alias; USDC associate via `raw_sign` (or local fallback decided here).
- C: sidecar running; proxy tools returning live Subgraph Studio data; byte counts flowing.
- D: Privy login → org → project → wallets page against mock API.

**H12–24.**
- A: Real Hedera HTS payment via Blocky402 end to end; idempotency, rate limit; HCS audit worker; `/services` JSON.
- B: `swap_tokens` on SaucerSwap testnet signed by Privy; policy rejection path; `transfer_token`.
- C: `analyze_pool_health` + `compare_protocol_tvl` with tests on fixture data; wire into registry.
- D: Policy editor, keys, MCP config copy, live call log (SSE) with HashScan links.

**Milestone H24: all three prize baselines pass on real testnet + real Graph data. Record video #1.**

**H24–36.**
- A: metering carry, refund_pending honesty path, Prometheus, error messages Claude can explain.
- B: Key quorum approvals (Privy mode; app-mode fallback), treasury withdraw + topup flows, ERC-8004 registry deploy + `verify_agent`.
- C: Substreams single-prompt deploy in a sandbox container (timebox 8h; drop if not streaming by H32).
- D: Audit page (mirror-node topic messages cross-checked), approvals inbox, `/services` page, README with architecture diagram + "Why Privy / Why Hedera / Why The Graph" sections.

**Milestone H36: HCS audit + quorum withdrawal demoable. Record video #2.**

**H36–44.** Polish, seed demo data, rehearse 3×, write per-sponsor submission text, Graph feedback/README polish, Privy explanation section.

**H44–48.** Freeze. Submit.

## 3. Cut lines (drop in this order)

1. Substreams single-prompt deploy
2. ERC-8004 registry / `verify_agent`
3. Privy key quorum → app-level approvals (still a "quorum approval" workflow for Privy judges, labelled)
4. `deploy_contract`
5. `compare_protocol_tvl` (keep `analyze_pool_health` — it's the Graph "decision" proof)
6. HCS audit → never drop unless Hedera SDK is broken; it's cheap and scores extra points

Never drop: Privy login + wallets + policy push + policy rejection; x402 via Blocky402 with a real HTS settlement; MCP server + bridge; Graph proxy tools with metering + `analyze_pool_health`; live call log.

## 4. Demo script (≤ 5 min, satisfies all three video requirements)

| t | Screen | Beat |
|---|--------|------|
| 0:00 | Landing | "Agents can reason about DeFi but can't pay for tools or hold a budget safely. Foundereum is a business account and a metered toolbelt for agents, settled on Hedera." |
| 0:20 | Privy login → org → invite approver | "Privy auth. Team roles." |
| 0:45 | New project | Privy server wallets appear; Hedera accounts auto-created; HCS topic created. |
| 1:05 | Policy | 25 USDC/day, allowlist. "Enforced in Privy's TEE — the model can't override it." Push. |
| 1:25 | Fund + key + MCP config | Faucet → balance → key → paste into Claude Desktop. |
| 1:50 | Claude | *"Is the USDC/WETH 0.05% pool on Base healthy enough for a $500 trade? If yes, swap 5 USDC to HBAR here."* → `analyze_pool_health` (Graph, $0.0006, HashScan link in call log) → verdict → `swap_tokens` ($0.0075, Blocky402 settle, then SaucerSwap tx). |
| 2:50 | Claude | *"Send 200 USDC to 0.0.9999."* → **POLICY_REJECTED**, Claude explains. |
| 3:10 | Audit page | HCS topic on HashScan showing the two payments just made, cross-checked. |
| 3:35 | Wallets → Withdraw 500 USDC | Approval created; second browser (approver) approves; tx executes. "Key quorum." |
| 4:10 | `/services` | "Any agent can discover and pay for these tools — no API key, no subscription." |
| 4:30 | Close | Architecture slide; sponsor mapping; next: mainnet, Substreams pipelines per project. |

## 5. Submission checklist per sponsor

**Hedera**
- [ ] README: setup, architecture diagram, payment flow section with the exact 402 → build → settle steps and HashScan links
- [ ] Video ≤ 5 min showing a paid request executing
- [ ] Call out extra points: metering, HTS in settlement path, HCS audit, ERC-8004 (if shipped), `/services` directory

**The Graph (Start Fresh pool)**
- [ ] README + `SKILL.md`: how an agent uses `foundereum-mcp` against The Graph; Subgraph Studio API key setup
- [ ] Video 2–4 min (cut of the main video) showing NL → live subgraph data → decision → action
- [ ] State clearly: net-new, started at event; list the three proxy tools + two decision tools; mention Messari standardized subgraphs
- [ ] If Substreams shipped: separate 60s clip of one-prompt deploy

**Privy**
- [ ] README "Why Privy" section: auth, server wallets (treasury + agent), Policy Engine, key quorum approvals, treasury ops
- [ ] Video segment showing policy rejection + quorum withdrawal
- [ ] Note which features are live vs mocked (only `QUORUM_MODE=app` may be labelled fallback)

## 6. Risk register

| Risk | L | I | Mitigation |
|------|---|---|------------|
| Privy `raw_sign` not available / wrong format for Hedera ECDSA | Med | High | Decide by H6; `WALLET_SIGNER=local` for native txs while Privy still signs EVM txs (policies still real) |
| Blocky402 API shape differs from assumptions | Med | High | `FACILITATOR_MODE=self` mirrors the wire format; still "x402 on Hedera" |
| SaucerSwap testnet liquidity thin / router changed | Med | Med | Use a pair we seed ourselves, or fall back to `transfer_token` as the paid action |
| Messari subgraph for chosen pool stale | Low | Med | Pick pool/deployment on day 0; keep two candidates |
| Hedera testnet reset (periodic) | Low | High | Re-run bootstrap script; keep addresses in env, not code |
| Testnet/Graph outage on stage | Med | High | `MOCK_CHAINS=true` + recorded videos |
| Privy key quorum setup too fiddly | Med | Low | app-mode approvals, labelled |
