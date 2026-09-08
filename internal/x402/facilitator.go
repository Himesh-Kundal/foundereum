package x402

import (
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

type Facilitator interface {
	Verify(ctx context.Context, payload PaymentPayload, req Requirement) (bool, error)
	Settle(ctx context.Context, payload PaymentPayload, req Requirement) (*SettleResult, error)
}

// MockFacilitator handles local development and mock mode
type MockFacilitator struct {
	payerAccount string
}

func NewMockFacilitator(payerAccount string) *MockFacilitator {
	if payerAccount == "" {
		payerAccount = "0.0.PLATFORM"
	}
	return &MockFacilitator{payerAccount: payerAccount}
}

func (m *MockFacilitator) Verify(ctx context.Context, payload PaymentPayload, req Requirement) (bool, error) {
	if payload.Transaction == "" {
		return false, fmt.Errorf("empty transaction payload")
	}
	return true, nil
}

func (m *MockFacilitator) Settle(ctx context.Context, payload PaymentPayload, req Requirement) (*SettleResult, error) {
	amt, _ := decimal.NewFromString(req.Amount)
	amtUSD := amt.Div(decimal.NewFromInt(1_000_000))
	txID := fmt.Sprintf("%s@%d.%09d", m.payerAccount, time.Now().Unix(), time.Now().Nanosecond())
	return &SettleResult{
		Success:   true,
		TxID:      txID,
		Hashscan:  "https://hashscan.io/testnet/transaction/" + txID,
		Amount:    amt,
		AmountUSD: amtUSD,
		Payer:     m.payerAccount,
		Asset:     req.Asset,
	}, nil
}
