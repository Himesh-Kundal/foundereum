package ledger

import (
	"context"
	"os"
	"testing"

	"github.com/foundereum/foundereum/internal/db/gen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

func TestPgNumericConversion(t *testing.T) {
	orig := decimal.NewFromFloat(1234.56789)
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
	_, err = pool.Exec(ctx, `
		INSERT INTO wallets (id, project_id, kind, custody, evm_address, hedera_account_id, status, usdc_balance, hbar_balance)
		VALUES ($1, $2, 'agent', 'local', '0x1234567890123456789012345678901234567890', '0.0.999999', 'ready', 0, 0)
	`, pgWalletID, proj.ID)
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
}
