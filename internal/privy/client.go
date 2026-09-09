package privy

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/foundereum/foundereum/internal/config"
)

type Client struct {
	cfg        *config.Config
	httpClient *http.Client
}

func NewClient(cfg *config.Config) *Client {
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type CreateWalletResponse struct {
	ID        string `json:"id"`
	Address   string `json:"address"`
	ChainType string `json:"chain_type"`
	PublicKey string `json:"public_key,omitempty"`
}

func (c *Client) CreateServerWallet(ctx context.Context) (*CreateWalletResponse, error) {
	if c.cfg.MockChains {
		// Mock local keypair for offline/mock development
		privKey, err := crypto.GenerateKey()
		if err != nil {
			return nil, fmt.Errorf("generate mock key: %w", err)
		}
		addr := crypto.PubkeyToAddress(privKey.PublicKey).Hex()
		pubBytes := crypto.CompressPubkey(&privKey.PublicKey)
		return &CreateWalletResponse{
			ID:        "privy_wlt_mock_" + addr[2:10],
			Address:   addr,
			ChainType: "ethereum",
			PublicKey: hex.EncodeToString(pubBytes),
		}, nil
	}

	reqBody, _ := json.Marshal(map[string]string{"chain_type": "ethereum"})
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.privy.io/v1/wallets", bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(c.cfg.PrivyAppID, c.cfg.PrivyAppSecret)
	req.Header.Set("privy-app-id", c.cfg.PrivyAppID)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("privy error %d: %s", resp.StatusCode, string(body))
	}

	var res CreateWalletResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

// RawSign signs a 32-byte hash (keccak256 or sha256) producing 64-byte r||s signature.
func (c *Client) RawSign(ctx context.Context, walletID string, hash32 []byte) ([]byte, error) {
	if c.cfg.MockChains {
		// Use local deterministic mock key derived from walletID
		seed := sha256.Sum256([]byte("foundereum_mock_key_" + walletID))
		key, err := crypto.ToECDSA(seed[:])
		if err != nil {
			return nil, err
		}
		sig, err := crypto.Sign(hash32, key)
		if err != nil {
			return nil, err
		}
		// Return 64-byte r||s (drop v)
		return sig[:64], nil
	}

	// Privy API secp256k1_sign call
	payload := map[string]any{
		"method": "secp256k1_sign",
		"params": map[string]any{
			"hash": "0x" + hex.EncodeToString(hash32),
		},
	}
	data, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("https://api.privy.io/v1/wallets/%s/rpc", walletID), bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(c.cfg.PrivyAppID, c.cfg.PrivyAppSecret)
	req.Header.Set("privy-app-id", c.cfg.PrivyAppID)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("privy raw_sign error %d: %s", resp.StatusCode, string(body))
	}

	var rpcResp struct {
		Data struct {
			Signature string `json:"signature"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, err
	}

	sigHex := strings.TrimPrefix(rpcResp.Data.Signature, "0x")
	return hex.DecodeString(sigHex)
}

// SignEVMTx signs an Ethereum transaction under Privy policies.
func (c *Client) SignEVMTx(ctx context.Context, walletID string, tx *types.Transaction, chainID *big.Int) ([]byte, error) {
	if c.cfg.MockChains {
		seed := sha256.Sum256([]byte("foundereum_mock_key_" + walletID))
		key, err := crypto.ToECDSA(seed[:])
		if err != nil {
			return nil, err
		}
		signer := types.NewCancunSigner(chainID)
		signedTx, err := types.SignTx(tx, signer, key)
		if err != nil {
			return nil, err
		}
		return signedTx.MarshalBinary()
	}

	// Live Privy RPC eth_signTransaction
	return nil, errors.New("live Privy EVM signing requires active policy push")
}

// PushPolicy pushes a policy specification to Privy Policy Engine.
func (c *Client) PushPolicy(ctx context.Context, name string, rules []any) (string, error) {
	if c.cfg.MockChains {
		return "privy_pol_mock_" + hex.EncodeToString(crypto.Keccak256([]byte(name))[:4]), nil
	}

	payload := map[string]any{
		"version":    "1.0",
		"name":       name,
		"chain_type": "ethereum",
		"rules":      rules,
	}
	data, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.privy.io/v1/policies", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(c.cfg.PrivyAppID, c.cfg.PrivyAppSecret)
	req.Header.Set("privy-app-id", c.cfg.PrivyAppID)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("privy policy error %d: %s", resp.StatusCode, string(body))
	}

	var polResp struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&polResp); err != nil {
		return "", err
	}
	return polResp.ID, nil
}
