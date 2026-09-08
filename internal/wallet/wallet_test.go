package wallet

import (
	"context"
	"crypto/sha256"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/core/types"
)

func TestLocalSigner(t *testing.T) {
	signer, err := NewLocalSigner("")
	if err != nil {
		t.Fatalf("failed to create local signer: %v", err)
	}

	hash := sha256.Sum256([]byte("hello foundereum"))
	sig, err := signer.RawSign(context.Background(), "wallet-1", hash[:])
	if err != nil {
		t.Fatalf("RawSign failed: %v", err)
	}
	if len(sig) != 64 {
		t.Errorf("expected 64-byte signature (r || s), got %d", len(sig))
	}

	// Test EVM tx signing
	rawTx := types.NewTx(&types.LegacyTx{
		Nonce:    1,
		GasPrice: big.NewInt(1000000000),
		Gas:      21000,
		Value:    big.NewInt(100),
	})
	signedBytes, err := signer.SignEVMTx(context.Background(), "wallet-1", rawTx, big.NewInt(296))
	if err != nil {
		t.Fatalf("SignEVMTx failed: %v", err)
	}
	if len(signedBytes) == 0 {
		t.Errorf("expected non-empty signed tx bytes")
	}
}
