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
	"time"
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

	// Debit entries have negative amount and negative amount_usd
	negAmount := baseUnits.Neg()
	negAmountUSD := amountUSD.Abs().Neg()
	_, err = qtx.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{
		WalletID:  pgWalletID,
		Asset:     asset,
		Amount:    ToPgNumeric(negAmount),
		AmountUsd: ToPgNumeric(negAmountUSD),
		Kind:      "payment",
		RefType:   pgtype.Text{String: "payments", Valid: true},
		RefID:     pgtype.Text{String: paymentID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("insert ledger entry: %w", err)
	}

	return tx.Commit(ctx)
}

type PaymentRecord struct {
	ProjectID      uuid.UUID
	APIKeyID       uuid.UUID
	WalletID       uuid.UUID
	Tool           string
	Args           []byte
	IdempotencyKey string
	Nonce          string
	EstimateUSD    decimal.Decimal
	ActualUSD      decimal.Decimal
	MeteredBytes   int32
	TxHash         string
	LatencyMs      int32
	Asset          string
	AmountBase     decimal.Decimal
	Facilitator    string
}

// RecordPayment atomically creates a call record, payment record, debits wallet balance, and writes a ledger entry in a single Postgres transaction.
func (l *Ledger) RecordPayment(ctx context.Context, rec PaymentRecord) (uuid.UUID, error) {
	tx, err := l.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := l.queries.WithTx(tx)

	pgProjID := pgtype.UUID{Bytes: rec.ProjectID, Valid: true}
	pgKeyID := pgtype.UUID{Bytes: rec.APIKeyID, Valid: true}
	pgWalletID := pgtype.UUID{Bytes: rec.WalletID, Valid: true}

	// 1. Create Call
	call, err := qtx.CreateCall(ctx, db.CreateCallParams{
		ProjectID:      pgProjID,
		ApiKeyID:       pgKeyID,
		IdempotencyKey: rec.IdempotencyKey,
		Tool:           rec.Tool,
		Args:           rec.Args,
		Status:         "succeeded",
		EstimateUsd:    ToPgNumeric(rec.EstimateUSD),
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("create call: %w", err)
	}

	// Update call execution stats
	callID := uuid.UUID(call.ID.Bytes)
	_, err = qtx.UpdateCallStatus(ctx, db.UpdateCallStatusParams{
		ID:           call.ID,
		Status:       "succeeded",
		Result:       []byte(`{}`),
		ActualUsd:    ToPgNumeric(rec.ActualUSD),
		MeteredBytes: pgtype.Int4{Int32: rec.MeteredBytes, Valid: true},
		TxHash:       pgtype.Text{String: rec.TxHash, Valid: true},
		LatencyMs:    pgtype.Int4{Int32: rec.LatencyMs, Valid: true},
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("update call status: %w", err)
	}

	// 2. Create Payment
	facilitator := rec.Facilitator
	if facilitator != "self" && facilitator != "blocky402" {
		facilitator = "self"
	}
	payment, err := qtx.CreatePayment(ctx, db.CreatePaymentParams{
		CallID:      call.ID,
		ProjectID:   pgProjID,
		WalletID:    pgWalletID,
		Nonce:       rec.Nonce,
		Asset:       rec.Asset,
		Amount:      ToPgNumeric(rec.AmountBase),
		AmountUsd:   ToPgNumeric(rec.ActualUSD),
		Facilitator: facilitator,
		Status:      "settled",
		HederaTxID:  pgtype.Text{String: rec.TxHash, Valid: true},
		SettledAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("create payment: %w", err)
	}

	// 3. Lock Wallet and Debit Balance
	wallet, err := qtx.LockWalletForUpdate(ctx, pgWalletID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("lock wallet: %w", err)
	}

	curUSDC := FromPgNumeric(wallet.UsdcBalance)
	curHBAR := FromPgNumeric(wallet.HbarBalance)

	switch rec.Asset {
	case "USDC":
		if curUSDC.LessThan(rec.AmountBase) {
			return uuid.Nil, ErrInsufficientBalance
		}
		curUSDC = curUSDC.Sub(rec.AmountBase)
	case "HBAR":
		if curHBAR.LessThan(rec.AmountBase) {
			return uuid.Nil, ErrInsufficientBalance
		}
		curHBAR = curHBAR.Sub(rec.AmountBase)
	default:
		return uuid.Nil, fmt.Errorf("unsupported asset: %s", rec.Asset)
	}

	_, err = qtx.UpdateWalletBalances(ctx, db.UpdateWalletBalancesParams{
		ID:          pgWalletID,
		UsdcBalance: ToPgNumeric(curUSDC),
		HbarBalance: ToPgNumeric(curHBAR),
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("update wallet balance: %w", err)
	}

	// 4. Insert Ledger Entry
	negAmount := rec.AmountBase.Neg()
	negAmountUSD := rec.ActualUSD.Abs().Neg()
	pmtIDStr := fmt.Sprintf("%x", payment.ID.Bytes)
	_, err = qtx.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{
		WalletID:  pgWalletID,
		Asset:     rec.Asset,
		Amount:    ToPgNumeric(negAmount),
		AmountUsd: ToPgNumeric(negAmountUSD),
		Kind:      "payment",
		RefType:   pgtype.Text{String: "payments", Valid: true},
		RefID:     pgtype.Text{String: pmtIDStr, Valid: true},
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert ledger entry: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, fmt.Errorf("commit tx: %w", err)
	}

	return callID, nil
}

// Transfer moves funds from fromWalletID to toWalletID within a single transaction, recording debit and credit ledger entries.
func (l *Ledger) Transfer(ctx context.Context, fromWalletID, toWalletID uuid.UUID, asset string, baseUnits decimal.Decimal, amountUSD decimal.Decimal, refType, refID string) error {
	tx, err := l.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := l.queries.WithTx(tx)
	pgFromID := pgtype.UUID{Bytes: fromWalletID, Valid: true}
	pgToID := pgtype.UUID{Bytes: toWalletID, Valid: true}

	// Deterministic locking order to prevent deadlocks
	firstID, secondID := pgFromID, pgToID
	if fromWalletID.String() > toWalletID.String() {
		firstID, secondID = pgToID, pgFromID
	}

	w1, err := qtx.LockWalletForUpdate(ctx, firstID)
	if err != nil {
		return fmt.Errorf("lock wallet 1: %w", err)
	}
	w2, err := qtx.LockWalletForUpdate(ctx, secondID)
	if err != nil {
		return fmt.Errorf("lock wallet 2: %w", err)
	}

	var fromWallet, toWallet db.Wallets
	if firstID == pgFromID {
		fromWallet, toWallet = w1, w2
	} else {
		fromWallet, toWallet = w2, w1
	}

	fromUSDC := FromPgNumeric(fromWallet.UsdcBalance)
	fromHBAR := FromPgNumeric(fromWallet.HbarBalance)
	toUSDC := FromPgNumeric(toWallet.UsdcBalance)
	toHBAR := FromPgNumeric(toWallet.HbarBalance)

	switch asset {
	case "USDC":
		if fromUSDC.LessThan(baseUnits) {
			return ErrInsufficientBalance
		}
		fromUSDC = fromUSDC.Sub(baseUnits)
		toUSDC = toUSDC.Add(baseUnits)
	case "HBAR":
		if fromHBAR.LessThan(baseUnits) {
			return ErrInsufficientBalance
		}
		fromHBAR = fromHBAR.Sub(baseUnits)
		toHBAR = toHBAR.Add(baseUnits)
	default:
		return fmt.Errorf("unsupported asset: %s", asset)
	}

	_, err = qtx.UpdateWalletBalances(ctx, db.UpdateWalletBalancesParams{
		ID:          pgFromID,
		UsdcBalance: ToPgNumeric(fromUSDC),
		HbarBalance: ToPgNumeric(fromHBAR),
	})
	if err != nil {
		return fmt.Errorf("update from wallet balances: %w", err)
	}

	_, err = qtx.UpdateWalletBalances(ctx, db.UpdateWalletBalancesParams{
		ID:          pgToID,
		UsdcBalance: ToPgNumeric(toUSDC),
		HbarBalance: ToPgNumeric(toHBAR),
	})
	if err != nil {
		return fmt.Errorf("update to wallet balances: %w", err)
	}

	negAmount := baseUnits.Neg()
	negAmountUSD := amountUSD.Abs().Neg()
	_, err = qtx.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{
		WalletID:  pgFromID,
		Asset:     asset,
		Amount:    ToPgNumeric(negAmount),
		AmountUsd: ToPgNumeric(negAmountUSD),
		Kind:      "topup",
		RefType:   pgtype.Text{String: refType, Valid: true},
		RefID:     pgtype.Text{String: refID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("insert debit ledger entry: %w", err)
	}

	_, err = qtx.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{
		WalletID:  pgToID,
		Asset:     asset,
		Amount:    ToPgNumeric(baseUnits),
		AmountUsd: ToPgNumeric(amountUSD),
		Kind:      "topup",
		RefType:   pgtype.Text{String: refType, Valid: true},
		RefID:     pgtype.Text{String: refID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("insert credit ledger entry: %w", err)
	}

	return tx.Commit(ctx)
}

// Withdraw debits a wallet balance and records an immutable ledger entry for a withdrawal.
func (l *Ledger) Withdraw(ctx context.Context, walletID uuid.UUID, asset string, baseUnits decimal.Decimal, amountUSD decimal.Decimal, refID string) error {
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

	negAmount := baseUnits.Neg()
	negAmountUSD := amountUSD.Abs().Neg()
	_, err = qtx.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{
		WalletID:  pgWalletID,
		Asset:     asset,
		Amount:    ToPgNumeric(negAmount),
		AmountUsd: ToPgNumeric(negAmountUSD),
		Kind:      "withdraw",
		RefType:   pgtype.Text{String: "withdrawals", Valid: true},
		RefID:     pgtype.Text{String: refID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("insert ledger entry: %w", err)
	}

	return tx.Commit(ctx)
}

