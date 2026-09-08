package x402

import (
	"encoding/json"
	"testing"

	"github.com/shopspring/decimal"
)

func TestPricingEstimateAndActual(t *testing.T) {
	rule := Rule{
		BaseUSD:  decimal.RequireFromString("0.00001"),
		PerKBUSD: decimal.RequireFromString("0.000002"),
	}

	// 1. Estimation with 10KB default
	est := Estimate(rule, json.RawMessage(`{}`))
	expectedEst := decimal.RequireFromString("0.00003") // 0.00001 + 0.000002 * 10
	if !est.Equal(expectedEst) {
		t.Fatalf("expected estimate %s, got %s", expectedEst, est)
	}

	// 2. Actual calculation with 5KB returned
	bytesReturned := 5120 // 5 KB
	act := Actual(rule, bytesReturned, json.RawMessage(`{}`))
	expectedAct := decimal.RequireFromString("0.00002") // 0.00001 + 0.000002 * 5
	if !act.Equal(expectedAct) {
		t.Fatalf("expected actual %s, got %s", expectedAct, act)
	}

	// 3. Swap notional basis points
	swapRule := Rule{
		BaseUSD:        decimal.RequireFromString("0.005"),
		NotionalBps:    5, // 0.05%
		NotionalCapUSD: decimal.RequireFromString("0.05"),
	}
	swapEst := Estimate(swapRule, json.RawMessage(`{"amount_in":"5"}`))
	// 5 * 0.0005 = 0.0025 + 0.005 base = 0.0075
	expectedSwap := decimal.RequireFromString("0.0075")
	if !swapEst.Equal(expectedSwap) {
		t.Fatalf("expected swap cost %s, got %s", expectedSwap, swapEst)
	}
}

func TestUSDToUSDC(t *testing.T) {
	usd := decimal.RequireFromString("0.00003")
	usdc := USDToUSDC(usd)
	if !usdc.Equal(decimal.NewFromInt(30)) {
		t.Fatalf("expected 30 units, got %s", usdc)
	}
}
