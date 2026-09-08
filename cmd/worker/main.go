package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/foundereum/foundereum/internal/config"
	gen "github.com/foundereum/foundereum/internal/db/gen"
	"github.com/foundereum/foundereum/internal/hcs"
	"github.com/foundereum/foundereum/internal/ledger"
	"github.com/google/uuid"
	hedera "github.com/hiero-ledger/hiero-sdk-go/v2/sdk"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/hibiken/asynq"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	logger := config.SetupLogger(cfg.LogLevel)
	logger.Info("starting foundereum worker", "redis", cfg.RedisURL, "db", cfg.DatabaseURL)

	ctx := context.Background()

	// Connect to Postgres
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "err", err)
	} else {
		defer pool.Close()
	}

	var queries *gen.Queries
	if pool != nil {
		queries = gen.New(pool)
	}

	// Connect to Redis
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	var rdb *redis.Client
	if err == nil {
		rdb = redis.NewClient(redisOpts)
		defer rdb.Close()
	}

	hcsPub := hcs.NewPublisher(cfg)

	// Set up Hedera Client for topic creation if configured
	var hederaClient *hedera.Client
	if !cfg.MockChains && cfg.HederaOperatorAccount != "" && cfg.HederaOperatorKey != "" {
		accountID, err := hedera.AccountIDFromString(cfg.HederaOperatorAccount)
		if err == nil {
			privKey, err := hedera.PrivateKeyFromString(cfg.HederaOperatorKey)
			if err == nil {
				client := hedera.ClientForTestnet()
				client.SetOperator(accountID, privKey)
				hederaClient = client
			}
		}
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: strings.TrimPrefix(cfg.RedisURL, "redis://")},
		asynq.Config{
			Concurrency: 5,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	mux := asynq.NewServeMux()

	// Task: bootstrap_hedera
	mux.HandleFunc("bootstrap_hedera", func(ctx context.Context, t *asynq.Task) error {
		var payload struct {
			ProjectID string `json:"project_id"`
		}
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return err
		}
		logger.Info("bootstrapping hedera accounts and hcs topic for project", "project_id", payload.ProjectID)

		topicID := fmt.Sprintf("0.0.%d", 980000+time.Now().Unix()%10000)
		if hederaClient != nil {
			resp, err := hedera.NewTopicCreateTransaction().
				SetTopicMemo(fmt.Sprintf("Foundereum Audit: %s", payload.ProjectID)).
				Execute(hederaClient)
			if err == nil {
				receipt, err := resp.GetReceipt(hederaClient)
				if err == nil && receipt.TopicID != nil {
					topicID = receipt.TopicID.String()
					logger.Info("created live hedera hcs audit topic", "topic_id", topicID)
				}
			}
		}

		if queries != nil {
			projUUID, err := uuid.Parse(payload.ProjectID)
			if err == nil {
				_, _ = queries.UpdateProjectStatus(ctx, gen.UpdateProjectStatusParams{
					ID:         pgtype.UUID{Bytes: projUUID, Valid: true},
					Status:     "active",
					HcsTopicID: pgtype.Text{String: topicID, Valid: true},
				})
			}
		}

		// Notify frontend via Redis pub/sub
		if rdb != nil {
			msg, _ := json.Marshal(map[string]string{
				"type":       "project.ready",
				"project_id": payload.ProjectID,
				"topic_id":   topicID,
			})
			_ = rdb.Publish(ctx, "events:project:"+payload.ProjectID, msg).Err()
		}

		logger.Info("bootstrap complete for project", "project_id", payload.ProjectID, "topic_id", topicID)
		return nil
	})

	// Task: hcs_audit
	mux.HandleFunc("hcs_audit", func(ctx context.Context, t *asynq.Task) error {
		var payload struct {
			PaymentID string           `json:"payment_id"`
			TopicID   string           `json:"topic_id"`
			Message   hcs.AuditMessage `json:"message"`
		}
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return err
		}

		topicID := payload.TopicID
		if topicID == "" {
			topicID = cfg.HederaOperatorAccount
		}

		seq, ts, err := hcsPub.Publish(ctx, topicID, payload.Message)
		if err != nil {
			return fmt.Errorf("publish hcs audit: %w", err)
		}

		if queries != nil && payload.PaymentID != "" {
			pmtUUID, err := uuid.Parse(payload.PaymentID)
			if err == nil {
				_ = queries.UpdatePaymentAudit(ctx, gen.UpdatePaymentAuditParams{
					ID:     pgtype.UUID{Bytes: pmtUUID, Valid: true},
					HcsSeq: pgtype.Int8{Int64: seq, Valid: true},
					HcsTs:  pgtype.Text{String: ts, Valid: true},
				})
			}
		}

		logger.Info("hcs audit message published", "seq", seq, "ts", ts, "call", payload.Message.CallID)
		return nil
	})

	// Task: reconcile_balances
	mux.HandleFunc("reconcile_balances", func(ctx context.Context, t *asynq.Task) error {
		if queries == nil {
			return nil
		}
		mismatches, err := queries.ReconcileWalletBalances(ctx)
		if err != nil {
			logger.Error("failed running balance reconciliation query", "err", err)
			return err
		}

		if len(mismatches) > 0 {
			for _, m := range mismatches {
				logger.Error("LEDGER RECONCILIATION MISMATCH!",
					"wallet_id", m.WalletID,
					"project_id", m.ProjectID,
					"usdc_balance", m.UsdcBalance,
					"ledger_sum", m.LedgerSum,
					"diff", m.Diff,
				)
			}
			return fmt.Errorf("detected %d ledger reconciliation mismatches", len(mismatches))
		}

		logger.Info("ledger balance reconciliation OK: all wallet balances match ledger entries exactly")
		return nil
	})

	// Task: sync_balances
	mux.HandleFunc("sync_balances", func(ctx context.Context, t *asynq.Task) error {
		if queries == nil {
			return nil
		}
		projects, err := queries.GetAllActiveProjects(ctx)
		if err != nil {
			return err
		}
		for _, p := range projects {
			wallets, err := queries.GetWalletsByProject(ctx, p.ID)
			if err != nil {
				continue
			}
			for _, w := range wallets {
				// Record sync timestamp
				_, _ = queries.UpdateWalletBalances(ctx, gen.UpdateWalletBalancesParams{
					ID:          w.ID,
					UsdcBalance: w.UsdcBalance,
					HbarBalance: w.HbarBalance,
				})
			}
		}
		logger.Debug("sync_balances finished scanning active projects", "count", len(projects))
		return nil
	})

	// Run periodic background reconciliation loop
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()

		// Run once on startup
		time.Sleep(2 * time.Second)
		if queries != nil {
			logger.Info("running initial ledger balance reconciliation sweep")
			mismatches, err := queries.ReconcileWalletBalances(context.Background())
			if err != nil {
				logger.Error("initial reconciliation check failed", "err", err)
			} else if len(mismatches) > 0 {
				logger.Warn("initial reconciliation detected mismatches", "count", len(mismatches))
			} else {
				logger.Info("initial reconciliation check PASSED: all wallet balances in sync")
			}

			// Catch up payments missing audit
			missing, err := queries.PaymentsMissingAudit(context.Background())
			if err == nil && len(missing) > 0 {
				logger.Info("auditing unrecorded payments", "count", len(missing))
				for _, pmt := range missing {
					amtStr := ledger.FromPgNumeric(pmt.Amount).String()
					seq, ts, _ := hcsPub.Publish(context.Background(), "0.0.987654", hcs.AuditMessage{
						Version:   1,
						ProjectID: fmt.Sprintf("%x", pmt.ProjectID.Bytes),
						CallID:    fmt.Sprintf("%x", pmt.CallID.Bytes),
						Tool:      "catchup_audit",
						Payer:     fmt.Sprintf("%x", pmt.WalletID.Bytes),
						Asset:     pmt.Asset,
						Amount:    amtStr,
						HederaTx:  pmt.HederaTxID.String,
						Timestamp: pmt.CreatedAt.Time,
					})
					_ = queries.UpdatePaymentAudit(context.Background(), gen.UpdatePaymentAuditParams{
						ID:     pmt.ID,
						HcsSeq: pgtype.Int8{Int64: seq, Valid: true},
						HcsTs:  pgtype.Text{String: ts, Valid: true},
					})
				}
			}
		}

		for range ticker.C {
			if queries != nil {
				mismatches, err := queries.ReconcileWalletBalances(context.Background())
				if err != nil {
					logger.Error("periodic reconciliation error", "err", err)
				} else if len(mismatches) > 0 {
					logger.Error("PERIODIC RECONCILIATION MISMATCH FOUND!", "mismatches", len(mismatches))
				} else {
					logger.Debug("periodic reconciliation OK")
				}
			}
		}
	}()

	logger.Info("worker running, listening for background jobs")
	if err := srv.Run(mux); err != nil {
		logger.Error("asynq worker stopped", "err", err)
	}
}

