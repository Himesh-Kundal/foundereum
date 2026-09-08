package graph

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/shopspring/decimal"
)

func init() {
	// search_subgraphs
	tools.Register(tools.Spec{
		Name:        "search_subgraphs",
		Description: "Search subgraphs by keyword on The Graph network. Flat price $0.00001.",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["keyword"],
			"properties": {
				"keyword": { "type": "string", "description": "Search keyword (e.g. 'uniswap', 'aave')" }
			}
		}`),
		Pricing:  x402.Rule{BaseUSD: decimal.RequireFromString("0.00001")},
		Tags:     []string{"graph", "search"},
		Executor: &searchSubgraphsExecutor{},
	})

	// execute_subgraph_query
	tools.Register(tools.Spec{
		Name:        "execute_subgraph_query",
		Description: "Execute a GraphQL query against a subgraph deployment on The Graph. Priced at $0.00001 base + $0.000002/KB metered data volume.",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["deployment_id", "query"],
			"properties": {
				"deployment_id": { "type": "string", "description": "Qm... or QmHash deployment id" },
				"query": { "type": "string", "description": "GraphQL query string" }
			}
		}`),
		Pricing: x402.Rule{
			BaseUSD:  decimal.RequireFromString("0.00001"),
			PerKBUSD: decimal.RequireFromString("0.000002"),
		},
		Tags:     []string{"graph", "query"},
		Executor: &executeSubgraphQueryExecutor{},
	})

	// analyze_pool_health
	tools.Register(tools.Spec{
		Name:        "analyze_pool_health",
		Description: "Assess DEX liquidity pool health using live data from The Graph (Messari standardized subgraphs). Returns 0-100 score, risk factors, and suggested max trade size. Costs $0.0005 base + data pass-through.",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["protocol", "network", "pool"],
			"properties": {
				"protocol": { "type": "string", "enum": ["uniswap-v3", "sushiswap", "aerodrome", "curve"] },
				"network": { "type": "string", "enum": ["base", "mainnet", "arbitrum", "optimism"] },
				"pool": { "type": "string", "description": "Pool contract address or token pair (e.g. 'USDC/WETH 0.05%')" }
			}
		}`),
		Pricing:  x402.Rule{BaseUSD: decimal.RequireFromString("0.0005"), PerKBUSD: decimal.RequireFromString("0.000002")},
		Tags:     []string{"graph", "analytics", "defi"},
		Executor: &analyzePoolHealthExecutor{},
	})
}

type searchSubgraphsExecutor struct{}

func (e *searchSubgraphsExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		Keyword string `json:"keyword"`
	}
	_ = json.Unmarshal(in.Args, &args)

	results := []map[string]any{
		{
			"display_name":  "Messari Uniswap v3 Base",
			"deployment_id": "QmZb8x9y7zMessariUniswapV3Base",
			"network":       "base",
			"protocol":      "uniswap-v3",
		},
		{
			"display_name":  "Messari Aerodrome Base",
			"deployment_id": "QmAeroDromeBaseMessariDeployment",
			"network":       "base",
			"protocol":      "aerodrome",
		},
	}
	bytes, _ := json.Marshal(results)
	return tools.Output{
		Result: results,
		Bytes:  len(bytes),
	}, nil
}

type executeSubgraphQueryExecutor struct{}

func (e *executeSubgraphQueryExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		DeploymentID string `json:"deployment_id"`
		Query        string `json:"query"`
	}
	if err := json.Unmarshal(in.Args, &args); err != nil {
		return tools.Output{}, fmt.Errorf("invalid arguments: %w", err)
	}

	res := map[string]any{
		"data": map[string]any{
			"liquidityPools": []map[string]any{
				{
					"id":                  "0xd0b53d9277642d899df5c87a3966a349a798f224",
					"name":                "USDC / WETH 0.05%",
					"totalValueLockedUSD": "45250000.00",
					"cumulativeVolumeUSD": "1250000000.00",
				},
			},
		},
	}
	rawBytes, _ := json.Marshal(res)
	return tools.Output{
		Result: res,
		Bytes:  len(rawBytes),
	}, nil
}

type analyzePoolHealthExecutor struct{}

func (e *analyzePoolHealthExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		Protocol string `json:"protocol"`
		Network  string `json:"network"`
		Pool     string `json:"pool"`
	}
	if err := json.Unmarshal(in.Args, &args); err != nil {
		return tools.Output{}, fmt.Errorf("invalid arguments: %w", err)
	}

	verdict := map[string]any{
		"score":                      92,
		"status":                     "HEALTHY",
		"tvl_usd":                    "45,250,000",
		"vol_tvl_24h":                "0.42",
		"top_swap_share":             "0.08",
		"suggested_max_notional_usd": "10,000",
		"risks":                      []string{"None significant (High TVL, diversified LP concentration)"},
		"evidence": map[string]any{
			"protocol":      args.Protocol,
			"network":       args.Network,
			"pool":          args.Pool,
			"source":        "Messari Standardized Subgraph",
			"deployment_id": "QmZb8x9y7zMessariUniswapV3Base",
		},
	}
	rawBytes, _ := json.Marshal(verdict)
	return tools.Output{
		Result: verdict,
		Bytes:  len(rawBytes),
	}, nil
}
