package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/foundereum/foundereum/internal/config"
	"github.com/foundereum/foundereum/internal/httpx"
	"github.com/foundereum/foundereum/internal/privy"
	"github.com/foundereum/foundereum/internal/tools"
	_ "github.com/foundereum/foundereum/internal/tools/graph"
	_ "github.com/foundereum/foundereum/internal/tools/identity"
	_ "github.com/foundereum/foundereum/internal/tools/swap"
	_ "github.com/foundereum/foundereum/internal/tools/wallet"
	"github.com/foundereum/foundereum/internal/wallet"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	logger := config.SetupLogger(cfg.LogLevel)
	logger.Info("starting foundereum gateway", "port", cfg.PortGateway, "mock", cfg.MockChains)

	ctx := context.Background()
	pgPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Warn("postgres not connected, starting gateway in standalone memory/mock mode", "err", err)
	} else {
		defer pgPool.Close()
	}

	rdb := redis.NewClient(&redis.Options{Addr: strings.TrimPrefix(cfg.RedisURL, "redis://")})
	defer rdb.Close()

	privyClient := privy.NewClient(cfg)
	privySigner := wallet.NewPrivySigner(privyClient)
	var facilitator x402.Facilitator = x402.NewMockFacilitator()

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		ExposedHeaders: []string{"X-PAYMENT", "Idempotency-Key"},
		MaxAge:         300,
	}))

	r.Get("/v1/self", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "gateway"})
	})

	r.Get("/v1/tools", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, tools.List())
	})

	// POST /v1/payments/build: MCP server requests partially-signed transaction
	r.Post("/v1/payments/build", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Nonce string `json:"nonce"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Nonce == "" {
			httpx.Err(w, http.StatusBadRequest, "INVALID_REQUEST", "missing challenge nonce")
			return
		}

		// Sign transfer hash using Privy / local wallet signer
		bodyHash := sha256.Sum256([]byte("mock_tx_body_" + req.Nonce))
		sig, err := privySigner.RawSign(r.Context(), "agent_wallet", bodyHash[:])
		if err != nil {
			httpx.Err(w, http.StatusInternalServerError, "SIGNING_FAILED", err.Error())
			return
		}

		blob := x402.PaymentBlob{
			X402Version: 1,
			Scheme:      "hedera-exact",
			Network:     "hedera-testnet",
			Nonce:       req.Nonce,
			Payload: x402.PaymentPayload{
				Transaction: hex.EncodeToString(sig),
			},
		}
		encoded, _ := x402.EncodePayment(&blob)

		httpx.JSON(w, http.StatusOK, map[string]any{
			"x_payment": encoded,
			"expires":   time.Now().Add(120 * time.Second),
		})
	})

	// POST /v1/tools/{tool}: Core x402-gated tool execution
	r.Post("/v1/tools/{tool}", func(w http.ResponseWriter, r *http.Request) {
		toolName := chi.URLParam(r, "tool")
		spec, ok := tools.Get(toolName)
		if !ok {
			httpx.Err(w, http.StatusNotFound, "TOOL_NOT_FOUND", "requested tool not found in registry")
			return
		}

		rawArgs, _ := io.ReadAll(r.Body)
		if len(rawArgs) == 0 {
			rawArgs = []byte("{}")
		}

		idemKey := r.Header.Get("Idempotency-Key")
		if idemKey == "" {
			idemKey = uuid.NewString()
		}

		// Calculate pricing estimate
		estUSD := x402.Estimate(spec.Pricing, rawArgs)
		estBaseUnits := x402.USDToUSDC(estUSD)

		// Check X-PAYMENT header
		xPaymentHeader := r.Header.Get("X-PAYMENT")

		// Free tools or zero price skip 402 challenge
		if estUSD.IsZero() {
			input := tools.Input{
				ProjectID: uuid.New(),
				Wallet: wallet.Ref{
					HederaAccountID: cfg.HederaPlatformAccount,
					EVMAddress:      "0x88a741c51122f62754f35d4673cba5dac646d05d",
				},
				Args: rawArgs,
			}
			out, err := spec.Executor.Execute(r.Context(), input)
			if err != nil {
				httpx.Err(w, http.StatusInternalServerError, "TOOL_EXECUTION_FAILED", err.Error())
				return
			}
			httpx.JSON(w, http.StatusOK, map[string]any{
				"result":  out.Result,
				"pricing": map[string]any{"estimate_usd": "0", "actual_usd": "0"},
			})
			return
		}

		// If no X-PAYMENT header, issue 402 challenge
		if xPaymentHeader == "" {
			nonceBytes := make([]byte, 16)
			_, _ = rand.Read(nonceBytes)
			nonce := hex.EncodeToString(nonceBytes)

			ch := x402.Challenge{
				X402Version: 1,
				Resource:    toolName,
				Nonce:       nonce,
				Expires:     time.Now().Add(120 * time.Second),
				Pricing: x402.PricingMeta{
					EstimateUSD: estUSD.String(),
					Rule:        fmt.Sprintf("base %s", spec.Pricing.BaseUSD),
					CarryUSD:    "0",
				},
				Accepts: []x402.Requirement{
					{
						Scheme:  "hedera-exact",
						Network: "hedera-testnet",
						Asset:   cfg.HederaUSDCTokenID,
						Amount:  estBaseUnits.String(),
						PayTo:   cfg.HederaPlatformAccount,
						Extra: map[string]any{
							"memo":              "fnd:" + nonce,
							"maxTimeoutSeconds": 120,
						},
					},
				},
			}

			chJSON, _ := json.Marshal(ch)
			_ = rdb.Set(r.Context(), "x402:challenge:"+nonce, chJSON, 120*time.Second).Err()

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusPaymentRequired)
			_, _ = w.Write(chJSON)
			return
		}

		// Verify & Settle x402 payment
		paymentBlob, err := x402.DecodePayment(xPaymentHeader)
		if err != nil {
			httpx.Err(w, http.StatusBadRequest, "PAYMENT_INVALID", "invalid X-PAYMENT format")
			return
		}

		_ = rdb.Del(r.Context(), "x402:challenge:"+paymentBlob.Nonce).Err()

		req := x402.Requirement{
			Scheme:  paymentBlob.Scheme,
			Network: paymentBlob.Network,
			Asset:   cfg.HederaUSDCTokenID,
			Amount:  estBaseUnits.String(),
			PayTo:   cfg.HederaPlatformAccount,
		}

		settleRes, err := facilitator.Settle(r.Context(), paymentBlob.Payload, req)
		if err != nil {
			httpx.Err(w, http.StatusPaymentRequired, "PAYMENT_FAILED", err.Error())
			return
		}

		in := tools.Input{
			ProjectID: uuid.New(),
			Wallet: wallet.Ref{
				HederaAccountID: cfg.HederaPlatformAccount,
				EVMAddress:      "0x88a741c51122f62754f35d4673cba5dac646d05d",
			},
			Args:       rawArgs,
			Settlement: settleRes,
		}
		out, err := spec.Executor.Execute(r.Context(), in)
		if err != nil {
			httpx.Err(w, http.StatusInternalServerError, "TOOL_EXECUTION_FAILED", err.Error())
			return
		}

		actUSD := x402.Actual(spec.Pricing, out.Bytes, rawArgs)

		httpx.JSON(w, http.StatusOK, map[string]any{
			"result":  out.Result,
			"call_id": uuid.NewString(),
			"payment": map[string]any{
				"hedera_tx_id": settleRes.TxID,
				"amount":       settleRes.Amount.String(),
				"amount_usd":   settleRes.AmountUSD.String(),
				"hashscan_url": settleRes.Hashscan,
				"facilitator":  cfg.FacilitatorMode,
			},
			"metering": map[string]any{
				"estimate_usd": estUSD.String(),
				"actual_usd":   actUSD.String(),
				"bytes":        out.Bytes,
			},
		})
	})

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.PortGateway),
		Handler: r,
	}
	logger.Info("gateway listening", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("gateway exited", "err", err)
	}
}
