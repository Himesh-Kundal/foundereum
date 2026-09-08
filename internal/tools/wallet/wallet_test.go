package wallet

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/wallet"
	"github.com/google/uuid"
)

func TestGetBalances(t *testing.T) {
	spec, ok := tools.Get("get_balances")
	if !ok {
		t.Fatal("get_balances not registered")
	}

	out, err := spec.Executor.Execute(context.Background(), tools.Input{
		ProjectID: uuid.New(),
		Wallet: wallet.Ref{
			EVMAddress:      "0x1111111111111111111111111111111111111111",
			HederaAccountID: "0.0.12345",
		},
		Args: json.RawMessage(`{}`),
	})
	if err != nil {
		t.Fatalf("get_balances execution failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok {
		t.Fatalf("expected map result")
	}
	if _, exists := resMap["agent_wallet"]; !exists {
		t.Errorf("expected agent_wallet in result: %+v", resMap)
	}
}

func TestTransferToken(t *testing.T) {
	spec, ok := tools.Get("transfer_token")
	if !ok {
		t.Fatal("transfer_token not registered")
	}

	args, _ := json.Marshal(map[string]any{
		"to_account": "0.0.98765",
		"token":      "USDC",
		"amount":     "1.5",
	})

	out, err := spec.Executor.Execute(context.Background(), tools.Input{
		ProjectID: uuid.New(),
		Wallet: wallet.Ref{
			EVMAddress:      "0x1111111111111111111111111111111111111111",
			HederaAccountID: "0.0.12345",
		},
		Args: args,
	})
	if err != nil {
		t.Fatalf("transfer_token execution failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok {
		t.Fatalf("expected map result")
	}
	if resMap["status"] != "transferred" || out.TxHash == "" {
		t.Errorf("expected transferred status: %+v, tx: %s", resMap, out.TxHash)
	}
}
