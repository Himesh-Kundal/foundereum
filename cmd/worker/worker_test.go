package main

import (
	"context"
	"crypto/sha256"
	"fmt"
	"os"
	"testing"
	"time"

	gen "github.com/foundereum/foundereum/internal/db/gen"
	"github.com/foundereum/foundereum/internal/ledger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

func TestWorkerReconciliation(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://fnd:fnd@localhost:5432/foundereum?sslmode=disable"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Skipf("skipping worker test (db unreachable): %v", err)
		return
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Skipf("skipping worker test (db ping failed): %v", err)
		return
	}

	queries := gen.New(pool)
	ledg := ledger.New(pool)

	// Create test org and project
	org, err := queries.CreateOrg(ctx, "Test Worker Org")
	if err != nil {
		t.Fatalf("failed to create org: %v", err)
	}

	proj, err := queries.CreateProject(ctx, gen.CreateProjectParams{
		OrgID:                org.ID,
		Slug:                 "worker-proj-" + uuid.New().String()[:8],
		Name:                 "Worker Project",
		Status:               "active",
		HcsTopicID:           pgtype.Text{String: "0.0.888888", Valid: true},
		QuorumThreshold:      1,
		WithdrawQuorumMinUsd: ledger.ToPgNumeric(decimal.NewFromInt(100)),
	})
	if err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Create wallet
	walletID := uuid.New()
	pgWalletID := pgtype.UUID{Bytes: walletID, Valid: true}
	uniqueAddr := fmt.Sprintf("0x%x", sha256.Sum256([]byte(walletID.String())))[:42]
	uniqueAcct := fmt.Sprintf("0.0.%d", 800000+time.Now().UnixNano()%100000)

	_, err = pool.Exec(ctx, `
		INSERT INTO wallets (id, project_id, kind, custody, evm_address, hedera_account_id, status, usdc_balance, hbar_balance)
		VALUES ($1, $2, 'agent', 'local', $3, $4, 'ready', 0, 0)
	`, pgWalletID, proj.ID, uniqueAddr, uniqueAcct)
	if err != nil {
		t.Fatalf("failed to insert wallet: %v", err)
	}

	// Deposit 100 USDC via ledger
	depAmt := decimal.NewFromInt(100000000)
	if err := ledg.Deposit(ctx, walletID, "USDC", depAmt, decimal.NewFromInt(100), "faucet", "worker-test-dep"); err != nil {
		t.Fatalf("deposit failed: %v", err)
	}

	// Test 1: ReconcileWalletBalances should return 0 mismatches for this wallet
	mismatches, err := queries.ReconcileWalletBalances(ctx)
	if err != nil {
		t.Fatalf("reconciliation query error: %v", err)
	}
	for _, m := range mismatches {
		if uuid.UUID(m.WalletID.Bytes) == walletID {
			t.Fatalf("unexpected reconciliation mismatch for matching wallet: %+v", m)
		}
	}

	// Test 2: Artificially mutate wallet balance directly without ledger entry
	_, err = pool.Exec(ctx, `UPDATE wallets SET usdc_balance = 999999 WHERE id = $1`, pgWalletID)
	if err != nil {
		t.Fatalf("failed to mutate balance: %v", err)
	}

	// ReconcileWalletBalances should now catch the discrepancy!
	mismatches, err = queries.ReconcileWalletBalances(ctx)
	if err != nil {
		t.Fatalf("reconciliation query error: %v", err)
	}
	var caught bool
	for _, m := range mismatches {
		if uuid.UUID(m.WalletID.Bytes) == walletID {
			caught = true
			break
		}
	}
	if !caught {
		t.Fatalf("reconciliation query failed to detect balance mismatch!")
	}

	// Test 3: Cleanup / restore balance to match ledger
	_, err = pool.Exec(ctx, `UPDATE wallets SET usdc_balance = $1 WHERE id = $2`, depAmt.String(), pgWalletID)
	if err != nil {
		t.Fatalf("failed to restore balance: %v", err)
	}
}
