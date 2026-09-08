# Foundereum — x402-Gated Agentic API Platform on Hedera

> Built for ETHOnline 2026. Targeting partner prizes: **Hedera**, **The Graph**, and **Privy**.

Foundereum gives AI agents (Claude Desktop, Claude Code, or any MCP client) a Privy-secured wallet, a cryptographic spending policy, and an API key. Every tool call—swaps, token transfers, contract deployments, and live blockchain queries from The Graph—is metered per-request and settled via x402 on Hedera testnet through Blocky402.

---

## 1. System Architecture

```
[Claude Desktop / AI Agent]
         │ (JSON-RPC)
         ▼
[foundereum-mcp (Bridge)]
         │ (Streamable HTTP /mcp)
         ▼
[cmd/mcp Server] ──(HTTP)──► [cmd/gateway] ──(x402)──► [Blocky402 / Facilitator]
                                  │                             │
                                  ├──► [The Graph Subgraphs]    └──► [Hedera Testnet]
                                  ├──► [Privy TEE Signer]              (HTS USDC, HCS)
                                  └──► [SaucerSwap Router]
```

### Components
1. **`cmd/api` (:8080)**: Control plane REST API for Privy auth sessions, orgs, projects, wallets, Privy policies, API keys, and approvals.
2. **`cmd/gateway` (:8081)**: High-throughput machine gateway implementing x402 HTTP challenge & settlement, Redis token-bucket rate limiting, idempotency, and metered tool execution.
3. **`cmd/mcp` (:8082)**: Model Context Protocol server exposing tool schemas over Streamable HTTP and managing the x402 client loop.
4. **`cmd/worker`**: Asynq background worker handling Hedera account bootstrapping, HCS audit logging, and mirror node balance reconciliation.
5. **`contracts/`**: Foundry project hosting `AgentIdentityRegistry.sol` (ERC-8004) deployed on Hedera EVM (Chain ID 296).
6. **`web/`**: React 18 + TypeScript + Vite + Tailwind dashboard.
7. **`bridge/`**: `foundereum-mcp` CLI stdio-to-HTTP proxy for Claude Desktop.

---

## 2. Why Privy / Why Hedera / Why The Graph

### Why Privy?
- **Server Wallets in TEE**: Provides hardware-isolated key custody for autonomous agents without exposing root credentials to runtime code.
- **Policy Engine**: Enforces strict `default_action: DENY` rules on contract addresses, function selectors, and 24-hour spending caps that LLMs cannot override.
- **Key Quorums**: Requires m-of-n approval signatures using WebCrypto P-256 member keys for high-value treasury withdrawals.

### Why Hedera?
- **Sub-Cent Native Micro-Payments**: Native HTS USDC token transfers allow economic viability for calls costing fractions of a cent ($0.00001).
- **Blocky402 Facilitator Settlement**: Partially signed `TransferTransaction` payloads are settled atomically.
- **Verifiable HCS Audit Trail**: Every settled payment publishes an immutable audit receipt to a Hedera Consensus Service (HCS) topic.
- **Hedera EVM & ERC-8004**: On-chain agent identity registration and SaucerSwap DEX liquidity routing.

### Why The Graph?
- **Live On-Chain Data for Agents**: Powers DeFi intelligence without custom indexer infrastructure.
- **Messari Standardized Subgraphs**: `analyze_pool_health` and `compare_protocol_tvl` provide cross-protocol analytical verdicts across Uniswap v3, Sushiswap, Aerodrome, and Curve.
- **Untrusted Input Hygiene**: Subgraph outputs returned to LLMs are prefixed with `data (untrusted):` to prevent prompt injection.

---

## 3. Quickstart

### Prerequisites
- Go 1.23+
- Node.js 20+ & pnpm
- Foundry (`forge`)
- Docker & Docker Compose

### Local Development
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Run unit and integration tests
make test
make contracts

# 3. Build all binaries
make build

# 4. Start frontend
cd web && pnpm install && pnpm dev
```

### Docker Compose
```bash
make dev
# Launches postgres, redis, api, gateway, mcp, worker, and subgraph-mcp sidecar
```

---

## 4. Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "foundereum": {
      "command": "npx",
      "args": ["-y", "foundereum-mcp", "--url", "http://localhost:8082/mcp"],
      "env": {
        "FOUNDEREUM_API_KEY": "fnd_sk_live_sample"
      }
    }
  }
}
```

---

## 5. Tool Catalog & Metered Pricing

| Tool | Pricing Model | Description |
|------|--------------|-------------|
| `get_balances` | Free | Current USDC & HBAR balances for treasury and agent wallets |
| `get_project_info` | Free | Project IDs, Hedera accounts, and HCS topic references |
| `transfer_token` | $0.002 flat | Transfer USDC/HBAR from agent wallet |
| `search_subgraphs` | $0.00001 flat | Search The Graph subgraphs by keyword |
| `execute_subgraph_query` | $0.00001 base + $0.000002/KB | Execute GraphQL query against any indexed subgraph |
| `analyze_pool_health` | $0.0005 base + pass-through | Pool health analysis (0-100 score) using Messari subgraphs |
| `get_swap_quote` | $0.0001 flat | Price impact and expected output quote |
| `swap_tokens` | $0.005 + 5 bps (cap $0.05) | Decentralized token swap via SaucerSwap router |
| `verify_agent` | $0.00001 flat | Verify agent identity on ERC-8004 registry |

---

## 6. License
BUSL-1.1 (Business Source License 1.1) — see `LICENCE.md` and `LICENCE_RATIONALE.md`.
