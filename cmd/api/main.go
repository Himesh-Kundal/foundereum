package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/foundereum/foundereum/internal/auth"
	"github.com/foundereum/foundereum/internal/config"
	"github.com/foundereum/foundereum/internal/httpx"
	"github.com/foundereum/foundereum/internal/policy"
	"github.com/foundereum/foundereum/internal/privy"
	"github.com/foundereum/foundereum/internal/tools"
	_ "github.com/foundereum/foundereum/internal/tools/graph"
	_ "github.com/foundereum/foundereum/internal/tools/identity"
	_ "github.com/foundereum/foundereum/internal/tools/swap"
	_ "github.com/foundereum/foundereum/internal/tools/wallet"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
)

type MemoryStore struct {
	mu        sync.RWMutex
	projects  map[string]map[string]any
	wallets   map[string][]map[string]any
	policies  map[string]map[string]any
	keys      map[string][]map[string]any
	approvals map[string][]map[string]any
	calls     map[string][]map[string]any
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		projects:  make(map[string]map[string]any),
		wallets:   make(map[string][]map[string]any),
		policies:  make(map[string]map[string]any),
		keys:      make(map[string][]map[string]any),
		approvals: make(map[string][]map[string]any),
		calls:     make(map[string][]map[string]any),
	}
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	logger := config.SetupLogger(cfg.LogLevel)
	logger.Info("starting foundereum api control plane", "port", cfg.PortAPI, "dev_bypass", cfg.AuthDevBypass)

	authSvc := auth.NewService(cfg.JWTSecret, cfg.AuthDevBypass)
	privyClient := privy.NewClient(cfg)
	memStore := NewMemoryStore()

	// Default demo project for quick-start
	demoProjID := "11111111-1111-1111-1111-111111111111"
	memStore.projects[demoProjID] = map[string]any{
		"id":                      demoProjID,
		"name":                    "market-scout",
		"slug":                    "market-scout",
		"status":                  "active",
		"hcs_topic_id":            "0.0.10413602",
		"quorum_threshold":        2,
		"withdraw_quorum_min_usd": "100.0000000000",
		"created_at":              time.Now().Format(time.RFC3339),
	}
	memStore.wallets[demoProjID] = []map[string]any{
		{
			"id":                uuid.NewString(),
			"kind":              "treasury",
			"evm_address":       "0x88a741c51122f62754f35d4673cba5dac646d05d",
			"hedera_account_id": "0.0.10413602",
			"usdc":              "150.000000",
			"hbar":              "50.000000",
			"status":            "ready",
			"hashscan_url":      "https://hashscan.io/testnet/account/0.0.10413602",
		},
		{
			"id":                uuid.NewString(),
			"kind":              "agent",
			"evm_address":       "0x88a741c51122f62754f35d4673cba5dac646d05d",
			"hedera_account_id": "0.0.10413602",
			"usdc":              "25.000000",
			"hbar":              "10.000000",
			"status":            "ready",
			"hashscan_url":      "https://hashscan.io/testnet/account/0.0.10413602",
		},
	}
	memStore.policies[demoProjID] = map[string]any{
		"spec":            policy.DefaultSpec(),
		"version":         1,
		"privy_policy_id": "privy_pol_mock_market_scout",
		"pushed_at":       time.Now().Format(time.RFC3339),
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		MaxAge:         300,
	}))

	// Public Services Directory
	r.Get("/services", func(w http.ResponseWriter, r *http.Request) {
		specs := tools.List()
		var toolList []map[string]any
		for _, sp := range specs {
			var schema any
			_ = json.Unmarshal(sp.InputSchema, &schema)
			toolList = append(toolList, map[string]any{
				"name":         sp.Name,
				"description":  sp.Description,
				"pricing":      sp.Pricing,
				"input_schema": schema,
				"tags":         sp.Tags,
			})
		}
		httpx.JSON(w, http.StatusOK, map[string]any{
			"name": "Foundereum",
			"x402": map[string]any{
				"scheme":  "hedera-exact",
				"network": cfg.HederaNetwork,
				"asset":   cfg.HederaUSDCTokenID,
				"payTo":   cfg.HederaPlatformAccount,
			},
			"tools": toolList,
		})
	})

	// Auth session & dev login
	r.Post("/v1/auth/dev", func(w http.ResponseWriter, r *http.Request) {
		userID := uuid.New()
		orgID := uuid.New()
		token, err := authSvc.IssueToken(userID, orgID, "operator@foundereum.xyz", "owner")
		if err != nil {
			httpx.Err(w, http.StatusInternalServerError, "AUTH_FAILED", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{
			"jwt":  token,
			"user": map[string]any{"id": userID, "email": "operator@foundereum.xyz"},
			"org":  map[string]any{"id": orgID, "name": "Acme Ventures"},
			"role": "owner",
		})
	})

	r.Post("/v1/auth/session", func(w http.ResponseWriter, r *http.Request) {
		userID := uuid.New()
		orgID := uuid.New()
		token, _ := authSvc.IssueToken(userID, orgID, "operator@foundereum.xyz", "owner")
		httpx.JSON(w, http.StatusOK, map[string]any{
			"jwt":  token,
			"user": map[string]any{"id": userID, "email": "operator@foundereum.xyz"},
			"org":  map[string]any{"id": orgID, "name": "Acme Ventures"},
			"role": "owner",
		})
	})

	// Protected routes
	r.Group(func(pr chi.Router) {
		pr.Use(authSvc.Middleware)

		pr.Get("/v1/me", func(w http.ResponseWriter, r *http.Request) {
			claims, _ := auth.GetSession(r.Context())
			httpx.JSON(w, http.StatusOK, map[string]any{
				"user": map[string]any{"id": claims.UserID, "email": claims.Email},
				"org":  map[string]any{"id": claims.OrgID, "name": "Acme Ventures"},
				"role": claims.Role,
			})
		})

		pr.Get("/v1/projects", func(w http.ResponseWriter, r *http.Request) {
			memStore.mu.RLock()
			defer memStore.mu.RUnlock()
			var list []any
			for _, p := range memStore.projects {
				list = append(list, p)
			}
			httpx.JSON(w, http.StatusOK, list)
		})

		pr.Post("/v1/projects", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Name           string `json:"name"`
				Slug           string `json:"slug"`
				PolicyTemplate string `json:"policy_template"`
				Quorum         struct {
					Threshold int `json:"threshold"`
				} `json:"quorum"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				httpx.Err(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
				return
			}
			if req.Slug == "" {
				req.Slug = strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
			}

			projID := uuid.NewString()
			p := map[string]any{
				"id":                      projID,
				"name":                    req.Name,
				"slug":                    req.Slug,
				"status":                  "active",
				"hcs_topic_id":            "0.0.10413602",
				"quorum_threshold":        req.Quorum.Threshold,
				"withdraw_quorum_min_usd": "100.0000000000",
				"created_at":              time.Now().Format(time.RFC3339),
			}

			treasuryWallet, _ := privyClient.CreateServerWallet(r.Context())
			agentWallet, _ := privyClient.CreateServerWallet(r.Context())

			wallets := []map[string]any{
				{
					"id":                uuid.NewString(),
					"kind":              "treasury",
					"evm_address":       treasuryWallet.Address,
					"hedera_account_id": "0.0.10413602",
					"usdc":              "50.000000",
					"hbar":              "20.000000",
					"status":            "ready",
					"hashscan_url":      "https://hashscan.io/testnet/account/0.0.10413602",
				},
				{
					"id":                uuid.NewString(),
					"kind":              "agent",
					"evm_address":       agentWallet.Address,
					"hedera_account_id": "0.0.10413602",
					"usdc":              "10.000000",
					"hbar":              "5.000000",
					"status":            "ready",
					"hashscan_url":      "https://hashscan.io/testnet/account/0.0.10413602",
				},
			}

			memStore.mu.Lock()
			memStore.projects[projID] = p
			memStore.wallets[projID] = wallets
			memStore.policies[projID] = map[string]any{
				"spec":            policy.DefaultSpec(),
				"version":         1,
				"privy_policy_id": "privy_pol_" + projID[:8],
				"pushed_at":       time.Now().Format(time.RFC3339),
			}
			memStore.mu.Unlock()

			httpx.JSON(w, http.StatusCreated, map[string]any{
				"project": p,
				"wallets": wallets,
			})
		})

		pr.Get("/v1/projects/{id}", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			memStore.mu.RLock()
			p, ok := memStore.projects[id]
			wlt := memStore.wallets[id]
			memStore.mu.RUnlock()
			if !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			httpx.JSON(w, http.StatusOK, map[string]any{
				"project":      p,
				"wallets":      wlt,
				"balances_usd": "175.00",
				"spend_24h_usd": "0.00",
				"cap_usd":      "25.00",
				"hcs_topic":    "0.0.10413602",
				"identity":     map[string]any{"scheme": "foundereum.hedera.v1", "agent_id": 1},
			})
		})

		pr.Get("/v1/projects/{id}/wallets", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			memStore.mu.RLock()
			wlts := memStore.wallets[id]
			memStore.mu.RUnlock()
			httpx.JSON(w, http.StatusOK, wlts)
		})

		pr.Post("/v1/projects/{id}/faucet", func(w http.ResponseWriter, r *http.Request) {
			httpx.JSON(w, http.StatusOK, map[string]any{
				"txs": []string{
					"0.0.10413602@faucet_usdc_50",
					"0.0.10413602@faucet_hbar_10",
				},
				"message": "Treasury funded with 50 USDC and 10 HBAR on Hedera testnet",
			})
		})

		pr.Get("/v1/projects/{id}/policy", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			memStore.mu.RLock()
			pol := memStore.policies[id]
			memStore.mu.RUnlock()
			httpx.JSON(w, http.StatusOK, pol)
		})

		pr.Put("/v1/projects/{id}/policy", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			var req struct {
				Spec policy.Spec `json:"spec"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			memStore.mu.Lock()
			memStore.policies[id] = map[string]any{
				"spec":            req.Spec,
				"version":         2,
				"privy_policy_id": "privy_pol_" + id[:8],
				"pushed_at":       time.Now().Format(time.RFC3339),
			}
			memStore.mu.Unlock()
			httpx.JSON(w, http.StatusOK, memStore.policies[id])
		})

		pr.Get("/v1/projects/{id}/keys", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			memStore.mu.RLock()
			keys := memStore.keys[id]
			memStore.mu.RUnlock()
			httpx.JSON(w, http.StatusOK, keys)
		})

		pr.Post("/v1/projects/{id}/keys", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			var req struct {
				Name string `json:"name"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			if req.Name == "" {
				req.Name = "claude-desktop"
			}

			keyBytes := make([]byte, 16)
			_, _ = rand.Read(keyBytes)
			fullKey := "fnd_sk_live_" + hex.EncodeToString(keyBytes)
			prefix := fullKey[:16]

			k := map[string]any{
				"id":           uuid.NewString(),
				"name":         req.Name,
				"prefix":       prefix,
				"status":       "active",
				"carry_usd":    "0.0000000000",
				"last_used_at": nil,
				"created_at":   time.Now().Format(time.RFC3339),
				"key":          fullKey, // Returned once
			}

			memStore.mu.Lock()
			memStore.keys[id] = append(memStore.keys[id], k)
			memStore.mu.Unlock()

			httpx.JSON(w, http.StatusCreated, k)
		})

		pr.Get("/v1/projects/{id}/mcp-config", func(w http.ResponseWriter, r *http.Request) {
			mcpURL := fmt.Sprintf("http://localhost:%d/mcp", cfg.PortMCP)
			httpx.JSON(w, http.StatusOK, map[string]any{
				"http_url": mcpURL,
				"claude_desktop": map[string]any{
					"mcpServers": map[string]any{
						"foundereum": map[string]any{
							"command": "npx",
							"args":    []string{"-y", "foundereum-mcp", "--url", mcpURL},
							"env": map[string]string{
								"FOUNDEREUM_API_KEY": "fnd_sk_live_sample_paste_your_key_here",
							},
						},
					},
				},
			})
		})

		pr.Get("/v1/projects/{id}/calls", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			memStore.mu.RLock()
			calls := memStore.calls[id]
			memStore.mu.RUnlock()
			if len(calls) == 0 {
				calls = []map[string]any{
					{
						"id":           uuid.NewString(),
						"tool":         "analyze_pool_health",
						"status":       "succeeded",
						"estimate_usd": "0.000500",
						"actual_usd":   "0.000528",
						"tx_hash":      "0.0.10413602@1757300000.123456789",
						"latency_ms":   420,
						"started_at":   time.Now().Add(-5 * time.Minute).Format(time.RFC3339),
					},
					{
						"id":           uuid.NewString(),
						"tool":         "swap_tokens",
						"status":       "succeeded",
						"estimate_usd": "0.007500",
						"actual_usd":   "0.007500",
						"tx_hash":      "0x789abcde1234567890abcdef1234567890abcdef1234567890abcdef12345678",
						"latency_ms":   1150,
						"started_at":   time.Now().Add(-2 * time.Minute).Format(time.RFC3339),
					},
				}
			}
			httpx.JSON(w, http.StatusOK, calls)
		})

		pr.Get("/v1/projects/{id}/audit", func(w http.ResponseWriter, r *http.Request) {
			topicID := "0.0.10413602"
			httpx.JSON(w, http.StatusOK, map[string]any{
				"topic_id":     topicID,
				"hashscan_url": "https://hashscan.io/testnet/topic/" + topicID,
				"messages": []map[string]any{
					{
						"seq":   101,
						"ts":    time.Now().Add(-5 * time.Minute).Format(time.RFC3339),
						"tool":  "analyze_pool_health",
						"amount": "500",
						"usd":   "0.0005",
						"payer": "0.0.10413602",
						"tx_id": "0.0.10413602@1757300000.123456789",
					},
					{
						"seq":   102,
						"ts":    time.Now().Add(-2 * time.Minute).Format(time.RFC3339),
						"tool":  "swap_tokens",
						"amount": "7500",
						"usd":   "0.0075",
						"payer": "0.0.10413602",
						"tx_id": "0.0.10413602@1757300120.987654321",
					},
				},
			})
		})

		pr.Get("/v1/projects/{id}/approvals", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			memStore.mu.RLock()
			apps := memStore.approvals[id]
			memStore.mu.RUnlock()
			httpx.JSON(w, http.StatusOK, apps)
		})

		pr.Post("/v1/projects/{id}/withdraw", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			var req struct {
				ToAccount  string `json:"to_account"`
				AmountUSDC string `json:"amount_usdc"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)

			appID := uuid.NewString()
			app := map[string]any{
				"id":         appID,
				"project_id": id,
				"type":       "withdraw",
				"payload":    req,
				"threshold":  2,
				"signatures": []map[string]any{
					{"email": "operator@foundereum.xyz", "at": time.Now().Format(time.RFC3339)},
				},
				"status":     "pending",
				"created_by": "operator@foundereum.xyz",
				"expires_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
			}

			memStore.mu.Lock()
			memStore.approvals[id] = append(memStore.approvals[id], app)
			memStore.mu.Unlock()

			httpx.JSON(w, http.StatusCreated, app)
		})

		pr.Post("/v1/approvals/{id}/approve", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			httpx.JSON(w, http.StatusOK, map[string]any{
				"id":               id,
				"status":           "executed",
				"signatures_count": 2,
				"result_tx_id":     "0.0.10413602@quorum_withdraw_executed",
				"hashscan_url":     "https://hashscan.io/testnet/transaction/0.0.10413602@quorum_withdraw_executed",
			})
		})

		pr.Get("/v1/projects/{id}/events", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/event-stream")
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("Connection", "keep-alive")
			flusher, ok := w.(http.Flusher)
			if !ok {
				http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
				return
			}
			fmt.Fprintf(w, "event: project.ready\ndata: {\"project_id\":\"%s\"}\n\n", chi.URLParam(r, "id"))
			flusher.Flush()
			<-r.Context().Done()
		})
	})

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.PortAPI),
		Handler: r,
	}
	logger.Info("api server listening", "addr", server.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("api server exited", "err", err)
	}
}
