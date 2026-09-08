package x402

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

type Challenge struct {
	X402Version int           `json:"x402Version"`
	Resource    string        `json:"resource"`
	Nonce       string        `json:"nonce"`
	Expires     time.Time     `json:"expires"`
	Pricing     PricingMeta   `json:"pricing"`
	Accepts     []Requirement `json:"accepts"`
}

type PricingMeta struct {
	EstimateUSD string `json:"estimate_usd"`
	Rule        string `json:"rule"`
	CarryUSD    string `json:"carry_usd"`
}

type Requirement struct {
	Scheme  string         `json:"scheme"`  // e.g. "hedera-exact"
	Network string         `json:"network"` // e.g. "hedera-testnet"
	Asset   string         `json:"asset"`   // e.g. HTS token id "0.0.429274"
	Amount  string         `json:"amount"`  // 6 dp base units
	PayTo   string         `json:"payTo"`   // platform account from config
	Extra   map[string]any `json:"extra"`   // memo, maxTimeoutSeconds
}

type PaymentBlob struct {
	X402Version int            `json:"x402Version"`
	Scheme      string         `json:"scheme"`
	Network     string         `json:"network"`
	Nonce       string         `json:"nonce"`
	Payload     PaymentPayload `json:"payload"`
}

type PaymentPayload struct {
	Transaction string `json:"transaction"` // base64 encoded transaction bytes
}

func DecodePayment(rawHeader string) (*PaymentBlob, error) {
	data, err := base64.StdEncoding.DecodeString(rawHeader)
	if err != nil {
		return nil, fmt.Errorf("base64 decode: %w", err)
	}
	var blob PaymentBlob
	if err := json.Unmarshal(data, &blob); err != nil {
		return nil, fmt.Errorf("json unmarshal payment: %w", err)
	}
	return &blob, nil
}

func EncodePayment(blob *PaymentBlob) (string, error) {
	data, err := json.Marshal(blob)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

type SettleResult struct {
	Success   bool            `json:"success"`
	TxID      string          `json:"tx_id"`
	Hashscan  string          `json:"hashscan_url"`
	Amount    decimal.Decimal `json:"amount"`
	AmountUSD decimal.Decimal `json:"amount_usd"`
	Payer     string          `json:"payer"`
	Asset     string          `json:"asset"`
}
