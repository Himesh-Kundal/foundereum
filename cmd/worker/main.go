package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/foundereum/foundereum/internal/config"
	"github.com/foundereum/foundereum/internal/hcs"
	"github.com/hibiken/asynq"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	logger := config.SetupLogger(cfg.LogLevel)
	logger.Info("starting foundereum worker", "redis", cfg.RedisURL)

	hcsPub := hcs.NewPublisher(cfg)

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
		_ = json.Unmarshal(t.Payload(), &payload)
		logger.Info("bootstrapping hedera accounts and hcs topic for project", "project_id", payload.ProjectID)
		time.Sleep(1 * time.Second) // simulate alias creation & token association
		return nil
	})

	// Task: hcs_audit
	mux.HandleFunc("hcs_audit", func(ctx context.Context, t *asynq.Task) error {
		var payload struct {
			TopicID string           `json:"topic_id"`
			Message hcs.AuditMessage `json:"message"`
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
		logger.Info("hcs audit message published", "seq", seq, "ts", ts, "call", payload.Message.CallID)
		return nil
	})

	// Task: sync_balances
	mux.HandleFunc("sync_balances", func(ctx context.Context, t *asynq.Task) error {
		logger.Debug("syncing mirror node balances")
		return nil
	})

	logger.Info("worker running, listening for background jobs")
	if err := srv.Run(mux); err != nil {
		logger.Error("asynq worker stopped", "err", err)
	}
}
