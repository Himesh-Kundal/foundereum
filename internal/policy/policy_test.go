package policy

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestPolicyPreCheck(t *testing.T) {
	spec := DefaultSpec()

	// 1. Valid destination
	err := PreCheckPayment(nil, "0.0.10413602", decimal.RequireFromString("0.5"), decimal.Zero)
	if err != nil {
		t.Fatalf("expected valid payment, got error: %v", err)
	}

	// 2. Disallowed destination
	err = PreCheckPayment(nil, "0.0.999999", decimal.RequireFromString("0.5"), decimal.Zero)
	if err == nil {
		t.Fatalf("expected error for disallowed destination, got nil")
	}

	// 3. Per-call cap exceeded
	err = PreCheckPayment(nil, "0.0.10413602", decimal.RequireFromString("2.0"), decimal.Zero)
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
