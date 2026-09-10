-- +goose Up
-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallets_usdc_nonnegative'
    ) THEN
        ALTER TABLE wallets ADD CONSTRAINT chk_wallets_usdc_nonnegative CHECK (usdc_balance >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallets_hbar_nonnegative'
    ) THEN
        ALTER TABLE wallets ADD CONSTRAINT chk_wallets_hbar_nonnegative CHECK (hbar_balance >= 0);
    END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallets_usdc_nonnegative;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallets_hbar_nonnegative;
