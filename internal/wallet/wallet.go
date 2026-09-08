package wallet

import (
	"context"
	"crypto/ecdsa"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
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

type LocalSigner struct {
	privKey *ecdsa.PrivateKey
}

func NewLocalSigner(privKeyHex string) (*LocalSigner, error) {
	if privKeyHex == "" {
		key, err := crypto.GenerateKey()
		if err != nil {
			return nil, err
		}
		return &LocalSigner{privKey: key}, nil
	}
	privKeyHex = strings.TrimPrefix(privKeyHex, "0x")
	key, err := crypto.HexToECDSA(privKeyHex)
	if err != nil {
		return nil, err
	}
	return &LocalSigner{privKey: key}, nil
}

func (s *LocalSigner) RawSign(ctx context.Context, walletID string, hash32 []byte) ([]byte, error) {
	sig, err := crypto.Sign(hash32, s.privKey)
	if err != nil {
		return nil, err
	}
	if len(sig) == 65 {
		return sig[:64], nil // 64-byte r || s
	}
	return sig, nil
}

func (s *LocalSigner) SignEVMTx(ctx context.Context, walletID string, tx *types.Transaction, chainID *big.Int) ([]byte, error) {
	signer := types.NewEIP155Signer(chainID)
	signedTx, err := types.SignTx(tx, signer, s.privKey)
	if err != nil {
		return nil, err
	}
	return signedTx.MarshalBinary()
}
