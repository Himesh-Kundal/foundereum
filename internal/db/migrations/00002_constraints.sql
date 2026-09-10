-- +goose Up
ALTER TABLE wallets ADD CONSTRAINT chk_wallets_usdc_nonnegative CHECK (usdc_balance >= 0);
ALTER TABLE wallets ADD CONSTRAINT chk_wallets_hbar_nonnegative CHECK (hbar_balance >= 0);

-- +goose Down
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallets_usdc_nonnegative;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallets_hbar_nonnegative;
