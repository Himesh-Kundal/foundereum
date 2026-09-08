package hedera

import (
	"testing"
)

func TestBuildTransfer(t *testing.T) {
	agent := "0.0.12345"
	platform := "0.0.98765"
	token := "0.0.429274"
	amount := int64(50000)
	memo := "fnd:test_challenge_nonce"

	txBytes, hash, err := BuildTransfer(nil, agent, platform, token, amount, memo)
	if err != nil {
		t.Fatalf("BuildTransfer failed: %v", err)
	}

	if len(txBytes) == 0 {
		t.Errorf("expected non-empty transaction bytes")
	}
	if len(hash) != 32 {
		t.Errorf("expected 32-byte sha256 hash, got %d bytes", len(hash))
	}
}
