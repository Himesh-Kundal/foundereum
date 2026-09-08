package ledger

import (
	"context"
	"errors"
	"fmt"

	"github.com/foundereum/foundereum/internal/db/gen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

var (
	ErrInsufficientBalance = errors.New("insufficient balance")
	ErrWalletNotFound      = errors.New("wallet not found")
)

type Ledger struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func New(pool *pgxpool.Pool) *Ledger {
	return &Ledger{
		pool:    pool,
		queries: db.New(pool),
	}
}

func ToPgNumeric(d decimal.Decimal) pgtype.Numeric {
	var num pgtype.Numeric
	_ = num.Scan(d.String())
	return num
}

func FromPgNumeric(num pgtype.Numeric) decimal.Decimal {
	val, err := num.Value()
	if err != nil || val == nil {
		return decimal.Zero
	}
	d, err := decimal.NewFromString(fmt.Sprintf("%v", val))
	if err != nil {
		return decimal.Zero
	}
	return d
}

func (l *Ledger) SpendLast24h(ctx context.Context, projectID uuid.UUID) (decimal.Decimal, error) {
	pgID := pgtype.UUID{Bytes: projectID, Valid: true}
	res, err := l.queries.SpendLast24h(ctx, pgID)
	if err != nil {
		return decimal.Zero, fmt.Errorf("getting 24h spend: %w", err)
	}
	return FromPgNumeric(res), nil
}

// Deposit credits a wallet balance and records an immutable ledger entry.
func (l *Ledger) Deposit(ctx context.Context, walletID uuid.UUID, asset string, baseUnits decimal.Decimal, amountUSD decimal.Decimal, refType, refID string) error {
	tx, err := l.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := l.queries.WithTx(tx)
	pgWalletID := pgtype.UUID{Bytes: walletID, Valid: true}

	wallet, err := qtx.LockWalletForUpdate(ctx, pgWalletID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWalletNotFound
		}
		return fmt.Errorf("lock wallet: %w", err)
	}

	curUSDC := FromPgNumeric(wallet.UsdcBalance)
	curHBAR := FromPgNumeric(wallet.HbarBalance)

	switch asset {
	case "USDC":
		curUSDC = curUSDC.Add(baseUnits)
	case "HBAR":
		curHBAR = curHBAR.Add(baseUnits)
	default:
		return fmt.Errorf("unsupported asset: %s", asset)
	}

	_, err = qtx.UpdateWalletBalances(ctx, db.UpdateWalletBalancesParams{
		ID:          pgWalletID,
		UsdcBalance: ToPgNumeric(curUSDC),
		HbarBalance: ToPgNumeric(curHBAR),
	})
	if err != nil {
		return fmt.Errorf("update wallet balance: %w", err)
	}

	_, err = qtx.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{
		WalletID:  pgWalletID,
		Asset:     asset,
		Amount:    ToPgNumeric(baseUnits),
		AmountUsd: ToPgNumeric(amountUSD),
		Kind:      "deposit",
		RefType:   pgtype.Text{String: refType, Valid: true},
		RefID:     pgtype.Text{String: refID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("insert ledger entry: %w", err)
	}

	return tx.Commit(ctx)
}

// DebitForPayment debits a wallet balance and records an immutable ledger entry for a payment.
func (l *Ledger) DebitForPayment(ctx context.Context, walletID uuid.UUID, asset string, baseUnits decimal.Decimal, amountUSD decimal.Decimal, paymentID string) error {
	tx, err := l.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := l.queries.WithTx(tx)
	pgWalletID := pgtype.UUID{Bytes: walletID, Valid: true}

	wallet, err := qtx.LockWalletForUpdate(ctx, pgWalletID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrWalletNotFound
		}
		return fmt.Errorf("lock wallet: %w", err)
	}

	curUSDC := FromPgNumeric(wallet.UsdcBalance)
	curHBAR := FromPgNumeric(wallet.HbarBalance)

	switch asset {
	case "USDC":
		if curUSDC.LessThan(baseUnits) {
			return ErrInsufficientBalance
		}
		curUSDC = curUSDC.Sub(baseUnits)
	case "HBAR":
		if curHBAR.LessThan(baseUnits) {
			return ErrInsufficientBalance
		}
		curHBAR = curHBAR.Sub(baseUnits)
	default:
		return fmt.Errorf("unsupported asset: %s", asset)
	}

	_, err = qtx.UpdateWalletBalances(ctx, db.UpdateWalletBalancesParams{
		ID:          pgWalletID,
		UsdcBalance: ToPgNumeric(curUSDC),
		HbarBalance: ToPgNumeric(curHBAR),
	})
	if err != nil {
		return fmt.Errorf("update wallet balance: %w", err)
	}

	// Debit entries have negative amount
	negAmount := baseUnits.Neg()
	_, err = qtx.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{
		WalletID:  pgWalletID,
		Asset:     asset,
		Amount:    ToPgNumeric(negAmount),
		AmountUsd: ToPgNumeric(amountUSD),
		Kind:      "payment",
		RefType:   pgtype.Text{String: "payments", Valid: true},
		RefID:     pgtype.Text{String: paymentID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("insert ledger entry: %w", err)
	}

	return tx.Commit(ctx)
}
