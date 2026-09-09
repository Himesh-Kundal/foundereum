package config

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/caarlos0/env/v10"
)

type Config struct {
	DatabaseURL string `env:"DATABASE_URL" envDefault:"postgres://fnd:fnd@localhost:5432/foundereum?sslmode=disable"`
	RedisURL    string `env:"REDIS_URL" envDefault:"redis://localhost:6379"`
	Env         string `env:"ENV" envDefault:"development"`
	LogLevel    string `env:"LOG_LEVEL" envDefault:"info"`

	PortAPI     int `env:"PORT_API" envDefault:"8080"`
	PortGateway int `env:"PORT_GATEWAY" envDefault:"8081"`
	PortMCP     int `env:"PORT_MCP" envDefault:"8082"`
	GatewayURL  string `env:"GATEWAY_URL"`

	JWTSecret     string `env:"JWT_SECRET" envDefault:"fnd_dev_jwt_secret_super_secure_32_bytes_min"`
	AuthDevBypass bool   `env:"AUTH_DEV_BYPASS" envDefault:"true"`
	QuorumMode    string `env:"QUORUM_MODE" envDefault:"app"` // "privy" or "app"

	PrivyAppID           string `env:"PRIVY_APP_ID"`
	PrivyAppSecret       string `env:"PRIVY_APP_SECRET"`
	PrivyVerificationKey string `env:"PRIVY_VERIFICATION_KEY"`
	PrivyAuthKey         string `env:"PRIVY_AUTH_KEY"`

	HederaNetwork         string `env:"HEDERA_NETWORK" envDefault:"testnet"`
	HederaFaucetAccount   string `env:"HEDERA_FAUCET_ACCOUNT"`
	HederaFaucetKey       string `env:"HEDERA_FAUCET_KEY"`
	HederaOperatorAccount string `env:"HEDERA_OPERATOR_ACCOUNT"`
	HederaOperatorKey     string `env:"HEDERA_OPERATOR_KEY"`
	HederaPlatformAccount string `env:"HEDERA_PLATFORM_ACCOUNT"`
	HederaFeePayerAccount string `env:"HEDERA_FEEPAYER_ACCOUNT"`
	HederaFeePayerKey     string `env:"HEDERA_FEEPAYER_KEY"`
	HederaUSDCTokenID     string `env:"HEDERA_USDC_TOKEN_ID" envDefault:"0.0.429274"`
	HederaAuditTopicID    string `env:"HEDERA_AUDIT_TOPIC_ID" envDefault:"0.0.10442234"`
	HederaJSONRPC         string `env:"HEDERA_JSON_RPC" envDefault:"https://testnet.hashio.io/api"`
	HederaEVMChainID      int64  `env:"HEDERA_EVM_CHAIN_ID" envDefault:"296"`

	GraphAPIKey    string `env:"GRAPH_API_KEY"`
	SubgraphMCPURL string `env:"SUBGRAPH_MCP_URL" envDefault:"http://localhost:7000"`

	SaucerSwapRouter string `env:"SAUCERSWAP_ROUTER"`
	WHBARAddr        string `env:"WHBAR_ADDR"`

	FacilitatorMode string `env:"FACILITATOR_MODE" envDefault:"self"` // "blocky" or "self"
	Blocky402URL    string `env:"BLOCKY402_URL" envDefault:"http://localhost:8090"`
	WalletSigner    string `env:"WALLET_SIGNER" envDefault:"local"`   // "privy" or "local"
	MockChains      bool   `env:"MOCK_CHAINS" envDefault:"true"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parsing env config: %w", err)
	}
	return cfg, nil
}

func SetupLogger(levelStr string) *slog.Logger {
	var level slog.Level
	switch levelStr {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}
