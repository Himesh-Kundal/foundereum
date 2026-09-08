-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_did   TEXT UNIQUE NOT NULL,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orgs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner','approver','viewer')),
  status      TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active')),
  auth_pubkey TEXT,
  privy_authorization_key_id TEXT,
  PRIMARY KEY (org_id, email)
);

CREATE TABLE projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  slug                    TEXT NOT NULL,
  name                    TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning','active','suspended')),
  hcs_topic_id            TEXT,
  quorum_threshold        SMALLINT NOT NULL DEFAULT 1,
  withdraw_quorum_min_usd NUMERIC(20,10) NOT NULL DEFAULT 100,
  erc8004_agent_id        NUMERIC(78,0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

CREATE TABLE wallets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind               TEXT NOT NULL CHECK (kind IN ('treasury','agent')),
  custody            TEXT NOT NULL CHECK (custody IN ('privy','local')),
  privy_wallet_id    TEXT,
  local_key_ref      TEXT,
  evm_address        TEXT NOT NULL,
  hedera_account_id  TEXT,
  public_key_hex     TEXT,
  status             TEXT NOT NULL DEFAULT 'bootstrapping' CHECK (status IN ('bootstrapping','ready','error')),
  usdc_balance       NUMERIC(38,0) NOT NULL DEFAULT 0,
  hbar_balance       NUMERIC(38,0) NOT NULL DEFAULT 0,
  balance_synced_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evm_address)
);
CREATE INDEX idx_wallets_project_id ON wallets (project_id);

CREATE TABLE policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  spec            JSONB NOT NULL,
  privy_policy_id TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  pushed_at       TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wallet_id    UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  prefix       TEXT NOT NULL,
  key_hash     BYTEA NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  carry_usd    NUMERIC(20,10) NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE calls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  api_key_id       UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  idempotency_key  TEXT NOT NULL,
  tool             TEXT NOT NULL,
  args             JSONB NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('challenged','paid','executing','succeeded','failed','rejected')),
  error            JSONB,
  result           JSONB,
  estimate_usd     NUMERIC(20,10) NOT NULL,
  actual_usd       NUMERIC(20,10),
  metered_bytes    INTEGER,
  tx_hash          TEXT,
  latency_ms       INTEGER,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ,
  UNIQUE (api_key_id, idempotency_key)
);
CREATE INDEX idx_calls_project_started ON calls (project_id, started_at DESC);

CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id      UUID NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wallet_id    UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  nonce        TEXT NOT NULL UNIQUE,
  asset        TEXT NOT NULL,
  amount       NUMERIC(38,0) NOT NULL,
  amount_usd   NUMERIC(20,10) NOT NULL,
  facilitator  TEXT NOT NULL CHECK (facilitator IN ('blocky402','self')),
  status       TEXT NOT NULL CHECK (status IN ('submitted','settled','failed','refunded')),
  hedera_tx_id TEXT,
  hcs_seq      BIGINT,
  hcs_ts       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at   TIMESTAMPTZ
);
CREATE INDEX idx_payments_submitted ON payments (status) WHERE status = 'submitted';

CREATE TABLE ledger_entries (
  id          BIGSERIAL PRIMARY KEY,
  wallet_id   UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  asset       TEXT NOT NULL,
  amount      NUMERIC(38,0) NOT NULL,
  amount_usd  NUMERIC(20,10),
  kind        TEXT NOT NULL CHECK (kind IN ('deposit','payment','refund_pending','refund','topup','withdraw','swap_in','swap_out','gas','adjustment')),
  ref_type    TEXT,
  ref_id      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_wallet_created ON ledger_entries (wallet_id, created_at DESC);

CREATE TABLE approvals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('withdraw','policy_update','key_rotate','agent_topup')),
  payload       JSONB NOT NULL,
  challenge     BYTEA NOT NULL,
  threshold     SMALLINT NOT NULL,
  signatures    JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executed','rejected','expired')),
  result_tx_id  TEXT,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE pipelines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id),
  prompt      TEXT NOT NULL,
  manifest    TEXT,
  schema_name TEXT,
  status      TEXT NOT NULL,
  logs        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tool_prices (
  tool             TEXT PRIMARY KEY,
  base_usd         NUMERIC(20,10) NOT NULL DEFAULT 0,
  per_kb_usd       NUMERIC(20,10) NOT NULL DEFAULT 0,
  notional_bps     INTEGER NOT NULL DEFAULT 0,
  notional_cap_usd NUMERIC(20,10),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS tool_prices CASCADE;
DROP TABLE IF EXISTS pipelines CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS orgs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
