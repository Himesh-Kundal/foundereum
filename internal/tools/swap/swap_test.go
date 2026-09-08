package swap

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/foundereum/foundereum/internal/wallet"
	"github.com/google/uuid"
)

func TestGetSwapQuote(t *testing.T) {
	spec, ok := tools.Get("get_swap_quote")
	if !ok {
		t.Fatal("get_swap_quote not registered")
	}

	args, _ := json.Marshal(map[string]any{
		"token_in":  "USDC",
		"token_out": "HBAR",
		"amount_in": "10.0",
	})

	out, err := spec.Executor.Execute(context.Background(), tools.Input{
		ProjectID: uuid.New(),
		Wallet: wallet.Ref{
			EVMAddress:      "0x1234567890123456789012345678901234567890",
			HederaAccountID: "0.0.12345",
		},
		Args: args,
	})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any result")
	}
	if resMap["token_in"] != "USDC" || resMap["token_out"] != "HBAR" {
		t.Errorf("quote result mismatch: %+v", resMap)
	}
}

func TestSwapTokens(t *testing.T) {
	spec, ok := tools.Get("swap_tokens")
	if !ok {
		t.Fatal("swap_tokens not registered")
	}

	args, _ := json.Marshal(map[string]any{
		"token_in":     "USDC",
		"token_out":    "HBAR",
		"amount_in":    "5.0",
		"slippage_bps": 50,
	})

	out, err := spec.Executor.Execute(context.Background(), tools.Input{
		ProjectID: uuid.New(),
		Wallet: wallet.Ref{
			EVMAddress:      "0x1234567890123456789012345678901234567890",
			HederaAccountID: "0.0.12345",
		},
		Args: args,
	})
	if err != nil {
		t.Fatalf("swap execution failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok {
		t.Fatalf("expected map result")
	}
	if resMap["status"] != "executed" {
		t.Errorf("expected executed status: %+v", resMap)
	}
	if out.TxHash == "" {
		t.Errorf("expected non-empty tx_hash")
	}
}

func TestSwapTokens_SlippageExceeded(t *testing.T) {
	spec, _ := tools.Get("swap_tokens")

	// Slippage 600 bps = 6% > 5% allowed
	args, _ := json.Marshal(map[string]any{
		"token_in":     "USDC",
		"token_out":    "HBAR",
		"amount_in":    "5.0",
		"slippage_bps": 600,
	})

	_, err := spec.Executor.Execute(context.Background(), tools.Input{Args: args})
	if err == nil {
		t.Fatal("expected error when slippage exceeds 5% threshold")
	}
}

func TestSwapTokens_InvalidAmount(t *testing.T) {
	spec, _ := tools.Get("swap_tokens")

	// Negative amount
	args, _ := json.Marshal(map[string]any{
		"token_in":  "USDC",
		"token_out": "HBAR",
		"amount_in": "-5.0",
	})
	_, err := spec.Executor.Execute(context.Background(), tools.Input{Args: args})
	if err == nil {
		t.Fatal("expected error for negative amount")
	}

	// Scientific notation
	argsScientific, _ := json.Marshal(map[string]any{
		"token_in":  "USDC",
		"token_out": "HBAR",
		"amount_in": "1e18",
	})
	_, err = spec.Executor.Execute(context.Background(), tools.Input{Args: argsScientific})
	if err == nil {
		t.Fatal("expected error for scientific notation")
	}
}

