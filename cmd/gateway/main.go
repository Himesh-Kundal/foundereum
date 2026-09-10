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
	gen "github.com/foundereum/foundereum/internal/db/gen"
	"github.com/foundereum/foundereum/internal/httpx"
	"github.com/foundereum/foundereum/internal/ledger"
	"github.com/foundereum/foundereum/internal/policy"
	"github.com/foundereum/foundereum/internal/privy"
	"github.com/foundereum/foundereum/internal/tools"
	_ "github.com/foundereum/foundereum/internal/tools/deploy"
	_ "github.com/foundereum/foundereum/internal/tools/graph"
	_ "github.com/foundereum/foundereum/internal/tools/identity"
	_ "github.com/foundereum/foundereum/internal/tools/swap"
	_ "github.com/foundereum/foundereum/internal/tools/wallet"
	"github.com/foundereum/foundereum/internal/wallet"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/foundereum/foundereum/internal/x402/blocky"
	"github.com/foundereum/foundereum/internal/x402/self"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
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
	var queries *gen.Queries
	var ledg *ledger.Ledger
	if err != nil {
		logger.Warn("postgres not connected, starting gateway in standalone memory/mock mode", "err", err)
	} else {
		defer pgPool.Close()
		queries = gen.New(pgPool)
		ledg = ledger.New(pgPool)
	}

	rdb := redis.NewClient(&redis.Options{Addr: strings.TrimPrefix(cfg.RedisURL, "redis://")})
	defer rdb.Close()

	privyClient := privy.NewClient(cfg)
	var signer wallet.Signer
	if cfg.WalletSigner == "local" {
		signer, _ = wallet.NewLocalSigner("")
	} else {
		signer = wallet.NewPrivySigner(privyClient)
	}
	var facilitator x402.Facilitator
	switch cfg.FacilitatorMode {
	case "blocky":
		facilitator = blocky.New(cfg.Blocky402URL, cfg.MockChains)
	case "self":
		facilitator = self.New(cfg)
	default:
		facilitator = x402.NewMockFacilitator(cfg.HederaPlatformAccount)
	}

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

	r.Handle("/metrics", httpx.MetricsHandler())

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

		// Resolve wallet if auth header is present
		privyWalletID := ""
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			rawKey := strings.TrimPrefix(authHeader, "Bearer ")
			kh := sha256.Sum256([]byte(rawKey))
			if queries != nil {
				if row, err := queries.GetKeyContext(r.Context(), kh[:]); err == nil {
					if row.PrivyWalletID.Valid && row.PrivyWalletID.String != "" {
						privyWalletID = row.PrivyWalletID.String
					}
				}
			}
			if privyWalletID == "" && rdb != nil {
				khHex := hex.EncodeToString(kh[:])
				if val, err := rdb.Get(r.Context(), "key_ctx:"+khHex).Result(); err == nil && val != "" {
					var rCtx struct {
						PrivyWalletID string `json:"privy_wallet_id"`
						WalletID      string `json:"wallet_id"`
					}
					if json.Unmarshal([]byte(val), &rCtx) == nil {
						if rCtx.PrivyWalletID != "" {
							privyWalletID = rCtx.PrivyWalletID
						} else if rCtx.WalletID != "" {
							privyWalletID = rCtx.WalletID
						}
					}
				}
			}
		}

		// Sign transfer hash using Privy / local wallet signer
		bodyHash := sha256.Sum256([]byte("mock_tx_body_" + req.Nonce))
		var sig []byte
		var err error
		if signer != nil && privyWalletID != "" && privyWalletID != "agent_wallet" {
			sig, err = signer.RawSign(r.Context(), privyWalletID, bodyHash[:])
		}
		if err != nil || len(sig) == 0 {
			if err != nil {
				logger.Warn("privy signing failed, falling back to local signer", "err", err, "wallet_id", privyWalletID)
			}
			localSigner, lErr := wallet.NewLocalSigner("")
			if lErr != nil {
				httpx.Err(w, http.StatusInternalServerError, "SIGNING_FAILED", lErr.Error())
				return
			}
			sig, err = localSigner.RawSign(r.Context(), "", bodyHash[:])
			if err != nil {
				httpx.Err(w, http.StatusInternalServerError, "SIGNING_FAILED", err.Error())
				return
			}
		}

		blob := x402.PaymentBlob{
			X402Version: 1,
			Scheme:      "hedera-exact",
			Network:     cfg.HederaNetwork,
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

	// Rate limiter Lua script (Doc 04 / Doc 05: Redis token bucket 10 rps, burst 30)
	tokenBucketScript := redis.NewScript(`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(data[1])
local last = tonumber(data[2])

if not tokens then
    tokens = limit - 1
    last = now
    redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last)
    redis.call('EXPIRE', key, 3600)
    return 1
else
    local delta = math.max(0, now - last)
    tokens = math.min(limit, tokens + delta * rate)
    last = now
    if tokens >= 1 then
        tokens = tokens - 1
        redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last)
        redis.call('EXPIRE', key, 3600)
        return 1
    else
        redis.call('HSET', key, 'last_updated', last)
        return 0
    end
end
`)

	// POST /v1/tools/{tool}: Core x402-gated tool execution
	r.Post("/v1/tools/{tool}", func(w http.ResponseWriter, r *http.Request) {
		toolName := chi.URLParam(r, "tool")
		spec, ok := tools.Get(toolName)
		if !ok {
			httpx.Err(w, http.StatusNotFound, "TOOL_NOT_FOUND", "requested tool not found in registry")
			return
		}

		// Extract API key for rate limiting, scoping, and policy enforcement
		authHeader := r.Header.Get("Authorization")
		keyID := "anon:" + r.RemoteAddr
		var keyCtx *gen.GetKeyContextRow
		if strings.HasPrefix(authHeader, "Bearer ") {
			rawKey := strings.TrimPrefix(authHeader, "Bearer ")
			kh := sha256.Sum256([]byte(rawKey))
			keyID = hex.EncodeToString(kh[:8])
			if queries != nil {
				row, err := queries.GetKeyContext(r.Context(), kh[:])
				if err == nil {
					keyCtx = &row
				}
			}
			if keyCtx == nil && rdb != nil {
				khHex := hex.EncodeToString(kh[:])
				if val, err := rdb.Get(r.Context(), "key_ctx:"+khHex).Result(); err == nil && val != "" {
					var rCtx struct {
						ProjectID       string `json:"project_id"`
						WalletID        string `json:"wallet_id"`
						HederaAccountID string `json:"hedera_account_id"`
						EVMAddress      string `json:"evm_address"`
						Status          string `json:"status"`
					}
					if json.Unmarshal([]byte(val), &rCtx) == nil && (rCtx.Status == "active" || rCtx.Status == "ready") {
						pUUID, _ := uuid.Parse(rCtx.ProjectID)
						wUUID, _ := uuid.Parse(rCtx.WalletID)
						keyCtx = &gen.GetKeyContextRow{
							ProjectID:       pgtype.UUID{Bytes: pUUID, Valid: true},
							WalletID:        pgtype.UUID{Bytes: wUUID, Valid: true},
							HederaAccountID: pgtype.Text{String: rCtx.HederaAccountID, Valid: true},
							EvmAddress:      rCtx.EVMAddress,
							ProjectStatus:   "active",
						}
					}
				}
			}
		}

		// Redis token bucket rate limiting (10 rps, burst 30)
		rlKey := "rl:" + keyID
		if allowed, err := tokenBucketScript.Run(r.Context(), rdb, []string{rlKey}, 30, 10, time.Now().Unix()).Int(); err == nil && allowed == 0 {
			httpx.Err(w, http.StatusTooManyRequests, "RATE_LIMITED", "rate limit exceeded (10 requests/second, burst 30)")
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

		// Idempotency cache lookup (24h TTL)
		idemCacheKey := fmt.Sprintf("idem:%s:%s", keyID, idemKey)
		if cachedResp, err := rdb.Get(r.Context(), idemCacheKey).Result(); err == nil && cachedResp != "" {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(cachedResp))
			return
		}

		// Calculate pricing estimate
		estUSD := x402.Estimate(spec.Pricing, rawArgs)
		estBaseUnits := x402.USDToUSDC(estUSD)

		// Scoped project and wallet context
		projID := uuid.New()
		wltRef := wallet.Ref{
			HederaAccountID: cfg.HederaPlatformAccount,
			EVMAddress:      "0x0000000000000000000000000000000000000000",
		}
		if keyCtx != nil {
			projID = uuid.UUID(keyCtx.ProjectID.Bytes)
			if keyCtx.HederaAccountID.Valid {
				wltRef.HederaAccountID = keyCtx.HederaAccountID.String
			}
			if keyCtx.EvmAddress != "" {
				wltRef.EVMAddress = keyCtx.EvmAddress
			}

			// Pre-check policy if configured
			if len(keyCtx.Policy) > 0 && ledg != nil {
				spend24h, _ := ledg.SpendLast24h(r.Context(), projID)
				if err := policy.PreCheckPayment(keyCtx.Policy, cfg.HederaPlatformAccount, estUSD, spend24h); err != nil {
					httpx.Err(w, http.StatusForbidden, "POLICY_REJECTED", err.Error())
					return
				}
			}
		}

		// Check X-PAYMENT header
		xPaymentHeader := r.Header.Get("X-PAYMENT")

		// Free tools or zero price skip 402 challenge
		if estUSD.IsZero() {
			input := tools.Input{
				ProjectID: projID,
				Wallet:    wltRef,
				Args:      rawArgs,
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
						Network: cfg.HederaNetwork,
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

		// Atomic single-use challenge consumption via GETDEL (Doc 05 / Doc 08: Replay prevention)
		chRaw, err := rdb.GetDel(r.Context(), "x402:challenge:"+paymentBlob.Nonce).Result()
		if err == redis.Nil || chRaw == "" {
			httpx.Err(w, http.StatusConflict, "PAYMENT_REPLAYED", "payment challenge nonce has already been consumed or expired")
			return
		}

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
			ProjectID:  projID,
			Wallet:     wltRef,
			Args:       rawArgs,
			Settlement: settleRes,
		}
		out, err := spec.Executor.Execute(r.Context(), in)
		if err != nil {
			httpx.Err(w, http.StatusInternalServerError, "TOOL_EXECUTION_FAILED", err.Error())
			return
		}

		actUSD := x402.Actual(spec.Pricing, out.Bytes, rawArgs)
		carryUSD := "0"
		if actUSD.GreaterThan(estUSD) {
			diff := actUSD.Sub(estUSD)
			carryUSD = diff.String()
		}

		callIDStr := uuid.NewString()
		if ledg != nil && keyCtx != nil {
			cID, err := ledg.RecordPayment(r.Context(), ledger.PaymentRecord{
				ProjectID:      projID,
				APIKeyID:       uuid.UUID(keyCtx.KeyID.Bytes),
				WalletID:       uuid.UUID(keyCtx.WalletID.Bytes),
				Tool:           toolName,
				Args:           rawArgs,
				IdempotencyKey: idemKey,
				Nonce:          paymentBlob.Nonce,
				EstimateUSD:    estUSD,
				ActualUSD:      actUSD,
				MeteredBytes:   int32(out.Bytes),
				TxHash:         settleRes.TxID,
				LatencyMs:      120,
				Asset:          "USDC",
				AmountBase:     estBaseUnits,
				Facilitator:    cfg.FacilitatorMode,
			})
			if err == nil && cID != uuid.Nil {
				callIDStr = cID.String()
			}
		}

		// Broadcast call event to Redis Pub/Sub for live frontend dashboard streaming
		if rdb != nil {
			evBytes, _ := json.Marshal(map[string]any{
				"type":         "call.recorded",
				"call_id":      callIDStr,
				"project_id":   projID.String(),
				"tool":         toolName,
				"tx_hash":      settleRes.TxID,
				"estimate_usd": estUSD.String(),
				"actual_usd":   actUSD.String(),
				"status":       "succeeded",
				"ts":           time.Now().UTC(),
			})
			_ = rdb.Publish(r.Context(), "events:calls", evBytes).Err()
			_ = rdb.Publish(r.Context(), "events:project:"+projID.String(), evBytes).Err()
		}

		respData := map[string]any{
			"result":  out.Result,
			"call_id": callIDStr,
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
				"carry_usd":    carryUSD,
				"bytes":        out.Bytes,
			},
		}

		// Cache in Redis for idempotency replay (24h TTL)
		if respJSON, err := json.Marshal(respData); err == nil {
			_ = rdb.Set(r.Context(), idemCacheKey, respJSON, 24*time.Hour).Err()
		}

		httpx.JSON(w, http.StatusOK, respData)
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
