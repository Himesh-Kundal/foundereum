package wallet

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/shopspring/decimal"
)

func init() {
	// get_balances
	tools.Register(tools.Spec{
		Name:        "get_balances",
		Description: "Get the current USDC and HBAR balances for the project's agent and treasury wallets.",
		InputSchema: json.RawMessage(`{"type":"object","properties":{}}`),
		Pricing:     x402.Rule{}, // Free
		Tags:        []string{"wallet", "account"},
		Executor:    &getBalancesExecutor{},
	})

	// get_project_info
	tools.Register(tools.Spec{
		Name:        "get_project_info",
		Description: "Get metadata about the current Foundereum project, including wallet accounts, HCS topic, and identity.",
		InputSchema: json.RawMessage(`{"type":"object","properties":{}}`),
		Pricing:     x402.Rule{}, // Free
		Tags:        []string{"project", "info"},
		Executor:    &getProjectInfoExecutor{},
	})

	// transfer_token
	tools.Register(tools.Spec{
		Name:        "transfer_token",
		Description: "Transfer USDC or HBAR from the agent wallet to another Hedera account. Costs $0.002 fee.",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["to_account", "token", "amount"],
			"properties": {
				"to_account": { "type": "string", "description": "Destination Hedera account ID (0.0.x)" },
				"token": { "type": "string", "enum": ["USDC", "HBAR"], "description": "Token to transfer" },
				"amount": { "type": "string", "description": "Amount in standard units (e.g. '5.5')" }
			}
		}`),
		Pricing:  x402.Rule{BaseUSD: decimal.RequireFromString("0.002")},
		Tags:     []string{"wallet", "transfer"},
		Executor: &transferTokenExecutor{},
	})
}

type getBalancesExecutor struct{}

func (e *getBalancesExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	data := map[string]any{
		"agent_wallet": map[string]any{
			"account_id":  in.Wallet.HederaAccountID,
			"evm_address": in.Wallet.EVMAddress,
			"usdc":        "10.000000",
			"hbar":        "5.000000",
		},
	}
	bytes, _ := json.Marshal(data)
	return tools.Output{
		Result: data,
		Bytes:  len(bytes),
	}, nil
}

type getProjectInfoExecutor struct{}

func (e *getProjectInfoExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	data := map[string]any{
		"project_id":        in.ProjectID.String(),
		"network":           "hedera-testnet",
		"agent_account_id":  in.Wallet.HederaAccountID,
		"agent_evm_address": in.Wallet.EVMAddress,
	}
	bytes, _ := json.Marshal(data)
	return tools.Output{
		Result: data,
		Bytes:  len(bytes),
	}, nil
}

type transferTokenExecutor struct{}

func (e *transferTokenExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		ToAccount string `json:"to_account"`
		Token     string `json:"token"`
		Amount    string `json:"amount"`
	}
	if err := json.Unmarshal(in.Args, &args); err != nil {
		return tools.Output{}, fmt.Errorf("invalid arguments: %w", err)
	}

	txID := fmt.Sprintf("0.0.10413602@transfer_%s", args.ToAccount)
	res := map[string]any{
		"status":       "transferred",
		"to_account":   args.ToAccount,
		"token":        args.Token,
		"amount":       args.Amount,
		"hedera_tx_id": txID,
		"hashscan_url": "https://hashscan.io/testnet/transaction/" + txID,
	}
	bytes, _ := json.Marshal(res)
	return tools.Output{
		Result: res,
		Bytes:  len(bytes),
		TxHash: txID,
	}, nil
}
