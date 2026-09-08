# GEMINI.md — Foundereum

x402-gated agentic API platform on Hedera. AI agents (Claude Desktop / any MCP client) get a Privy-secured wallet, a spending policy, and an API key; every tool call is paid per-request via x402 settled through Blocky402, with live data from The Graph.

**Read `docs/README.md` first.** It indexes the full design; consult the relevant doc before touching a subsystem:

| Working on… | Read |
|---|---|
| Product scope, prize requirements | `docs/01-product-design.md` |
| Overall architecture, stack, repo layout | `docs/02-system-architecture.md` |
| Any end-to-end flow | `docs/03-workflows.md` |
| Go backend, middleware, tool registry | `docs/04-backend-design.md` |
| Database, ledger invariants | `docs/05-data-model.md` |
| REST / gateway / MCP tool schemas | `docs/06-api-and-mcp-spec.md` |
| Solidity | `docs/07-smart-contracts.md` |
| Anything touching money or keys | `docs/08-security.md` |
| Docker, env, deploy | `docs/09-infra-devops.md` |
| Priorities, cut lines | `docs/10-hackathon-plan.md` |

## Stack

- **Backend:** Go 1.23, one module, four binaries: `cmd/api`, `cmd/gateway`, `cmd/mcp`, `cmd/worker`. chi, pgx + sqlc, goose, go-redis, asynq, hedera-sdk-go v2, go-ethereum, modelcontextprotocol/go-sdk.
- **Data:** PostgreSQL 16 (durable), Redis 7 (nonces, rate limits, idempotency, jobs).
- **Frontend:** React 18 + TypeScript, Vite, TanStack Query, Tailwind, `@privy-io/react-auth`.
- **Chain:** Hedera testnet only. HTS USDC for payments, HCS for audit, Hedera EVM (chainId 296) for swaps + the ERC-8004 registry.
- **Partners:** Hedera (x402 via Blocky402), Privy (server wallets, policies, key quorums), The Graph (Subgraph MCP, Messari standardized subgraphs).

## Commands

```
make dev              # docker compose up --build
make migrate          # goose up
make sqlc             # regenerate DB code after editing internal/db/queries
make contracts        # forge build && forge test
make e2e              # MOCK_CHAINS=true integration tests
```

## Rules

1. **Never write to `wallets.balance` or `ledger_entries` outside `internal/ledger`.** All money mutations go through it, inside a Postgres transaction.
2. **Never build a payment or signing request from LLM-supplied fields.** The gateway sets `payTo`, amount, and destination; Claude only chooses the tool and its args.
3. **Every new tool** is one entry in `internal/tools` registry: name, JSON schema, pricing rule, executor. Do not add ad-hoc routes.
4. **Adding a signable EVM call?** Add its contract to the policy allowlist and its selector to the selector allowlist (`docs/08-security.md §3`), or Privy will reject it.
5. **Subgraph results returned to the agent are prefixed `data (untrusted):`.** Keep it.
6. **No mainnet.** No real funds. Testnet addresses live in env / `contracts/deployments/hedera-testnet.json`, never in code.
7. Amounts are `NUMERIC` base units + decimals in the DB and `shopspring/decimal` in Go. No floats for money.
8. Prefer editing the existing doc when behaviour changes over leaving docs stale.

## Env

Copy `.env.example` → `.env`. Required keys are listed in `docs/04-backend-design.md §5`. `MOCK_CHAINS=true` runs everything without Hedera/Privy/Graph credentials.

## License

BUSL-1.1 (see `LICENSE`, rationale in `LICENSE_RATIONALE.md`). Do not add code under incompatible licenses.
