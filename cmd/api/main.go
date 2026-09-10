package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/foundereum/foundereum/internal/auth"
	"github.com/foundereum/foundereum/internal/config"
	db "github.com/foundereum/foundereum/internal/db/gen"
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
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
)

type MemoryStore struct {
	mu        sync.RWMutex
	projects  map[string]map[string]any
	wallets   map[string][]map[string]any
	policies  map[string]map[string]any
	keys      map[string][]map[string]any
	approvals map[string][]map[string]any
	calls     map[string][]map[string]any
	members   map[string][]map[string]any
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		projects:  make(map[string]map[string]any),
		wallets:   make(map[string][]map[string]any),
		policies:  make(map[string]map[string]any),
		keys:      make(map[string][]map[string]any),
		approvals: make(map[string][]map[string]any),
		calls:     make(map[string][]map[string]any),
		members:   make(map[string][]map[string]any),
	}
}

func (s *MemoryStore) getProjectForOrg(projectID string, orgID uuid.UUID) (map[string]any, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.projects[projectID]
	if !ok {
		return nil, false
	}
	pOrg, _ := p["org_id"].(string)
	if pOrg != "" && pOrg != orgID.String() {
		return nil, false
	}
	return p, true
}

func toPgUUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: u, Valid: true}
}

func fromPgUUID(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	id, err := uuid.FromBytes(u.Bytes[:])
	if err != nil {
		return ""
	}
	return id.String()
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

	ctx := context.Background()
	var queries *db.Queries
	var pgPool *pgxpool.Pool

	pgPool, err = pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Warn("postgres not connected, running with in-memory fallback", "err", err)
	} else {
		defer pgPool.Close()
		queries = db.New(pgPool)
		logger.Info("postgres connected for api control plane")
	}

	var rdb *redis.Client
	if redisOpts, err := redis.ParseURL(cfg.RedisURL); err == nil {
		rdb = redis.NewClient(redisOpts)
		defer rdb.Close()
	} else {
		rdb = redis.NewClient(&redis.Options{Addr: strings.TrimPrefix(cfg.RedisURL, "redis://")})
		defer rdb.Close()
	}

	platformAccount := cfg.HederaPlatformAccount
	if platformAccount == "" {
		platformAccount = "0.0.PLATFORM"
	}

	demoProjID := "11111111-1111-1111-1111-111111111111"
	demoOrgID := "00000000-0000-0000-0000-000000000001"
	demoUserID := "00000000-0000-0000-0000-000000000002"

	// Initialize memory store defaults
	memStore.projects[demoProjID] = map[string]any{
		"id":                      demoProjID,
		"org_id":                  demoOrgID,
		"user_id":                 demoUserID,
		"name":                    "market-scout",
		"slug":                    "market-scout",
		"status":                  "active",
		"hcs_topic_id":            platformAccount,
		"quorum_threshold":        2,
		"withdraw_quorum_min_usd": "100.0000000000",
		"created_at":              time.Now().Format(time.RFC3339),
	}
	memStore.wallets[demoProjID] = []map[string]any{
		{
			"id":                uuid.NewString(),
			"kind":              "treasury",
			"evm_address":       "0x0000000000000000000000000000000000000000",
			"hedera_account_id": platformAccount,
			"usdc":              "150.000000",
			"hbar":              "50.000000",
			"status":            "ready",
			"hashscan_url":      fmt.Sprintf("https://hashscan.io/%s/account/%s", cfg.HederaNetwork, platformAccount),
		},
		{
			"id":                uuid.NewString(),
			"kind":              "agent",
			"evm_address":       "0x0000000000000000000000000000000000000000",
			"hedera_account_id": platformAccount,
			"usdc":              "25.000000",
			"hbar":              "10.000000",
			"status":            "ready",
			"hashscan_url":      fmt.Sprintf("https://hashscan.io/%s/account/%s", cfg.HederaNetwork, platformAccount),
		},
	}
	memStore.policies[demoProjID] = map[string]any{
		"spec":            policy.DefaultSpecWithPayTo(platformAccount),
		"version":         1,
		"privy_policy_id": "privy_pol_mock_market_scout",
		"pushed_at":       time.Now().Format(time.RFC3339),
	}
	memStore.members[demoOrgID] = []map[string]any{
		{
			"email":  "operator@foundereum.org",
			"role":   "owner",
			"status": "active",
		},
	}

	// Seed database if connected
	if queries != nil {
		demoOrgUUID, _ := uuid.Parse(demoOrgID)
		demoUserUUID, _ := uuid.Parse(demoUserID)
		demoProjUUID, _ := uuid.Parse(demoProjID)

		_, _ = queries.UpsertUser(ctx, db.UpsertUserParams{
			PrivyDid: "did:privy:demo-operator",
			Email:    pgtype.Text{String: "operator@foundereum.org", Valid: true},
		})
		_, _ = queries.CreateOrg(ctx, "Acme Ventures")

		// Create demo project if not exists
		_, err := queries.GetProject(ctx, toPgUUID(demoProjUUID))
		if err != nil {
			minUSD := ledger.ToPgNumeric(decimal.RequireFromString("100"))
			_, _ = queries.CreateProject(ctx, db.CreateProjectParams{
				OrgID:                toPgUUID(demoOrgUUID),
				Slug:                 "market-scout",
				Name:                 "market-scout",
				Status:               "active",
				HcsTopicID:           pgtype.Text{String: platformAccount, Valid: true},
				QuorumThreshold:      2,
				WithdrawQuorumMinUsd: minUSD,
			})
			_ = demoUserUUID
		}
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

	// Metrics endpoint
	r.Handle("/metrics", httpx.MetricsHandler())
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "foundereum-api"})
	})

	// Public Services Directory
	servicesHandler := func(w http.ResponseWriter, r *http.Request) {
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
	}
	r.Get("/services", servicesHandler)
	r.Get("/v1/services", servicesHandler)

	// Auth session & dev login
	r.Post("/v1/auth/dev", func(w http.ResponseWriter, r *http.Request) {
		userID := uuid.New()
		orgID, _ := uuid.Parse(demoOrgID)
		token, err := authSvc.IssueToken(userID, orgID, "operator@foundereum.org", "owner")
		if err != nil {
			httpx.Err(w, http.StatusInternalServerError, "AUTH_FAILED", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{
			"jwt":  token,
			"user": map[string]any{"id": userID, "email": "operator@foundereum.org"},
			"org":  map[string]any{"id": orgID, "name": "Acme Ventures"},
			"role": "owner",
		})
	})

	r.Post("/v1/auth/session", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email string `json:"email"`
			Role  string `json:"role"`
			Org   string `json:"org"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		
		email := "operator@foundereum.org"
		if req.Email != "" {
			email = strings.ToLower(strings.TrimSpace(req.Email))
		}
		role := "owner"
		if req.Role != "" {
			role = req.Role
		}
		orgName := "Workspace"
		if req.Org != "" {
			orgName = req.Org
		}

		userNamespace := uuid.MustParse("e0f4a240-8f92-491c-b8e7-8b0123456789")
		var userID, orgID uuid.UUID
		if email == "operator@foundereum.org" {
			userID, _ = uuid.Parse(demoUserID)
			orgID, _ = uuid.Parse(demoOrgID)
			orgName = "Acme Ventures"
		} else {
			userID = uuid.NewSHA1(userNamespace, []byte("user:"+email))
			orgID = uuid.NewSHA1(userNamespace, []byte("org:"+email))
		}

		token, err := authSvc.IssueToken(userID, orgID, email, role)
		if err != nil {
			httpx.Err(w, http.StatusInternalServerError, "AUTH_FAILED", err.Error())
			return
		}

		if queries != nil {
			_, _ = queries.UpsertUser(r.Context(), db.UpsertUserParams{
				PrivyDid: "did:privy:" + email,
				Email:    pgtype.Text{String: email, Valid: true},
			})
		}

		httpx.JSON(w, http.StatusOK, map[string]any{
			"jwt":  token,
			"user": map[string]any{"id": userID, "email": email},
			"org":  map[string]any{"id": orgID, "name": orgName},
			"role": role,
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

		// Organization members (Doc 06 §1)
		pr.Get("/v1/orgs/{id}/members", func(w http.ResponseWriter, r *http.Request) {
			orgID := chi.URLParam(r, "id")
			memStore.mu.RLock()
			mems := memStore.members[orgID]
			memStore.mu.RUnlock()
			if len(mems) == 0 {
				mems = []map[string]any{
					{"email": "operator@foundereum.org", "role": "owner", "status": "active"},
				}
			}
			httpx.JSON(w, http.StatusOK, mems)
		})

		pr.Post("/v1/orgs/{id}/members", func(w http.ResponseWriter, r *http.Request) {
			orgID := chi.URLParam(r, "id")
			var req struct {
				Email string `json:"email"`
				Role  string `json:"role"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
				httpx.Err(w, http.StatusBadRequest, "INVALID_REQUEST", "email is required")
				return
			}
			if req.Role == "" {
				req.Role = "approver"
			}
			newMem := map[string]any{
				"email":  req.Email,
				"role":   req.Role,
				"status": "invited",
			}
			memStore.mu.Lock()
			memStore.members[orgID] = append(memStore.members[orgID], newMem)
			memStore.mu.Unlock()
			httpx.JSON(w, http.StatusCreated, newMem)
		})

		pr.Post("/v1/orgs/{id}/members/me/auth-key", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Pubkey string `json:"pubkey"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			httpx.JSON(w, http.StatusOK, map[string]any{
				"status": "registered",
				"pubkey": req.Pubkey,
			})
		})

		pr.Get("/v1/projects", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := auth.GetSession(r.Context())
			if !ok {
				httpx.Err(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid session")
				return
			}
			memStore.mu.Lock()
			defer memStore.mu.Unlock()

			orgIDStr := claims.OrgID.String()
			var list []any
			for _, p := range memStore.projects {
				pOrg, _ := p["org_id"].(string)
				if pOrg == orgIDStr || (pOrg == "" && orgIDStr == demoOrgID) {
					list = append(list, p)
				}
			}

			// If the user's organization has no projects yet, auto-provision starter project
			if len(list) == 0 {
				projID := uuid.NewString()
				starterProj := map[string]any{
					"id":                      projID,
					"org_id":                  orgIDStr,
					"user_id":                 claims.UserID.String(),
					"name":                    "market-scout",
					"slug":                    "market-scout",
					"status":                  "active",
					"hcs_topic_id":            platformAccount,
					"quorum_threshold":        2,
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
						"hedera_account_id": platformAccount,
						"usdc":              "50.000000",
						"hbar":              "20.000000",
						"status":            "ready",
						"hashscan_url":      fmt.Sprintf("https://hashscan.io/%s/account/%s", cfg.HederaNetwork, platformAccount),
					},
					{
						"id":                uuid.NewString(),
						"kind":              "agent",
						"evm_address":       agentWallet.Address,
						"hedera_account_id": platformAccount,
						"usdc":              "10.000000",
						"hbar":              "5.000000",
						"status":            "ready",
						"hashscan_url":      fmt.Sprintf("https://hashscan.io/%s/account/%s", cfg.HederaNetwork, platformAccount),
					},
				}
				memStore.projects[projID] = starterProj
				memStore.wallets[projID] = wallets
				memStore.policies[projID] = map[string]any{
					"spec":            policy.DefaultSpecWithPayTo(platformAccount),
					"version":         1,
					"privy_policy_id": "privy_pol_" + projID[:8],
					"pushed_at":       time.Now().Format(time.RFC3339),
				}

				if queries != nil {
					pUUID, _ := uuid.Parse(projID)
					minUSD := ledger.ToPgNumeric(decimal.RequireFromString("100"))
					_, _ = queries.CreateProject(r.Context(), db.CreateProjectParams{
						OrgID:                toPgUUID(claims.OrgID),
						Slug:                 "market-scout",
						Name:                 "market-scout",
						Status:               "active",
						HcsTopicID:           pgtype.Text{String: platformAccount, Valid: true},
						QuorumThreshold:      2,
						WithdrawQuorumMinUsd: minUSD,
					})
					_, _ = queries.CreateWallet(r.Context(), db.CreateWalletParams{
						ProjectID:       toPgUUID(pUUID),
						Kind:            "treasury",
						Custody:         "privy",
						PrivyWalletID:   pgtype.Text{String: treasuryWallet.ID, Valid: treasuryWallet.ID != ""},
						EvmAddress:      treasuryWallet.Address,
						HederaAccountID: pgtype.Text{String: platformAccount, Valid: true},
						Status:          "ready",
					})
					_, _ = queries.CreateWallet(r.Context(), db.CreateWalletParams{
						ProjectID:       toPgUUID(pUUID),
						Kind:            "agent",
						Custody:         "privy",
						PrivyWalletID:   pgtype.Text{String: agentWallet.ID, Valid: agentWallet.ID != ""},
						EvmAddress:      agentWallet.Address,
						HederaAccountID: pgtype.Text{String: platformAccount, Valid: true},
						Status:          "ready",
					})
					specBytes, _ := json.Marshal(policy.DefaultSpecWithPayTo(platformAccount))
					_, _ = queries.UpsertPolicy(r.Context(), db.UpsertPolicyParams{
						ProjectID:     toPgUUID(pUUID),
						Spec:          specBytes,
						PrivyPolicyID: pgtype.Text{String: "privy_pol_" + projID[:8], Valid: true},
						Version:       1,
						PushedAt:      pgtype.Timestamptz{Time: time.Now(), Valid: true},
					})
				}

				list = append(list, starterProj)
			}
			httpx.JSON(w, http.StatusOK, list)
		})

		pr.Post("/v1/projects", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := auth.GetSession(r.Context())
			if !ok {
				httpx.Err(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid session")
				return
			}
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
			if req.Quorum.Threshold <= 0 {
				req.Quorum.Threshold = 2
			}

			projID := uuid.NewString()
			p := map[string]any{
				"id":                      projID,
				"org_id":                  claims.OrgID.String(),
				"user_id":                 claims.UserID.String(),
				"name":                    req.Name,
				"slug":                    req.Slug,
				"status":                  "active",
				"hcs_topic_id":            platformAccount,
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
					"hedera_account_id": platformAccount,
					"usdc":              "50.000000",
					"hbar":              "20.000000",
					"status":            "ready",
					"hashscan_url":      fmt.Sprintf("https://hashscan.io/%s/account/%s", cfg.HederaNetwork, platformAccount),
				},
				{
					"id":                uuid.NewString(),
					"kind":              "agent",
					"evm_address":       agentWallet.Address,
					"hedera_account_id": platformAccount,
					"usdc":              "10.000000",
					"hbar":              "5.000000",
					"status":            "ready",
					"hashscan_url":      fmt.Sprintf("https://hashscan.io/%s/account/%s", cfg.HederaNetwork, platformAccount),
				},
			}

			memStore.mu.Lock()
			memStore.projects[projID] = p
			memStore.wallets[projID] = wallets
			memStore.policies[projID] = map[string]any{
				"spec":            policy.DefaultSpecWithPayTo(platformAccount),
				"version":         1,
				"privy_policy_id": "privy_pol_" + projID[:8],
				"pushed_at":       time.Now().Format(time.RFC3339),
			}
			memStore.mu.Unlock()

			if queries != nil {
				pUUID, _ := uuid.Parse(projID)
				minUSD := ledger.ToPgNumeric(decimal.RequireFromString("100"))
				_, _ = queries.CreateProject(r.Context(), db.CreateProjectParams{
					OrgID:                toPgUUID(claims.OrgID),
					Slug:                 req.Slug,
					Name:                 req.Name,
					Status:               "active",
					HcsTopicID:           pgtype.Text{String: platformAccount, Valid: true},
					QuorumThreshold:      int16(req.Quorum.Threshold),
					WithdrawQuorumMinUsd: minUSD,
				})
				_, _ = queries.CreateWallet(r.Context(), db.CreateWalletParams{
					ProjectID:       toPgUUID(pUUID),
					Kind:            "treasury",
					Custody:         "privy",
					PrivyWalletID:   pgtype.Text{String: treasuryWallet.ID, Valid: treasuryWallet.ID != ""},
					EvmAddress:      treasuryWallet.Address,
					HederaAccountID: pgtype.Text{String: platformAccount, Valid: true},
					Status:          "ready",
				})
				_, _ = queries.CreateWallet(r.Context(), db.CreateWalletParams{
					ProjectID:       toPgUUID(pUUID),
					Kind:            "agent",
					Custody:         "privy",
					PrivyWalletID:   pgtype.Text{String: agentWallet.ID, Valid: agentWallet.ID != ""},
					EvmAddress:      agentWallet.Address,
					HederaAccountID: pgtype.Text{String: platformAccount, Valid: true},
					Status:          "ready",
				})
				specBytes, _ := json.Marshal(policy.DefaultSpecWithPayTo(platformAccount))
				_, _ = queries.UpsertPolicy(r.Context(), db.UpsertPolicyParams{
					ProjectID:     toPgUUID(pUUID),
					Spec:          specBytes,
					PrivyPolicyID: pgtype.Text{String: "privy_pol_" + projID[:8], Valid: true},
					Version:       1,
					PushedAt:      pgtype.Timestamptz{Time: time.Now(), Valid: true},
				})
			}

			httpx.JSON(w, http.StatusCreated, map[string]any{
				"project": p,
				"wallets": wallets,
			})
		})

		pr.Get("/v1/projects/{id}", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			p, ok := memStore.getProjectForOrg(id, claims.OrgID)
			if !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			memStore.mu.RLock()
			wlt := memStore.wallets[id]
			pol := memStore.policies[id]
			calls := memStore.calls[id]
			memStore.mu.RUnlock()

			// Dynamically sum USDC across all wallets of this project
			totalUSDC := decimal.Zero
			for _, w := range wlt {
				if usdcStr, ok := w["usdc"].(string); ok {
					if d, err := decimal.NewFromString(usdcStr); err == nil {
						totalUSDC = totalUSDC.Add(d)
					}
				}
			}

			// Calculate 24h spend
			spend24h := decimal.Zero
			if queries != nil {
				if pUUID, err := uuid.Parse(id); err == nil {
					if s, err := queries.SpendLast24h(r.Context(), toPgUUID(pUUID)); err == nil {
						spend24h = ledger.FromPgNumeric(s)
					}
				}
			}
			if spend24h.IsZero() && len(calls) > 0 {
				now := time.Now()
				for _, c := range calls {
					if st, ok := c["status"].(string); ok && (st == "succeeded" || st == "settled" || st == "paid") {
						startedAtStr, _ := c["started_at"].(string)
						if t, err := time.Parse(time.RFC3339, startedAtStr); err == nil {
							if now.Sub(t) <= 24*time.Hour {
								amtStr := fmt.Sprintf("%v", c["actual_usd"])
								if amtStr == "" || amtStr == "<nil>" {
									amtStr = fmt.Sprintf("%v", c["estimate_usd"])
								}
								if d, err := decimal.NewFromString(amtStr); err == nil {
									spend24h = spend24h.Add(d)
								}
							}
						}
					}
				}
			}

			// Dynamic cap from policy
			capUSD := "25.00"
			if pol != nil {
				if spec, ok := pol["spec"].(policy.Spec); ok && spec.Velocity.MaxUSDPer24h != "" {
					capUSD = spec.Velocity.MaxUSDPer24h
				} else if specMap, ok := pol["spec"].(map[string]any); ok {
					if m, ok := specMap["max_daily_usd"].(string); ok && m != "" {
						capUSD = m
					} else if vel, ok := specMap["velocity"].(map[string]any); ok {
						if m2, ok := vel["max_usd_per_24h"].(string); ok && m2 != "" {
							capUSD = m2
						}
					}
				}
			}

			hcsTopic := platformAccount
			if h, ok := p["hcs_topic_id"].(string); ok && h != "" {
				hcsTopic = h
			}

			httpx.JSON(w, http.StatusOK, map[string]any{
				"project":       p,
				"wallets":       wlt,
				"balances_usd":  totalUSDC.StringFixed(2),
				"spend_24h_usd": spend24h.StringFixed(2),
				"cap_usd":       capUSD,
				"hcs_topic":     hcsTopic,
				"identity":      map[string]any{"scheme": "foundereum.hedera.v1", "agent_id": 1},
			})
		})

		pr.Get("/v1/projects/{id}/wallets", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			memStore.mu.RLock()
			wlts := memStore.wallets[id]
			memStore.mu.RUnlock()
			httpx.JSON(w, http.StatusOK, wlts)
		})

		pr.Post("/v1/projects/{id}/faucet", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			memStore.mu.Lock()
			for _, wlt := range memStore.wallets[id] {
				if wlt["kind"] == "treasury" {
					currUSDC, _ := decimal.NewFromString(fmt.Sprintf("%v", wlt["usdc"]))
					currHBAR, _ := decimal.NewFromString(fmt.Sprintf("%v", wlt["hbar"]))
					wlt["usdc"] = currUSDC.Add(decimal.NewFromInt(50)).StringFixed(6)
					wlt["hbar"] = currHBAR.Add(decimal.NewFromInt(10)).StringFixed(6)
				}
			}
			memStore.mu.Unlock()

			if rdb != nil {
				msg, _ := json.Marshal(map[string]any{
					"type":       "wallet.balance",
					"project_id": id,
					"action":     "faucet",
					"message":    "Treasury funded with 50 USDC and 10 HBAR",
				})
				_ = rdb.Publish(r.Context(), "events:project:"+id, msg).Err()
			}
			httpx.JSON(w, http.StatusOK, map[string]any{
				"txs": []string{
					fmt.Sprintf("%s@faucet_usdc_50", platformAccount),
					fmt.Sprintf("%s@faucet_hbar_10", platformAccount),
				},
				"message": fmt.Sprintf("Treasury funded with 50 USDC and 10 HBAR on %s", cfg.HederaNetwork),
			})
		})

		// Treasury to Agent topup (Doc 06 §1)
		pr.Post("/v1/projects/{id}/topup", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			var req struct {
				AmountUSDC string `json:"amount_usdc"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			if req.AmountUSDC == "" {
				req.AmountUSDC = "10.000000"
			}
			topupAmt, err := decimal.NewFromString(req.AmountUSDC)
			if err != nil || topupAmt.LessThanOrEqual(decimal.Zero) {
				httpx.Err(w, http.StatusBadRequest, "INVALID_AMOUNT", "amount must be positive")
				return
			}

			memStore.mu.Lock()
			var treasuryW, agentW map[string]any
			for _, wlt := range memStore.wallets[id] {
				if wlt["kind"] == "treasury" {
					treasuryW = wlt
				} else if wlt["kind"] == "agent" {
					agentW = wlt
				}
			}

			if treasuryW != nil && agentW != nil {
				tUSDC, _ := decimal.NewFromString(fmt.Sprintf("%v", treasuryW["usdc"]))
				if tUSDC.LessThan(topupAmt) {
					memStore.mu.Unlock()
					httpx.Err(w, http.StatusBadRequest, "INSUFFICIENT_FUNDS", "treasury balance is insufficient for top-up")
					return
				}
				aUSDC, _ := decimal.NewFromString(fmt.Sprintf("%v", agentW["usdc"]))
				treasuryW["usdc"] = tUSDC.Sub(topupAmt).StringFixed(6)
				agentW["usdc"] = aUSDC.Add(topupAmt).StringFixed(6)
			}
			memStore.mu.Unlock()

			if rdb != nil {
				msg, _ := json.Marshal(map[string]any{
					"type":        "wallet.balance",
					"project_id":  id,
					"action":      "topup",
					"amount_usdc": req.AmountUSDC,
				})
				_ = rdb.Publish(r.Context(), "events:project:"+id, msg).Err()
			}
			httpx.JSON(w, http.StatusOK, map[string]any{
				"status":      "transferred",
				"project_id":  id,
				"amount_usdc": req.AmountUSDC,
				"tx_id":       fmt.Sprintf("%s@topup_agent", platformAccount),
			})
		})

		pr.Get("/v1/projects/{id}/policy", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			memStore.mu.RLock()
			pol := memStore.policies[id]
			memStore.mu.RUnlock()
			httpx.JSON(w, http.StatusOK, pol)
		})

		pr.Put("/v1/projects/{id}/policy", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			var req struct {
				Spec policy.Spec `json:"spec"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			memStore.mu.Lock()
			defer memStore.mu.Unlock()

			curVer := 2
			if cur, ok := memStore.policies[id]; ok {
				if v, ok := cur["version"].(int); ok {
					curVer = v + 1
				}
			}
			polID := "privy_pol_" + id[:8]
			now := time.Now()
			memStore.policies[id] = map[string]any{
				"spec":            req.Spec,
				"version":         curVer,
				"privy_policy_id": polID,
				"pushed_at":       now.Format(time.RFC3339),
			}
			if queries != nil {
				if pUUID, err := uuid.Parse(id); err == nil {
					specBytes, _ := json.Marshal(req.Spec)
					_, _ = queries.UpsertPolicy(r.Context(), db.UpsertPolicyParams{
						ProjectID:     toPgUUID(pUUID),
						Spec:          specBytes,
						PrivyPolicyID: pgtype.Text{String: polID, Valid: true},
						Version:       int32(curVer),
						PushedAt:      pgtype.Timestamptz{Time: now, Valid: true},
					})
				}
			}
			httpx.JSON(w, http.StatusOK, memStore.policies[id])
		})

		// Push policy to Privy TEE Enclave (Feature 1.4 / Doc 06 / Doc 08 §3)
		pr.Post("/v1/projects/{id}/policy/push", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}

			memStore.mu.Lock()
			defer memStore.mu.Unlock()

			var req struct {
				Spec *policy.Spec `json:"spec,omitempty"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)

			curPol, exists := memStore.policies[id]
			if !exists {
				defSpec := policy.DefaultSpecWithPayTo(platformAccount)
				curPol = map[string]any{
					"spec":            defSpec,
					"version":         1,
					"privy_policy_id": "privy_pol_" + id[:8],
					"pushed_at":       time.Now().Format(time.RFC3339),
				}
			}

			if req.Spec != nil {
				curPol["spec"] = *req.Spec
			}

			privyPolicyID := "privy_pol_" + id[:8]
			if privyClient != nil {
				if pid, err := privyClient.PushPolicy(r.Context(), "fnd-policy-"+id, nil); err == nil && pid != "" {
					privyPolicyID = pid
				} else if err != nil {
					logger.Warn("privy policy push error, using standard identifier", "err", err)
				}
			}

			curVer := 1
			if v, ok := curPol["version"].(int); ok {
				curVer = v + 1
			}
			now := time.Now()
			curPol["privy_policy_id"] = privyPolicyID
			curPol["version"] = curVer
			curPol["pushed_at"] = now.Format(time.RFC3339)
			memStore.policies[id] = curPol

			if queries != nil {
				if pUUID, err := uuid.Parse(id); err == nil {
					specBytes, _ := json.Marshal(curPol["spec"])
					_, _ = queries.UpsertPolicy(r.Context(), db.UpsertPolicyParams{
						ProjectID:     toPgUUID(pUUID),
						Spec:          specBytes,
						PrivyPolicyID: pgtype.Text{String: privyPolicyID, Valid: true},
						Version:       int32(curVer),
						PushedAt:      pgtype.Timestamptz{Time: now, Valid: true},
					})
				}
			}

			httpx.JSON(w, http.StatusOK, map[string]any{
				"privy_policy_id": privyPolicyID,
				"version":         curVer,
				"pushed_at":       now.Format(time.RFC3339),
				"status":          "pushed",
			})
		})

		pr.Get("/v1/projects/{id}/keys", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			memStore.mu.RLock()
			rawKeys := memStore.keys[id]
			memStore.mu.RUnlock()

			// Defense-in-depth: Never return the secret key
			safeKeys := make([]map[string]any, 0, len(rawKeys))
			for _, rk := range rawKeys {
				sk := make(map[string]any)
				for kf, vf := range rk {
					if kf != "key" {
						sk[kf] = vf
					}
				}
				safeKeys = append(safeKeys, sk)
			}
			httpx.JSON(w, http.StatusOK, safeKeys)
		})

		pr.Post("/v1/projects/{id}/keys", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			var req struct {
				Name string `json:"name"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			if req.Name == "" {
				req.Name = "claude-desktop"
			}

			// Minimum funding guardrail (Doc 03 §W3 / Feature 1.11)
			memStore.mu.RLock()
			wallets := memStore.wallets[id]
			memStore.mu.RUnlock()
			hasFunding := true
			for _, wlt := range wallets {
				if wlt["kind"] == "agent" {
					if usdcStr, ok := wlt["usdc"].(string); ok && usdcStr == "0.000000" {
						hasFunding = false
					}
				}
			}
			if !hasFunding {
				httpx.Err(w, http.StatusPaymentRequired, "TREASURY_UNDERFUNDED", "agent wallet requires minimum funding balance before API key issuance")
				return
			}

			fullKey, err := auth.GenerateAPIKey(true)
			if err != nil {
				httpx.Err(w, http.StatusInternalServerError, "KEY_GEN_FAILED", err.Error())
				return
			}
			prefix := fullKey[:16]
			keyHash := auth.HashAPIKey(fullKey)
			keyID := uuid.NewString()

			// Storage record NEVER stores plaintext key
			k := map[string]any{
				"id":           keyID,
				"name":         req.Name,
				"prefix":       prefix,
				"status":       "active",
				"carry_usd":    "0.0000000000",
				"last_used_at": nil,
				"created_at":   time.Now().Format(time.RFC3339),
			}

			memStore.mu.Lock()
			memStore.keys[id] = append(memStore.keys[id], k)
			memStore.mu.Unlock()

			if queries != nil {
				var agentWalletID uuid.UUID
				for _, wlt := range wallets {
					if wlt["kind"] == "agent" {
						if widStr, ok := wlt["id"].(string); ok {
							agentWalletID, _ = uuid.Parse(widStr)
						}
					}
				}
				if pUUID, err := uuid.Parse(id); err == nil {
					_, _ = queries.CreateAPIKey(r.Context(), db.CreateAPIKeyParams{
						ProjectID: toPgUUID(pUUID),
						WalletID:  toPgUUID(agentWalletID),
						Name:      req.Name,
						Prefix:    prefix,
						KeyHash:   keyHash,
						Status:    "active",
					})
				}
			}

			if rdb != nil {
				khHex := hex.EncodeToString(keyHash[:])
				keyCtxData, _ := json.Marshal(map[string]any{
					"key_id":            keyID,
					"project_id":        id,
					"hedera_account_id": platformAccount,
					"evm_address":       "0x0000000000000000000000000000000000000000",
					"status":            "active",
				})
				_ = rdb.Set(r.Context(), "key_ctx:"+khHex, keyCtxData, 0).Err()
			}

			resp := make(map[string]any)
			for kf, vf := range k {
				resp[kf] = vf
			}
			resp["key"] = fullKey // Returned EXACTLY ONCE upon creation
			httpx.JSON(w, http.StatusCreated, resp)
		})

		// API Key Revocation (Feature 1.9 / Doc 08 §1)
		pr.Delete("/v1/projects/{id}/keys/{key_id}", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			keyID := chi.URLParam(r, "key_id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			memStore.mu.Lock()
			for _, k := range memStore.keys[id] {
				if k["id"] == keyID {
					k["status"] = "revoked"
					delete(k, "key")
				}
			}
			memStore.mu.Unlock()
			httpx.JSON(w, http.StatusOK, map[string]any{"status": "revoked", "id": keyID})
		})

		// API Key Rotation with 1-Hour Grace Window (Feature 1.8 / Doc 08 §5)
		pr.Post("/v1/projects/{id}/keys/{key_id}/rotate", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			keyID := chi.URLParam(r, "key_id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}

			memStore.mu.Lock()
			defer memStore.mu.Unlock()

			var oldKey map[string]any
			for _, k := range memStore.keys[id] {
				if k["id"] == keyID && k["status"] == "active" {
					oldKey = k
					break
				}
			}

			if oldKey == nil {
				httpx.Err(w, http.StatusNotFound, "KEY_NOT_FOUND", "active key not found for rotation")
				return
			}

			// Mark old key for retirement with 1-hour grace window
			graceExpiresAt := time.Now().Add(1 * time.Hour).Format(time.RFC3339)
			oldKey["status"] = "retiring"
			oldKey["grace_expires_at"] = graceExpiresAt
			delete(oldKey, "key")

			// Generate new key
			newFullKey, err := auth.GenerateAPIKey(true)
			if err != nil {
				httpx.Err(w, http.StatusInternalServerError, "KEY_GEN_FAILED", err.Error())
				return
			}
			newKeyID := uuid.NewString()
			name := "rotated-key"
			if oldName, ok := oldKey["name"].(string); ok {
				name = oldName + "-rotated"
			}
			newPrefix := newFullKey[:16]
			newKeyHash := auth.HashAPIKey(newFullKey)

			newK := map[string]any{
				"id":           newKeyID,
				"name":         name,
				"prefix":       newPrefix,
				"status":       "active",
				"carry_usd":    "0.0000000000",
				"last_used_at": nil,
				"created_at":   time.Now().Format(time.RFC3339),
			}
			memStore.keys[id] = append(memStore.keys[id], newK)

			if queries != nil {
				var agentWalletID uuid.UUID
				for _, wlt := range memStore.wallets[id] {
					if wlt["kind"] == "agent" {
						if widStr, ok := wlt["id"].(string); ok {
							agentWalletID, _ = uuid.Parse(widStr)
						}
					}
				}
				if pUUID, err := uuid.Parse(id); err == nil {
					_, _ = queries.CreateAPIKey(r.Context(), db.CreateAPIKeyParams{
						ProjectID: toPgUUID(pUUID),
						WalletID:  toPgUUID(agentWalletID),
						Name:      name,
						Prefix:    newPrefix,
						KeyHash:   newKeyHash,
						Status:    "active",
					})
				}
			}

			if rdb != nil {
				khHex := hex.EncodeToString(newKeyHash[:])
				keyCtxData, _ := json.Marshal(map[string]any{
					"key_id":            newKeyID,
					"project_id":        id,
					"hedera_account_id": platformAccount,
					"evm_address":       "0x0000000000000000000000000000000000000000",
					"status":            "active",
				})
				_ = rdb.Set(r.Context(), "key_ctx:"+khHex, keyCtxData, 0).Err()
			}

			httpx.JSON(w, http.StatusOK, map[string]any{
				"new_key": map[string]any{
					"id":         newKeyID,
					"name":       name,
					"prefix":     newPrefix,
					"key":        newFullKey, // Returned ONCE
					"status":     "active",
					"created_at": newK["created_at"],
				},
				"retired_key": map[string]any{
					"id":                  keyID,
					"status":              "retiring",
					"grace_period_window": "1h",
					"grace_expires_at":    graceExpiresAt,
				},
			})
		})

		pr.Get("/v1/projects/{id}/mcp-config", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			host := r.Host
			mcpURL := fmt.Sprintf("http://localhost:%d/mcp", cfg.PortMCP)
			if strings.Contains(host, "foundereum.org") {
				mcpURL = "https://mcp.foundereum.org/mcp"
			} else if strings.Contains(host, "foundereum.com") {
				mcpURL = "https://mcp.foundereum.com/mcp"
			}
			httpx.JSON(w, http.StatusOK, map[string]any{
				"http_url": mcpURL,
				"claude_desktop": map[string]any{
					"mcpServers": map[string]any{
						"foundereum": map[string]any{
							"command": "npx",
							"args":    []string{"-y", "foundereum-mcp", "--url", mcpURL},
							"env": map[string]string{
								"FOUNDEREUM_API_KEY": "fnd_sk_live_paste_your_key_here",
							},
						},
					},
				},
			})
		})

		pr.Get("/v1/projects/{id}/calls", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			if queries != nil {
				pUUID, err := uuid.Parse(id)
				if err == nil {
					dbCalls, err := queries.GetCallsByProject(r.Context(), db.GetCallsByProjectParams{
						ProjectID: toPgUUID(pUUID),
						Limit:     50,
						Offset:    0,
					})
					if err == nil && len(dbCalls) > 0 {
						var resCalls []map[string]any
						for _, c := range dbCalls {
							var argsMap map[string]any
							if len(c.Args) > 0 {
								_ = json.Unmarshal(c.Args, &argsMap)
							}
							resCalls = append(resCalls, map[string]any{
								"id":            c.ID.String(),
								"tool":          c.Tool,
								"status":        c.Status,
								"estimate_usd":  ledger.FromPgNumeric(c.EstimateUsd).StringFixed(6),
								"actual_usd":    ledger.FromPgNumeric(c.ActualUsd).StringFixed(6),
								"tx_hash":       c.TxHash.String,
								"latency_ms":    c.LatencyMs.Int32,
								"started_at":    c.StartedAt.Time.Format(time.RFC3339),
								"args":          argsMap,
								"metered_bytes": c.MeteredBytes.Int32,
							})
						}
						httpx.JSON(w, http.StatusOK, resCalls)
						return
					}
				}
			}

			memStore.mu.RLock()
			calls := memStore.calls[id]
			memStore.mu.RUnlock()
			if calls == nil {
				calls = []map[string]any{}
			}
			httpx.JSON(w, http.StatusOK, calls)
		})

		pr.Get("/v1/projects/{id}/audit", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			topicID := platformAccount

			if queries != nil {
				pUUID, err := uuid.Parse(id)
				if err == nil {
					if proj, err := queries.GetProject(r.Context(), toPgUUID(pUUID)); err == nil && proj.HcsTopicID.Valid {
						topicID = proj.HcsTopicID.String
					}
				}
			}

			var msgs []map[string]any
			if queries != nil {
				pUUID, err := uuid.Parse(id)
				if err == nil {
					payments, err := queries.GetPaymentsByProject(r.Context(), db.GetPaymentsByProjectParams{
						ProjectID: toPgUUID(pUUID),
						Limit:     50,
					})
					if err == nil {
						for _, p := range payments {
							if p.HcsSeq.Valid {
								msgs = append(msgs, map[string]any{
									"seq":    p.HcsSeq.Int64,
									"ts":     p.SettledAt.Time.Format(time.RFC3339),
									"tool":   p.Asset,
									"amount": ledger.FromPgNumeric(p.Amount).StringFixed(6),
									"usd":    ledger.FromPgNumeric(p.AmountUsd).StringFixed(4),
									"payer":  platformAccount,
									"tx_id":  p.HederaTxID.String,
								})
							}
						}
					}
				}
			}

			if msgs == nil {
				msgs = []map[string]any{}
			}

			httpx.JSON(w, http.StatusOK, map[string]any{
				"topic_id":     topicID,
				"hashscan_url": fmt.Sprintf("https://hashscan.io/%s/topic/%s", cfg.HederaNetwork, topicID),
				"messages":     msgs,
			})
		})

		pr.Get("/v1/projects/{id}/approvals", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			memStore.mu.RLock()
			apps := memStore.approvals[id]
			memStore.mu.RUnlock()
			httpx.JSON(w, http.StatusOK, apps)
		})

		pr.Post("/v1/projects/{id}/withdraw", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(id, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			var req struct {
				ToAccount  string `json:"to_account"`
				AmountUSDC string `json:"amount_usdc"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				httpx.Err(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
				return
			}
			if req.AmountUSDC == "" {
				req.AmountUSDC = "50.000000"
			}
			wAmt, err := decimal.NewFromString(req.AmountUSDC)
			if err != nil || wAmt.LessThanOrEqual(decimal.Zero) {
				httpx.Err(w, http.StatusBadRequest, "INVALID_AMOUNT", "amount must be positive")
				return
			}

			memStore.mu.Lock()
			defer memStore.mu.Unlock()

			// Verify treasury has enough funds
			var treasuryW map[string]any
			for _, wlt := range memStore.wallets[id] {
				if wlt["kind"] == "treasury" {
					treasuryW = wlt
					break
				}
			}
			if treasuryW == nil {
				httpx.Err(w, http.StatusBadRequest, "WALLET_NOT_FOUND", "treasury wallet not found")
				return
			}
			tUSDC, _ := decimal.NewFromString(fmt.Sprintf("%v", treasuryW["usdc"]))
			if tUSDC.LessThan(wAmt) {
				httpx.Err(w, http.StatusBadRequest, "INSUFFICIENT_FUNDS", "treasury USDC balance insufficient for withdrawal")
				return
			}

			p := memStore.projects[id]
			threshold := 2
			minQuorumUSD := decimal.RequireFromString("100")
			if p != nil {
				if th, ok := p["quorum_threshold"].(int); ok && th > 0 {
					threshold = th
				}
				if mq, ok := p["withdraw_quorum_min_usd"].(string); ok {
					if mqDec, err := decimal.NewFromString(mq); err == nil {
						minQuorumUSD = mqDec
					}
				}
			}

			appID := uuid.NewString()
			initialSigs := []map[string]any{
				{"email": "operator@foundereum.org", "at": time.Now().Format(time.RFC3339)},
			}

			payloadMap := map[string]any{
				"to_account":  req.ToAccount,
				"amount_usdc": req.AmountUSDC,
			}

			// If amount is strictly under quorum threshold AND threshold is 1, execute immediately
			if wAmt.LessThan(minQuorumUSD) && threshold <= 1 {
				treasuryW["usdc"] = tUSDC.Sub(wAmt).StringFixed(6)
				resultTxID := fmt.Sprintf("%s@withdraw_%s", platformAccount, appID[:8])
				app := map[string]any{
					"id":               appID,
					"project_id":       id,
					"type":             "withdraw",
					"payload":          payloadMap,
					"threshold":        threshold,
					"signatures":       initialSigs,
					"status":           "executed",
					"result_tx_id":     resultTxID,
					"hashscan_url":     fmt.Sprintf("https://hashscan.io/%s/transaction/%s", cfg.HederaNetwork, resultTxID),
					"created_by":       "operator@foundereum.org",
					"expires_at":       time.Now().Add(24 * time.Hour).Format(time.RFC3339),
				}
				memStore.approvals[id] = append(memStore.approvals[id], app)
				if rdb != nil {
					msg, _ := json.Marshal(map[string]any{
						"type":       "wallet.balance",
						"project_id": id,
						"action":     "withdraw",
					})
					_ = rdb.Publish(r.Context(), "events:project:"+id, msg).Err()
				}
				httpx.JSON(w, http.StatusOK, app)
				return
			}

			// Requires quorum approval
			app := map[string]any{
				"id":         appID,
				"project_id": id,
				"type":       "withdraw",
				"payload":    payloadMap,
				"threshold":  threshold,
				"signatures": initialSigs,
				"status":     "pending",
				"created_by": "operator@foundereum.org",
				"expires_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
			}
			memStore.approvals[id] = append(memStore.approvals[id], app)

			httpx.JSON(w, http.StatusCreated, app)
		})

		pr.Post("/v1/approvals/{id}/approve", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			var req struct {
				Signature string `json:"signature"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)

			memStore.mu.Lock()
			defer memStore.mu.Unlock()

			var targetApp map[string]any
			var targetProjID string
			for projID, apps := range memStore.approvals {
				for _, app := range apps {
					if app["id"] == id {
						targetApp = app
						targetProjID = projID
						break
					}
				}
				if targetApp != nil {
					break
				}
			}

			if targetApp == nil {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "approval request not found")
				return
			}

			status, _ := targetApp["status"].(string)
			if status != "pending" {
				httpx.Err(w, http.StatusBadRequest, "ALREADY_PROCESSED", fmt.Sprintf("approval is already %s", status))
				return
			}

			sigs, _ := targetApp["signatures"].([]map[string]any)
			sigs = append(sigs, map[string]any{
				"email":     "approver-2@foundereum.org",
				"signature": req.Signature,
				"at":        time.Now().Format(time.RFC3339),
			})
			targetApp["signatures"] = sigs

			threshold := 2
			if th, ok := targetApp["threshold"].(int); ok && th > 0 {
				threshold = th
			}

			resultTxID := ""
			if len(sigs) >= threshold {
				targetApp["status"] = "executed"
				resultTxID = fmt.Sprintf("%s@quorum_withdraw_%s", platformAccount, id[:8])
				targetApp["result_tx_id"] = resultTxID
				targetApp["hashscan_url"] = fmt.Sprintf("https://hashscan.io/%s/transaction/%s", cfg.HederaNetwork, resultTxID)

				// Deduct withdrawal amount from treasury wallet
				payloadBytes, _ := json.Marshal(targetApp["payload"])
				var pMap map[string]any
				_ = json.Unmarshal(payloadBytes, &pMap)
				amtStr := fmt.Sprintf("%v", pMap["amount_usdc"])
				if wAmt, err := decimal.NewFromString(amtStr); err == nil && wAmt.GreaterThan(decimal.Zero) {
					for _, wlt := range memStore.wallets[targetProjID] {
						if wlt["kind"] == "treasury" {
							tUSDC, _ := decimal.NewFromString(fmt.Sprintf("%v", wlt["usdc"]))
							wlt["usdc"] = tUSDC.Sub(wAmt).StringFixed(6)
							break
						}
					}
				}

				if rdb != nil {
					msg, _ := json.Marshal(map[string]any{
						"type":       "wallet.balance",
						"project_id": targetProjID,
						"action":     "withdraw_settled",
					})
					_ = rdb.Publish(r.Context(), "events:project:"+targetProjID, msg).Err()
				}
			}

			httpx.JSON(w, http.StatusOK, map[string]any{
				"id":               id,
				"status":           targetApp["status"],
				"signatures_count": len(sigs),
				"threshold":        threshold,
				"result_tx_id":     resultTxID,
				"hashscan_url":     targetApp["hashscan_url"],
			})
		})

		pr.Post("/v1/approvals/{id}/reject", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			memStore.mu.Lock()
			defer memStore.mu.Unlock()

			var targetApp map[string]any
			for _, apps := range memStore.approvals {
				for _, app := range apps {
					if app["id"] == id {
						targetApp = app
						break
					}
				}
				if targetApp != nil {
					break
				}
			}

			if targetApp == nil {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "approval request not found")
				return
			}

			targetApp["status"] = "rejected"
			httpx.JSON(w, http.StatusOK, map[string]any{
				"id":     id,
				"status": "rejected",
			})
		})

		pr.Get("/v1/projects/{id}/events", func(w http.ResponseWriter, r *http.Request) {
			projectID := chi.URLParam(r, "id")
			claims, _ := auth.GetSession(r.Context())
			if _, ok := memStore.getProjectForOrg(projectID, claims.OrgID); !ok {
				httpx.Err(w, http.StatusNotFound, "NOT_FOUND", "project not found")
				return
			}
			w.Header().Set("Content-Type", "text/event-stream")
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("Connection", "keep-alive")
			flusher, ok := w.(http.Flusher)
			if !ok {
				http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
				return
			}
			fmt.Fprintf(w, "event: project.ready\ndata: {\"project_id\":\"%s\"}\n\n", projectID)
			flusher.Flush()

			if rdb != nil {
				pubsub := rdb.Subscribe(r.Context(), "events:project:"+projectID, "events:calls")
				defer pubsub.Close()
				ch := pubsub.Channel()
				for {
					select {
					case <-r.Context().Done():
						return
					case msg, ok := <-ch:
						if !ok {
							return
						}
						var ev struct {
							Type string `json:"type"`
						}
						_ = json.Unmarshal([]byte(msg.Payload), &ev)
						evType := ev.Type
						if evType == "" {
							evType = "message"
						}
						fmt.Fprintf(w, "event: %s\ndata: %s\n\n", evType, msg.Payload)
						flusher.Flush()
					}
				}
			} else {
				<-r.Context().Done()
			}
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
