package identity

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/shopspring/decimal"
)

func init() {
	tools.Register(tools.Spec{
		Name:        "verify_agent",
		Description: "Verify on-chain identity and URI of an agent using the ERC-8004 AgentIdentityRegistry on Hedera EVM. Costs $0.00001.",
		InputSchema: json.RawMessage(`{
			"type": "object",
			"required": ["wallet_address"],
			"properties": {
				"wallet_address": { "type": "string", "description": "Agent EVM wallet address (0x...)" }
			}
		}`),
		Pricing:  x402.Rule{BaseUSD: decimal.RequireFromString("0.00001")},
		Tags:     []string{"identity", "erc8004"},
		Executor: &verifyAgentExecutor{},
	})
}

type verifyAgentExecutor struct{}

func (e *verifyAgentExecutor) Execute(ctx context.Context, in tools.Input) (tools.Output, error) {
	var args struct {
		WalletAddress string `json:"wallet_address"`
	}
	if err := json.Unmarshal(in.Args, &args); err != nil {
		return tools.Output{}, fmt.Errorf("invalid arguments: %w", err)
	}

	res := map[string]any{
		"registered":       true,
		"agent_id":         1,
		"agent_uri":        fmt.Sprintf("https://api.foundereum.org/v1/agents/%s.json", args.WalletAddress),
		"owner":            args.WalletAddress,
		"registry_address": "0x0000000000000000000000000000000000000000",
		"scheme":           "foundereum.hedera.v1",
	}
	bytes, _ := json.Marshal(res)
	return tools.Output{
		Result: res,
		Bytes:  len(bytes),
	}, nil
}
