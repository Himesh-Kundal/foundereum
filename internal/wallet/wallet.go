package wallet

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/foundereum/foundereum/internal/privy"
)

type Signer interface {
	RawSign(ctx context.Context, walletID string, hash32 []byte) (sig64 []byte, err error)
	SignEVMTx(ctx context.Context, walletID string, tx *types.Transaction, chainID *big.Int) ([]byte, error)
}

type Ref struct {
	ID              string
	EVMAddress      string
	HederaAccountID string
	PublicKeyHex    string
	PrivyWalletID   string
}

type PrivySigner struct {
	client *privy.Client
}

func NewPrivySigner(client *privy.Client) *PrivySigner {
	return &PrivySigner{client: client}
}

func (s *PrivySigner) RawSign(ctx context.Context, walletID string, hash32 []byte) ([]byte, error) {
	return s.client.RawSign(ctx, walletID, hash32)
}

func (s *PrivySigner) SignEVMTx(ctx context.Context, walletID string, tx *types.Transaction, chainID *big.Int) ([]byte, error) {
	return s.client.SignEVMTx(ctx, walletID, tx, chainID)
}
