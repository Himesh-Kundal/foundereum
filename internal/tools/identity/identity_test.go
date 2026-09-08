package identity

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/foundereum/foundereum/internal/tools"
	"github.com/google/uuid"
)

func TestVerifyAgent(t *testing.T) {
	spec, ok := tools.Get("verify_agent")
	if !ok {
		t.Fatal("verify_agent not registered")
	}

	args, _ := json.Marshal(map[string]any{
		"wallet_address": "0x1111111111111111111111111111111111111111",
	})

	out, err := spec.Executor.Execute(context.Background(), tools.Input{
		ProjectID: uuid.New(),
		Args:      args,
	})
	if err != nil {
		t.Fatalf("verify_agent execution failed: %v", err)
	}

	resMap, ok := out.Result.(map[string]any)
	if !ok {
		t.Fatalf("expected map result")
	}
	if resMap["registered"] != true || resMap["agent_id"] != 1 {
		t.Errorf("agent identity mismatch: %+v", resMap)
	}
}
