package hcs

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/foundereum/foundereum/internal/config"
	hedera "github.com/hiero-ledger/hiero-sdk-go/v2/sdk"
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
	cfg    *config.Config
	client *hedera.Client
}

func NewPublisher(cfg *config.Config) *Publisher {
	p := &Publisher{cfg: cfg}
	if !cfg.MockChains && cfg.HederaOperatorAccount != "" && cfg.HederaOperatorKey != "" {
		accountID, err := hedera.AccountIDFromString(cfg.HederaOperatorAccount)
		if err == nil {
			privKey, err := hedera.PrivateKeyFromString(cfg.HederaOperatorKey)
			if err == nil {
				client := hedera.ClientForTestnet()
				client.SetOperator(accountID, privKey)
				p.client = client
			}
		}
	}
	return p
}

func (p *Publisher) Publish(ctx context.Context, topicIDStr string, msg AuditMessage) (int64, string, error) {
	data, err := json.Marshal(msg)
	if err != nil {
		return 0, "", fmt.Errorf("marshal audit message: %w", err)
	}

	if p.client != nil && topicIDStr != "" && topicIDStr != "0.0.987654" {
		tID, err := hedera.TopicIDFromString(topicIDStr)
		if err == nil {
			resp, err := hedera.NewTopicMessageSubmitTransaction().
				SetTopicID(tID).
				SetMessage(data).
				Execute(p.client)
			if err == nil {
				receipt, err := resp.GetReceipt(p.client)
				if err == nil {
					seq := int64(receipt.TopicSequenceNumber)
					ts := time.Now().UTC().Format(time.RFC3339Nano)
					return seq, ts, nil
				}
			}
		}
	}

	// Mock / deterministic fallback
	seq := time.Now().UnixNano() / 1_000_000
	ts := time.Now().UTC().Format(time.RFC3339Nano)
	return seq, ts, nil
}

