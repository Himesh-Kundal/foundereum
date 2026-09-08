# Foundereum — x402-Gated Agentic API Platform on Hedera

> Design docs for ETHOnline 2026. Targeting exactly three partner prizes: **Hedera**, **The Graph**, **Privy**.

**One-liner:** Give any AI agent (Claude Desktop, Claude Code, any MCP client) a Privy-secured wallet on Hedera and a pay-per-call API key. Every tool the agent uses — swaps, transfers, contract deploys, live blockchain data from The Graph — is metered and paid for with a sub-cent x402 payment settled through Blocky402, inside policy limits the business sets.

## Document index

| # | Doc | Covers |
|---|-----|--------|
| 01 | [Product Design](./01-product-design.md) | Problem, personas, journey, feature tiers, screens, exact prize-requirement checklist |
| 02 | [System Architecture](./02-system-architecture.md) | Diagrams, stack, Postgres-vs-Mongo decision, repo layout |
| 03 | [Workflows](./03-workflows.md) | Sequence diagrams: onboarding, wallets, funding, x402 cycle, swap, Graph-driven decisions, HCS audit, quorum approvals, Substreams |
| 04 | [Backend Design (Go)](./04-backend-design.md) | Four binaries, middleware chain, x402 middleware, tool registry, policy engine, MCP server, workers |
| 05 | [Data Model](./05-data-model.md) | Postgres DDL, Redis keys, ledger invariants |
| 06 | [API & MCP Spec](./06-api-and-mcp-spec.md) | Control-plane REST, gateway 402 format, MCP tool catalog |
| 07 | [Smart Contracts](./07-smart-contracts.md) | Minimal: AgentIdentityRegistry (ERC-8004) on Hedera EVM; everything else is HTS/HCS native |
| 08 | [Security & Custody](./08-security.md) | Threat model, Privy policies, key quorums, prompt-injection containment |
| 09 | [Infra & DevOps](./09-infra-devops.md) | Docker Compose, Dockerfiles, env, CI, deploy |
| 10 | [Hackathon Plan](./10-hackathon-plan.md) | 48h timeline, lanes, cut lines, demo script, submission checklist per sponsor |

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript, Vite, TanStack Query, Tailwind, `@privy-io/react-auth` (login) |
| Backend | Go 1.23 — one module, four binaries: `api` (control plane), `gateway` (x402 data plane), `mcp` (MCP server), `worker` (settlement confirm, HCS audit, balance sync) |
| Database | **PostgreSQL 16** (pgx + sqlc + goose) + **Redis 7** (nonces, rate limits, idempotency, asynq jobs) |
| Chain | **Hedera testnet only** — HTS USDC for payments, HBAR for gas, HCS topic for audit, Hedera EVM (chainId 296) for swaps + ERC-8004 registry |
| Payments | x402 via **Blocky402 facilitator**, native `TransferTransaction` partially signed by the agent wallet |
| Wallets | **Privy server wallets** (TEE) + Privy Policy Engine + key quorums; Privy auth on the dashboard |
| Data | **The Graph** — Subgraph MCP (search / schema / execute) proxied behind x402; Messari standardized subgraphs for cross-protocol tools; Substreams SKILLs for single-prompt pipeline deploy |
| DEX | SaucerSwap testnet router (Uniswap-v2-style) via Hedera EVM — infra only, no prize application |
| Infra | Docker Compose (dev), single VM + Caddy (demo) |

## Key decisions

1. **Three prizes, one chain.** Dropping ENS/Arc/Uniswap-hooks/Ledger/Chainlink/1inch/World/Bazantic let us collapse to Hedera-only for wallets, payments, and execution. The Graph reads mainnet data (Ethereum/Base/Arbitrum subgraphs) — the agent *pays on Hedera, reads from anywhere*.
2. **Postgres, not Mongo.** The core is a payments ledger + relational entities; we need row locks and unique nonce indexes. JSONB covers policies and tool args. Substreams sinks natively into Postgres (matters for the Graph challenge).
3. **x402 client logic lives in our MCP server.** Claude never sees a raw 402; it calls `swap_tokens` and the MCP server handles challenge → Privy-signed payment → retry.
4. **Two policy-checked signatures per action:** one to pay (HTS transfer to platform), one to execute (swap/transfer/deploy). Both go through Privy's TEE with `default_action: DENY`.
5. **Metering, not flat fees.** Subgraph queries priced by result bytes; swaps priced by notional; deploys by bytecode size. Hedera explicitly scores this over flat per-request charges.
6. **HCS is the audit trail.** Every settled payment is mirrored to an HCS topic → publicly verifiable per-project billing ledger on HashScan. Cheap to build, explicitly an extra-points item.
