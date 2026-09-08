package tools

import (
	"context"
	"encoding/json"
	"errors"
	"sync"

	"github.com/foundereum/foundereum/internal/wallet"
	"github.com/foundereum/foundereum/internal/x402"
	"github.com/google/uuid"
)

var (
	ErrToolNotFound = errors.New("tool not found in registry")
)

type Spec struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"input_schema"`
	Pricing     x402.Rule       `json:"pricing"`
	Executor    Executor        `json:"-"`
	Tags        []string        `json:"tags"`
}

type Input struct {
	ProjectID  uuid.UUID
	Wallet     wallet.Ref
	Args       json.RawMessage
	Settlement *x402.SettleResult
}

type Output struct {
	Result any            `json:"result"`
	Bytes  int            `json:"bytes"`
	TxHash string         `json:"tx_hash,omitempty"`
	Meta   map[string]any `json:"meta,omitempty"`
}

type Executor interface {
	Execute(ctx context.Context, in Input) (Output, error)
}

var (
	mu       sync.RWMutex
	Registry = map[string]Spec{}
)

func Register(s Spec) {
	mu.Lock()
	defer mu.Unlock()
	Registry[s.Name] = s
}

func Get(name string) (Spec, bool) {
	mu.RLock()
	defer mu.RUnlock()
	s, ok := Registry[name]
	return s, ok
}

func List() []Spec {
	mu.RLock()
	defer mu.RUnlock()
	var list []Spec
	for _, s := range Registry {
		list = append(list, s)
	}
	return list
}
