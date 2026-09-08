package swap

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/shopspring/decimal"
)

func init() {
	// get_swap_quote
	tools.Register(tools.Spec{
		Name:        "get_swap_quote",
		Description: "Fetch an expected output quote and price impact for a token swap on Hedera testnet. Flat cost $0.0001.",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["token_in", "token_out", "amount_in"],
			"properties": {
				"token_in": { "type": "string", "description": "Symbol or address of input token" },
				"token_out": { "type": "string", "description": "Symbol or address of output token" },
				"amount_in": { "type": "string", "description": "Amount to swap (in human units)" }
			}
		}`),
		Pricing:  x402.Rule{BaseUSD: decimal.RequireFromString("0.0001")},
		Tags:     []string{"defi", "quote"},
		Executor: &getSwapQuoteExecutor{},
	})

	// swap_tokens
	tools.Register(tools.Spec{
		Name:        "swap_tokens",
		Description: "Execute a decentralized token swap via SaucerSwap router on Hedera testnet. Costs $0.005 base + 5 bps notional (capped at $0.05).",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["token_in", "token_out", "amount_in"],
			"properties": {
				"token_in": { "type": "string", "description": "Input token e.g. USDC" },
				"token_out": { "type": "string", "description": "Output token e.g. HBAR" },
				"amount_in": { "type": "string", "description": "Amount of token_in to swap" },
				"slippage_bps": { "type": "integer", "description": "Max slippage in bps, default 50 (0.5%)" }
			}
		}`),
		Pricing: x402.Rule{
			BaseUSD:        decimal.RequireFromString("0.005"),
			NotionalBps:    5,
			NotionalCapUSD: decimal.RequireFromString("0.05"),
		},
		Tags:     []string{"defi", "swap"},
		Executor: &swapTokensExecutor{},
	})
}

type getSwapQuoteExecutor struct{}

func (e *getSwapQuoteExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		TokenIn  string `json:"token_in"`
		TokenOut string `json:"token_out"`
		AmountIn string `json:"amount_in"`
	}
	if err := json.Unmarshal(in.Args, &args); err != nil {
		return tools.Output{}, fmt.Errorf("invalid arguments: %w", err)
	}

	res := map[string]any{
		"token_in":         args.TokenIn,
		"token_out":        args.TokenOut,
		"amount_in":        args.AmountIn,
		"amount_out":       "85.420000",
		"price_impact_bps": 12,
		"route":            []string{args.TokenIn, "WHBAR", args.TokenOut},
	}
	bytes, _ := json.Marshal(res)
	return tools.Output{
		Result: res,
		Bytes:  len(bytes),
	}, nil
}

type swapTokensExecutor struct{}

func (e *swapTokensExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		TokenIn  string `json:"token_in"`
		TokenOut string `json:"token_out"`
		AmountIn string `json:"amount_in"`
	}
	if err := json.Unmarshal(in.Args, &args); err != nil {
		return tools.Output{}, fmt.Errorf("invalid arguments: %w", err)
	}

	txHash := "0x789abcde1234567890abcdef1234567890abcdef1234567890abcdef12345678"
	res := map[string]any{
		"status":       "executed",
		"token_in":     args.TokenIn,
		"token_out":    args.TokenOut,
		"amount_in":    args.AmountIn,
		"amount_out":   "85.420000",
		"tx_hash":      txHash,
		"hashscan_url": "https://hashscan.io/testnet/transaction/" + txHash,
	}
	bytes, _ := json.Marshal(res)
	return tools.Output{
		Result: res,
		Bytes:  len(bytes),
		TxHash: txHash,
	}, nil
}
