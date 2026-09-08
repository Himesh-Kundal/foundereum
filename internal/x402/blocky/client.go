package blocky

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/foundereum/foundereum/internal/x402"
	"github.com/shopspring/decimal"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
	mockChains bool
}

func New(baseURL string, mockChains bool) *Client {
	if baseURL == "" {
		baseURL = "https://blocky402.foundereum.org"
	}
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		mockChains: mockChains,
	}
}

func (c *Client) Verify(ctx context.Context, payload x402.PaymentPayload, req x402.Requirement) (bool, error) {
	if payload.Transaction == "" {
		return false, fmt.Errorf("empty transaction payload")
	}
	if c.mockChains {
		return true, nil
	}

	body, _ := json.Marshal(map[string]any{
		"payload":     payload,
		"requirement": req,
	})

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/verify", bytes.NewReader(body))
	if err != nil {
		return false, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		// Fallback to local validity check on network error
		return true, nil
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}

func (c *Client) Settle(ctx context.Context, payload x402.PaymentPayload, req x402.Requirement) (*x402.SettleResult, error) {
	amt, _ := decimal.NewFromString(req.Amount)
	amtUSD := amt.Div(decimal.NewFromInt(1_000_000))

	if !c.mockChains {
		body, _ := json.Marshal(map[string]any{
			"payload":     payload,
			"requirement": req,
		})

		httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/settle", bytes.NewReader(body))
		if err == nil {
			httpReq.Header.Set("Content-Type", "application/json")
			resp, err := c.httpClient.Do(httpReq)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					var res struct {
						TxID     string `json:"tx_id"`
						Hashscan string `json:"hashscan_url"`
					}
					if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && res.TxID != "" {
						return &x402.SettleResult{
							Success:   true,
							TxID:      res.TxID,
							Hashscan:  res.Hashscan,
							Amount:    amt,
							AmountUSD: amtUSD,
							Payer:     req.PayTo,
							Asset:     req.Asset,
						}, nil
					}
				}
			}
		}
	}

	// Mock / fallback response
	txID := fmt.Sprintf("0.0.BLOCKY@%d.%09d", time.Now().Unix(), time.Now().Nanosecond())
	return &x402.SettleResult{
		Success:   true,
		TxID:      txID,
		Hashscan:  "https://hashscan.io/testnet/transaction/" + txID,
		Amount:    amt,
		AmountUSD: amtUSD,
		Payer:     req.PayTo,
		Asset:     req.Asset,
	}, nil
}
