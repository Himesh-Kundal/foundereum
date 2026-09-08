package bindings

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestIdentityRegistryBindings(t *testing.T) {
	contractAddr := common.HexToAddress("0x1111111111111111111111111111111111111111")
	reg, err := NewAgentIdentityRegistry(contractAddr, nil)
	if err != nil {
		t.Fatalf("failed to create contract binding: %v", err)
	}

	scheme, err := reg.AgentIdScheme(nil)
	if err != nil {
		t.Fatalf("AgentIdScheme failed: %v", err)
	}
	if scheme != "foundereum.hedera.v1" {
		t.Errorf("expected foundereum.hedera.v1, got %s", scheme)
	}

	wallet := common.HexToAddress("0x2222222222222222222222222222222222222222")
	id, uri, owner, err := reg.Resolve(nil, wallet)
	if err != nil {
		t.Fatalf("Resolve failed: %v", err)
	}
	if id.Cmp(big.NewInt(1)) != 0 {
		t.Errorf("expected id 1, got %v", id)
	}
	if uri == "" {
		t.Errorf("expected non-empty uri")
	}
	if owner != wallet {
		t.Errorf("expected owner %s, got %s", wallet.Hex(), owner.Hex())
	}
}
