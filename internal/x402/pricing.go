package x402

import (
	"encoding/json"

	"github.com/shopspring/decimal"
)

type Rule struct {
	BaseUSD        decimal.Decimal
	PerKBUSD       decimal.Decimal
	NotionalBps    int
	NotionalCapUSD decimal.Decimal
	PerKBBytecode  decimal.Decimal
}

// Estimate calculates the estimated cost in USD before tool execution.
func Estimate(rule Rule, args json.RawMessage) decimal.Decimal {
	cost := rule.BaseUSD

	// Handle notional bps for swaps
	if rule.NotionalBps > 0 && len(args) > 0 {
		var swapArgs struct {
			AmountIn string `json:"amount_in"`
		}
		if err := json.Unmarshal(args, &swapArgs); err == nil && swapArgs.AmountIn != "" {
			if amt, err := decimal.NewFromString(swapArgs.AmountIn); err == nil {
				bpsRatio := decimal.NewFromInt(int64(rule.NotionalBps)).Div(decimal.NewFromInt(10000))
				swapCost := amt.Mul(bpsRatio)
				if !rule.NotionalCapUSD.IsZero() && swapCost.GreaterThan(rule.NotionalCapUSD) {
					swapCost = rule.NotionalCapUSD
				}
				cost = cost.Add(swapCost)
			}
		}
	}

	// For data queries, assume conservative 10KB estimate if perKB applies
	if !rule.PerKBUSD.IsZero() {
		cost = cost.Add(rule.PerKBUSD.Mul(decimal.NewFromInt(10)))
	}

	// Enforce floor of $0.000001 (1 unit of USDC 6dp)
	floor := decimal.NewFromFloat(0.000001)
	if cost.LessThan(floor) && !cost.IsZero() {
		cost = floor
	}

	return cost
}

// Actual calculates the final actual cost in USD based on execution output.
func Actual(rule Rule, bytesReturned int, args json.RawMessage) decimal.Decimal {
	cost := rule.BaseUSD

	if rule.NotionalBps > 0 && len(args) > 0 {
		var swapArgs struct {
			AmountIn string `json:"amount_in"`
		}
		if err := json.Unmarshal(args, &swapArgs); err == nil && swapArgs.AmountIn != "" {
			if amt, err := decimal.NewFromString(swapArgs.AmountIn); err == nil {
				bpsRatio := decimal.NewFromInt(int64(rule.NotionalBps)).Div(decimal.NewFromInt(10000))
				swapCost := amt.Mul(bpsRatio)
				if !rule.NotionalCapUSD.IsZero() && swapCost.GreaterThan(rule.NotionalCapUSD) {
					swapCost = rule.NotionalCapUSD
				}
				cost = cost.Add(swapCost)
			}
		}
	}

	if !rule.PerKBUSD.IsZero() && bytesReturned > 0 {
		kb := decimal.NewFromInt(int64(bytesReturned)).Div(decimal.NewFromInt(1024))
		cost = cost.Add(rule.PerKBUSD.Mul(kb))
	}

	floor := decimal.NewFromFloat(0.000001)
	if cost.LessThan(floor) && !cost.IsZero() {
		cost = floor
	}

	return cost
}

// USDToUSDC converts a USD decimal into 6-decimal integer base units.
func USDToUSDC(usd decimal.Decimal) decimal.Decimal {
	multiplier := decimal.NewFromInt(1_000_000)
	return usd.Mul(multiplier).Round(0)
}
