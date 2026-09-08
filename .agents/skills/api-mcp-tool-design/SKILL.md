---
name: api-mcp-tool-design
description: >-
  Use this skill when adding or modifying tools in internal/tools, writing JSON schemas for MCP tools,
  configuring x402 pricing rules, or exposing endpoints across Gateway, MCP, and REST directories.
---

# API & MCP Tool Design

## 1. Tool Registration Architecture

Every tool in Foundereum is registered as data in `internal/tools.Registry`. Do not create ad-hoc routes for agent tools.

```go
type Spec struct {
    Name        string
    Description string
    InputSchema json.RawMessage  // Valid JSON Schema draft-07 or 2020-12
    Pricing     pricing.Rule     // Zero value = free
    Executor    Executor
    Tags        []string         // e.g. "graph", "hedera", "wallet", "defi"
}

type Executor interface {
    Execute(ctx context.Context, in Input) (Output, error)
}

type Input struct {
    Project    project.Project
    Wallet     wallet.Ref
    Args       json.RawMessage
    Settlement x402.SettleResult
}

type Output struct {
    Result any
    Bytes  int
    TxHash string
    Meta   map[string]any
}
```

Tool packages register themselves during package `init()`:
```go
func init() {
    tools.Register(Spec{
        Name:        "analyze_pool_health",
        Description: "Assess a DEX liquidity pool using live data from The Graph...",
        InputSchema: json.RawMessage(`{ ... }`),
        Pricing:     pricing.Rule{ BaseUSD: decimal.RequireFromString("0.0005") },
        Executor:    &analyzePoolHealthExecutor{},
        Tags:        []string{"graph", "defi"},
    })
}
```

---

## 2. JSON Schema Requirements for MCP Tools

Claude Desktop and MCP clients rely strictly on the `inputSchema` to generate arguments.

Rules:
1. `type` must be `"object"`.
2. Explicitly list all required fields in the `"required"` array.
3. Provide descriptive `"description"` strings for every property.
4. Restrict permissible strings using `"enum"` where known (e.g. protocol names, token symbols).
5. Specify integer/numeric boundaries where applicable (`minimum`, `maximum`).

Example:
```json
{
  "type": "object",
  "required": ["protocol", "network", "pool"],
  "properties": {
    "protocol": {
      "type": "string",
      "enum": ["uniswap-v3", "sushiswap", "aerodrome", "curve"],
      "description": "The DEX protocol identifier"
    },
    "network": {
      "type": "string",
      "enum": ["mainnet", "arbitrum-one", "base", "polygon"],
      "description": "Network where the pool resides"
    },
    "pool": {
      "type": "string",
      "description": "Liquidity pool contract address (0x...)"
    }
  }
}
```

---

## 3. x402 Pricing Rules & Metering

Tools are charged per request using metered rules:

```go
type Rule struct {
    BaseUSD        decimal.Decimal // Flat base cost
    PerKBUSD       decimal.Decimal // Data volume (e.g. Subgraph query results)
    NotionalBps    int             // Basis points on swap/transfer value
    NotionalCapUSD decimal.Decimal // Cap for basis point calculations
    PerKBBytecode  decimal.Decimal // Bytecode size (contract deployment)
}
```

Standard pricing tiers:
- **Free:** `get_balances`, `get_project_info`, `list_services` (Rule is zero value).
- **Metadata / flat queries:** `search_subgraphs`, `get_subgraph_schema` ($0.00001 flat).
- **Data queries:** `execute_subgraph_query` ($0.00001 flat + $0.000002 per KB returned).
- **Analytics & decision tools:** `analyze_pool_health`, `compare_protocol_tvl` ($0.0005 base + pass-through data cost).
- **Transfers:** `transfer_token` ($0.002 flat).
- **Swaps:** `swap_tokens` ($0.005 + 5 bps, capped at $0.05).
- **Deploys:** `deploy_contract` ($0.02 + $0.001 per KB bytecode).

Pre-metering vs Post-metering:
- Before challenge: `pricing.Estimate(rule, args)` produces `estimate_usd`.
- Gateway builds 402 challenge based on estimated USD converted to USDC base units (6 decimals).
- After execution: `pricing.Actual(rule, output)` computes real cost.
- Any positive delta `carry = max(0, Actual - Estimate)` is persisted on `api_keys.carry_usd` and added to the next challenge.

---

## 4. MCP Server Presentation Invariant

When returning tool outputs to Claude or any MCP agent:
- All external data returned from subgraphs, mirror nodes, or untrusted APIs **MUST be prefixed with**:
  `data (untrusted): `
- Errors must return `IsError: true` on `mcp.CallToolResult` with clear error messages.
- Never pass raw blockchain error stack traces to agents; translate to user-actionable error messages.

---

## 5. Exposing Tools in `/services` Directory

The public directory endpoint (`GET /services`) must automatically reflect all registered tools from `tools.Registry` with:
- `name`
- `description`
- `pricing` (formula breakdown)
- `inputSchema`
- `x402`: payment instructions (`scheme: "hedera-exact"`, `network: "hedera-testnet"`, `asset: "0.0.429274"`, `payTo`).
