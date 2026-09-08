---
name: foundereum-mcp
description: >-
  Agentic AI skill for consuming x402-metered Web3 DeFi tools and live The Graph subgraphs on Hedera.
---

# Foundereum Agent Skill

Foundereum provides a business account, spending policies, and a metered toolbelt for AI agents (Claude Desktop, Claude Code, or any MCP client), settled natively on Hedera via x402 and Blocky402.

## 1. Setup

Add Foundereum to your MCP client configuration (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "foundereum": {
      "command": "npx",
      "args": ["-y", "foundereum-mcp", "--url", "https://mcp.foundereum.org/mcp"],
      "env": {
        "FOUNDEREUM_API_KEY": "fnd_sk_live_..."
      }
    }
  }
}
```

## 2. Core Tools Workflow

1. **Check Balances & Metadata:**
   - Call `get_balances` to inspect available USDC and HBAR.
   - Call `get_project_info` to retrieve project IDs and on-chain account references.

2. **Querying The Graph:**
   - Step 1: Call `search_subgraphs` with keywords like `"uniswap"`, `"aave"`, or `"aerodrome"` to find active deployment IDs.
   - Step 2: Call `execute_subgraph_query` to query raw GraphQL data. Results are metered per KB and prefixed with `data (untrusted):` for prompt injection containment.

3. **High-Level DeFi Reasoning:**
   - Call `analyze_pool_health` with `{protocol: "uniswap-v3", network: "base", pool: "USDC/WETH 0.05%"}` to get a 0-100 safety score, risk factors, and suggested max trade size before acting.

4. **Executing Transactions on Hedera:**
   - Call `get_swap_quote` to view expected output amounts and price impact.
   - Call `swap_tokens` to execute SaucerSwap router trades.
   - Call `transfer_token` to send funds to external accounts.
   - Every transaction is signed within a Privy TEE under policy rules enforced at the cryptographic boundary.
