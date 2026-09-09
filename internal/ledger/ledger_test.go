package ledger

import (
	"context"
	"crypto/sha256"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/foundereum/foundereum/internal/db/gen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

func TestPgNumericConversion(t *testing.T) {
	orig := decimal.RequireFromString("1234.56789")
	pgNum := ToPgNumeric(orig)
	back := FromPgNumeric(pgNum)

	if !orig.Equal(back) {
		t.Fatalf("expected %s, got %s", orig.String(), back.String())
	}
}

func TestLedgerIntegration(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://fnd:fnd@localhost:5432/foundereum?sslmode=disable"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Skipf("skipping live db test: %v", err)
		return
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Skipf("skipping live db test (db unreachable): %v", err)
		return
	}

	ledg := New(pool)
	queries := db.New(pool)

	// Create test org and project
	org, err := queries.CreateOrg(ctx, "Test Ledger Org")
	if err != nil {
		t.Fatalf("failed to create org: %v", err)
	}

	proj, err := queries.CreateProject(ctx, db.CreateProjectParams{
		OrgID:                org.ID,
		Slug:                 "test-proj-" + uuid.New().String()[:8],
		Name:                 "Test Project",
		Status:               "active",
		HcsTopicID:           pgtype.Text{String: "0.0.12345", Valid: true},
		QuorumThreshold:      1,
		WithdrawQuorumMinUsd: ToPgNumeric(decimal.NewFromInt(100)),
	})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Create test wallet
	walletID := uuid.New()
	pgWalletID := pgtype.UUID{Bytes: walletID, Valid: true}
	uniqueAddr := fmt.Sprintf("0x%x", sha256.Sum256([]byte(walletID.String())))[:42]
	uniqueAcct := fmt.Sprintf("0.0.%d", 900000+time.Now().UnixNano()%100000)
	_, err = pool.Exec(ctx, `
		INSERT INTO wallets (id, project_id, kind, custody, evm_address, hedera_account_id, status, usdc_balance, hbar_balance)
		VALUES ($1, $2, 'agent', 'local', $3, $4, 'ready', 0, 0)
	`, pgWalletID, proj.ID, uniqueAddr, uniqueAcct)
	if err != nil {
		t.Fatalf("failed to insert wallet: %v", err)
	}

	// 1. Deposit 50 USDC
	depositAmount := decimal.NewFromInt(50000000) // 50 USDC (6 decimals)
	err = ledg.Deposit(ctx, walletID, "USDC", depositAmount, decimal.NewFromInt(50), "faucet", "test-deposit-1")
	if err != nil {
		t.Fatalf("deposit failed: %v", err)
	}

	// Verify balance
	w, err := queries.LockWalletForUpdate(ctx, pgWalletID)
	if err != nil {
		t.Fatalf("failed to read wallet: %v", err)
	}
	if !FromPgNumeric(w.UsdcBalance).Equal(depositAmount) {
		t.Fatalf("expected balance %s, got %s", depositAmount.String(), FromPgNumeric(w.UsdcBalance).String())
	}

	// 2. Debit 10 USDC for payment
	debitAmount := decimal.NewFromInt(10000000) // 10 USDC
	err = ledg.DebitForPayment(ctx, walletID, "USDC", debitAmount, decimal.NewFromInt(10), "pay-1")
	if err != nil {
		t.Fatalf("debit failed: %v", err)
	}

	// Verify remaining balance (40 USDC)
	w, err = queries.LockWalletForUpdate(ctx, pgWalletID)
	if err != nil {
		t.Fatalf("failed to read wallet: %v", err)
	}
	expectedRem := decimal.NewFromInt(40000000)
	if !FromPgNumeric(w.UsdcBalance).Equal(expectedRem) {
		t.Fatalf("expected remaining balance %s, got %s", expectedRem.String(), FromPgNumeric(w.UsdcBalance).String())
	}

	// 3. Test Insufficient Balance Rejection
	err = ledg.DebitForPayment(ctx, walletID, "USDC", decimal.NewFromInt(100000000), decimal.NewFromInt(100), "pay-too-much")
	if err != ErrInsufficientBalance {
		t.Fatalf("expected ErrInsufficientBalance, got %v", err)
	}

	// 4. Test RecordPayment atomic transaction
	apiKey, err := queries.CreateAPIKey(ctx, db.CreateAPIKeyParams{
		ProjectID: proj.ID,
		WalletID:  pgWalletID,
		Name:      "test-key",
		Prefix:    "fnd_sk_test",
		KeyHash:   []byte("test-hash-" + walletID.String()[:8]),
		Status:    "active",
	})
	if err != nil {
		t.Fatalf("failed to create api key: %v", err)
	}

	callID, err := ledg.RecordPayment(ctx, PaymentRecord{
		ProjectID:      uuid.UUID(proj.ID.Bytes),
		APIKeyID:       uuid.UUID(apiKey.ID.Bytes),
		WalletID:       walletID,
		Tool:           "get_swap_quote",
		Args:           []byte(`{"tokenIn":"USDC"}`),
		IdempotencyKey: "idem-" + uuid.New().String(),
		Nonce:          "nonce-" + uuid.New().String(),
		EstimateUSD:    decimal.RequireFromString("0.0001"),
		ActualUSD:      decimal.RequireFromString("0.0001"),
		MeteredBytes:   128,
		TxHash:         "0.0.12345@12345.6789",
		LatencyMs:      45,
		Asset:          "USDC",
		AmountBase:     decimal.NewFromInt(100), // 0.0001 USDC
		Facilitator:    "self",
	})
	if err != nil {
		t.Fatalf("RecordPayment failed: %v", err)
	}
	if callID == uuid.Nil {
		t.Fatalf("expected valid callID, got nil")
	}

	// 5. Verify SpendLast24h
	spend, err := ledg.SpendLast24h(ctx, uuid.UUID(proj.ID.Bytes))
	if err != nil {
		t.Fatalf("SpendLast24h failed: %v", err)
	}
	if spend.LessThanOrEqual(decimal.Zero) {
		t.Fatalf("expected spend > 0, got %s", spend.String())
	}
}

