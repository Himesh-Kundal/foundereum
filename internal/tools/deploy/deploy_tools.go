package deploy

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/shopspring/decimal"
)

func init() {
	tools.Register(tools.Spec{
		Name:        "deploy_contract",
		Description: "Deploy an EVM smart contract on Hedera EVM (chainId 296). Requires compiled bytecode and constructor arguments. Priced at $0.02 base + $0.001 per KB bytecode.",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["bytecode"],
			"properties": {
				"bytecode": { "type": "string", "description": "Compiled contract bytecode in hex format (0x...)" },
				"abi": { "type": "array", "description": "Optional ABI definition of the contract" },
				"args": { "type": "array", "description": "Constructor arguments matching ABI" },
				"name": { "type": "string", "description": "Optional human-readable contract name for tracking" }
			}
		}`),
		Pricing: x402.Rule{
			BaseUSD:       decimal.RequireFromString("0.02"),
			PerKBBytecode: decimal.RequireFromString("0.001"),
		},
		Tags:     []string{"contract", "deploy", "evm"},
		Executor: &deployContractExecutor{},
	})
}

type deployContractExecutor struct{}

func (e *deployContractExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		Bytecode string `json:"bytecode"`
		Name     string `json:"name"`
		Args     []any  `json:"args"`
	}
	if err := json.Unmarshal(in.Args, &args); err != nil {
		return tools.Output{}, fmt.Errorf("invalid arguments: %w", err)
	}

	if args.Bytecode == "" {
		return tools.Output{}, fmt.Errorf("bytecode is required")
	}

	// Generate deterministic mock deployed contract address
	h := sha256.Sum256([]byte(args.Bytecode + fmt.Sprint(args.Args)))
	deployedAddr := "0x" + hex.EncodeToString(h[12:]) // 20 bytes = 40 hex characters
	txHash := "0x" + hex.EncodeToString(h[:])

	res := map[string]any{
		"contract_address": deployedAddr,
		"tx_hash":          txHash,
		"chain_id":         296,
		"name":             args.Name,
		"status":           "deployed",
		"explorer_url":     fmt.Sprintf("https://hashscan.io/testnet/contract/%s", deployedAddr),
	}

	rawBytes, _ := json.Marshal(res)
	return tools.Output{
		Result: res,
		Bytes:  len(rawBytes),
		TxHash: txHash,
	}, nil
}
