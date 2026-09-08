package policy

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestPolicyPreCheck(t *testing.T) {
	spec := DefaultSpecWithPayTo("0.0.TEST_PLATFORM")

	// 1. Valid destination
	err := PreCheckPayment(nil, "0.0.TEST_PLATFORM", decimal.RequireFromString("0.5"), decimal.Zero)
	if err != nil {
		t.Fatalf("expected valid payment, got error: %v", err)
	}

	// 2. Disallowed destination
	rawSpec := []byte(`{"payment":{"pay_to":["0.0.TEST_PLATFORM"],"max_usd_per_call":"1"}}`)
	err = PreCheckPayment(rawSpec, "0.0.999999", decimal.RequireFromString("0.5"), decimal.Zero)
	if err == nil {
		t.Fatalf("expected error for disallowed destination, got nil")
	}

	// 3. Per-call cap exceeded
	err = PreCheckPayment(rawSpec, "0.0.TEST_PLATFORM", decimal.RequireFromString("2.0"), decimal.Zero)
	if err == nil {
		t.Fatalf("expected error for exceeding per-call cap, got nil")
	}

	// 4. EVM allowlists
	err = PreCheckEVM(nil, spec.ContractAllowlist[0], "0x095ea7b3", decimal.RequireFromString("1.0"), decimal.Zero)
	if err != nil {
		t.Fatalf("expected valid EVM call, got error: %v", err)
	}

	err = PreCheckEVM(nil, "0xDEADBEEF00000000000000000000000000000000", "0x095ea7b3", decimal.RequireFromString("1.0"), decimal.Zero)
	if err == nil {
		t.Fatalf("expected error for unapproved contract, got nil")
	}
}
