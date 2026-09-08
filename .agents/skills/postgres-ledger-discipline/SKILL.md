---
name: postgres-ledger-discipline
description: >-
  Use this skill whenever authoring SQL migrations, modifying internal/db/queries,
  or writing code that mutates balances, payments, or ledger_entries in Foundereum.
  Enforces double-entry ledger invariants, row locking, and replay prevention.
---

# PostgreSQL Schema & Ledger Invariants Discipline

## 1. Immutable Ledger Architecture

Foundereum uses double-entry accounting discipline for financial safety.

- `wallets.usdc_balance` and `wallets.hbar_balance` are **read caches** of balances.
- The single source of financial truth is the **append-only** `ledger_entries` table.
- **NEVER** update `wallets.usdc_balance` without creating a corresponding `ledger_entries` row within the same transaction.
- **NEVER** edit or delete rows in `ledger_entries`. Corrections are made via compensatory entries (e.g. `kind = 'adjustment'` or `'refund'`).

### `ledger_entries` Schema Reference:
```sql
CREATE TABLE ledger_entries (
  id          BIGSERIAL PRIMARY KEY,
  wallet_id   UUID NOT NULL REFERENCES wallets(id),
  asset       TEXT NOT NULL,                            -- 'USDC' | 'HBAR'
  amount      NUMERIC(38,0) NOT NULL,                   -- signed base units (negative for debits, positive for credits)
  amount_usd  NUMERIC(20,10),
  kind        TEXT NOT NULL CHECK (kind IN (
                'deposit','payment','refund_pending','refund',
                'topup','withdraw','swap_in','swap_out','gas','adjustment'
              )),
  ref_type    TEXT,                                     -- 'payments', 'calls', etc.
  ref_id      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON ledger_entries (wallet_id, created_at DESC);
```

---

## 2. Invariants Checklist

Before approving any migration or SQL query, verify the following:

1. **Reconciliation Invariant:**
   `SUM(ledger_entries.amount) WHERE wallet_id = $1 AND asset = $2` must equal `wallets.*_balance`.
2. **Replay Prevention Invariant:**
   `payments.nonce` is `UNIQUE`. No payment nonce can ever be credited or debited more than once, regardless of Redis state.
3. **Settlement Consistency Invariant:**
   `calls.status = 'succeeded'` implies `payments.status = 'settled'`.
4. **HCS Audit Invariant:**
   Every payment with `status = 'settled'` must eventually have `hcs_seq` and `hcs_ts` populated.
5. **Quorum Invariant:**
   `approvals.status = 'executed'` strictly requires `jsonb_array_length(signatures) >= threshold`.

---

## 3. Concurrency & Locking Discipline

### Preventing Double Spending:
When debiting a wallet balance or confirming a withdrawal:
1. Lock the wallet row explicitly using `SELECT ... FOR UPDATE`:
   ```sql
   -- name: LockWalletForUpdate :one
   SELECT id, usdc_balance, hbar_balance
   FROM wallets
   WHERE id = $1
   FOR UPDATE;
   ```
2. Verify sufficient balance in Go:
   ```go
   if wallet.UsdcBalance.LessThan(requiredAmount) {
       return ErrInsufficientFunds
   }
   ```
3. Insert ledger entry and update wallet cached balance in the same transaction.

### Asynchronous Worker Polling (`FOR UPDATE SKIP LOCKED`):
When processing queues (e.g., submitted payments to confirm, un-audited settled payments for HCS):
```sql
-- name: ClaimPaymentsForAudit :many
SELECT * FROM payments
WHERE status = 'settled' AND hcs_seq IS NULL
ORDER BY settled_at ASC
LIMIT 50
FOR UPDATE SKIP LOCKED;
```
This guarantees multiple worker replicas will not collide or double-process audit events.

---

## 4. Migration Conventions (`goose`)

1. Migrations live in `internal/db/migrations/` using format `NNNN_description.sql`.
2. Always write reversible migrations (`-- +goose Up` and `-- +goose Down`).
3. Constraints and Checks:
   - Always enforce status values using `CHECK (status IN (...))`.
   - Never use floating point column types. Use `NUMERIC(38,0)` for base units and `NUMERIC(20,10)` for USD amounts.
4. After editing migrations or queries:
   - Run `make migrate`
   - Run `make sqlc`
