package deploy

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/foundereum/foundereum/internal/tools"
)

func TestDeployContract(t *testing.T) {
	spec, ok := tools.Get("deploy_contract")
	if !ok {
		t.Fatal("deploy_contract not found in registry")
	}

	args, _ := json.Marshal(map[string]any{
		"bytecode": "0x608060405234801561001057600080fd5b50",
		"name":     "MockToken",
		"args":     []any{"Foundereum Mock", "FMOCK", 18},
	})

	out, err := spec.Executor.Execute(context.Background(), tools.Input{Args: args})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	res, ok := out.Result.(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any, got %T", out.Result)
	}

	if res["status"] != "deployed" {
		t.Errorf("expected status 'deployed', got %v", res["status"])
	}
	if res["chain_id"] != 296 {
		t.Errorf("expected chain_id 296, got %v", res["chain_id"])
	}
	if res["contract_address"] == "" {
		t.Errorf("expected non-empty contract_address")
	}
}
