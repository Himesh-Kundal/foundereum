package policy

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
)

var (
	ErrContractNotAllowed = errors.New("contract address is not in policy allowlist")
	ErrSelectorNotAllowed = errors.New("function selector is not in policy allowlist")
	ErrVelocityExceeded   = errors.New("policy 24h spend velocity cap exceeded")
	ErrPerCallCapExceeded = errors.New("per-call USD limit exceeded")
	ErrPayToNotAllowed    = errors.New("payment destination is not in policy allowlist")
)

type Spec struct {
	Velocity struct {
		MaxUSDPer24h  string `json:"max_usd_per_24h"`
		MaxUSDPerCall string `json:"max_usd_per_call"`
	} `json:"velocity"`
	ContractAllowlist []string `json:"contract_allowlist"`
	SelectorAllowlist []string `json:"selector_allowlist"`
	Payment           struct {
		PayTo         []string `json:"pay_to"`
		MaxUSDPerCall string   `json:"max_usd_per_call"`
	} `json:"payment"`
	RawSign struct {
		AllowedPurposes []string `json:"allowed_purposes"`
	} `json:"raw_sign"`
}

func DefaultSpecWithPayTo(platformAccount string) Spec {
	var s Spec
	s.Velocity.MaxUSDPer24h = "25"
	s.Velocity.MaxUSDPerCall = "5"
	s.ContractAllowlist = []string{
		"0x0000000000000000000000000000000000068cDa", // Hedera testnet USDC EVM alias
		"0x0000000000000000000000000000000000000000",
	}
	s.SelectorAllowlist = []string{
		"0x095ea7b3", // approve(address,uint256)
		"0x38ed1739", // swapExactTokensForTokens
		"0x18cbafe5", // swapExactTokensForETH
	}
	if platformAccount != "" {
		s.Payment.PayTo = []string{platformAccount}
	} else {
		s.Payment.PayTo = []string{"0.0.PLATFORM"}
	}
	s.Payment.MaxUSDPerCall = "1"
	s.RawSign.AllowedPurposes = []string{"hts_transfer_to_platform", "token_associate"}
	return s
}

func DefaultSpec() Spec {
	return DefaultSpecWithPayTo("0.0.PLATFORM")
}

// PreCheckPayment checks if an x402 payment satisfies the project policy.
func PreCheckPayment(rawSpec []byte, payTo string, amountUSD decimal.Decimal, spend24h decimal.Decimal) error {
	var spec Spec
	if len(rawSpec) > 0 {
		if err := json.Unmarshal(rawSpec, &spec); err != nil {
			spec = DefaultSpec()
		}
	} else {
		spec = DefaultSpecWithPayTo(payTo)
	}

	// 1. Destination check
	allowedPayTo := false
	for _, p := range spec.Payment.PayTo {
		if strings.EqualFold(p, payTo) {
			allowedPayTo = true
			break
		}
	}
	if !allowedPayTo && len(spec.Payment.PayTo) > 0 {
		return fmt.Errorf("%w: destination %s", ErrPayToNotAllowed, payTo)
	}

	// 2. Per-call cap
	if spec.Payment.MaxUSDPerCall != "" {
		maxPerCall, err := decimal.NewFromString(spec.Payment.MaxUSDPerCall)
		if err == nil && amountUSD.GreaterThan(maxPerCall) {
			return fmt.Errorf("%w: call amount %s exceeds limit %s", ErrPerCallCapExceeded, amountUSD, maxPerCall)
		}
	}

	// 3. 24h spend cap
	if spec.Velocity.MaxUSDPer24h != "" {
		max24h, err := decimal.NewFromString(spec.Velocity.MaxUSDPer24h)
		if err == nil && spend24h.Add(amountUSD).GreaterThan(max24h) {
			return fmt.Errorf("%w: current spend %s + %s exceeds limit %s", ErrVelocityExceeded, spend24h, amountUSD, max24h)
		}
	}

	return nil
}

// PreCheckEVM validates EVM call parameters before requesting a signature.
func PreCheckEVM(rawSpec []byte, to string, selector string, valueUSD decimal.Decimal, spend24h decimal.Decimal) error {
	var spec Spec
	if len(rawSpec) > 0 {
		if err := json.Unmarshal(rawSpec, &spec); err != nil {
			spec = DefaultSpec()
		}
	} else {
		spec = DefaultSpec()
	}

	// 1. Contract allowlist
	allowedTo := false
	for _, c := range spec.ContractAllowlist {
		if strings.EqualFold(c, to) {
			allowedTo = true
			break
		}
	}
	if !allowedTo {
		return fmt.Errorf("%w: target contract %s", ErrContractNotAllowed, to)
	}

	// 2. Selector allowlist
	allowedSel := false
	for _, s := range spec.SelectorAllowlist {
		if strings.HasPrefix(selector, s) {
			allowedSel = true
			break
		}
	}
	if !allowedSel {
		return fmt.Errorf("%w: selector %s", ErrSelectorNotAllowed, selector)
	}

	// 3. Velocity check
	if spec.Velocity.MaxUSDPerCall != "" {
		maxPerCall, err := decimal.NewFromString(spec.Velocity.MaxUSDPerCall)
		if err == nil && valueUSD.GreaterThan(maxPerCall) {
			return fmt.Errorf("%w: call amount %s exceeds limit %s", ErrPerCallCapExceeded, valueUSD, maxPerCall)
		}
	}

	return nil
}
