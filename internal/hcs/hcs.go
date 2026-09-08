package hcs

import (
	"context"
	"time"

	"github.com/foundereum/foundereum/internal/config"
)

type AuditMessage struct {
	Version   int       `json:"v"`
	ProjectID string    `json:"project"`
	CallID    string    `json:"call"`
	Tool      string    `json:"tool"`
	Payer     string    `json:"payer"`
	Asset     string    `json:"asset"`
	Amount    string    `json:"amount"`
	USD       string    `json:"usd"`
	HederaTx  string    `json:"hedera_tx"`
	ArgsHash  string    `json:"args_sha256"`
	Timestamp time.Time `json:"ts"`
}

type Publisher struct {
	cfg *config.Config
}

func NewPublisher(cfg *config.Config) *Publisher {
	return &Publisher{cfg: cfg}
}

func (p *Publisher) Publish(ctx context.Context, topicID string, msg AuditMessage) (int64, string, error) {
	seq := time.Now().UnixNano() / 1_000_000
	ts := time.Now().UTC().Format(time.RFC3339Nano)
	return seq, ts, nil
}
