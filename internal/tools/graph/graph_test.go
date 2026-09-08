package graph

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/google/uuid"
)

func TestAnalyzePoolHealth(t *testing.T) {
	spec, ok := tools.Get("analyze_pool_health")
	if !ok {
		t.Fatalf("analyze_pool_health not found in registry")
	}

	in := tools.Input{
		ProjectID: uuid.New(),
		Args:      json.RawMessage(`{"protocol":"uniswap-v3","network":"base","pool":"USDC/WETH 0.05%"}`),
	}
	out, err := spec.Executor.Execute(context.Background(), in)
	if err != nil {
		t.Fatalf("execute analyze_pool_health failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok || resMap["score"] == nil {
		t.Fatalf("expected score in verdict, got: %v", out.Result)
	}
}
