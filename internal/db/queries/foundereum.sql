-- name: UpsertUser :one
INSERT INTO users (privy_did, email)
VALUES ($1, $2)
ON CONFLICT (privy_did) DO UPDATE
SET email = EXCLUDED.email
RETURNING *;

-- name: GetUserByPrivyDID :one
SELECT * FROM users WHERE privy_did = $1;

-- name: CreateOrg :one
INSERT INTO orgs (name)
VALUES ($1)
RETURNING *;

-- name: GetOrg :one
SELECT * FROM orgs WHERE id = $1;

-- name: AddMember :one
INSERT INTO members (org_id, user_id, email, role, status, auth_pubkey, privy_authorization_key_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (org_id, email) DO UPDATE
SET role = EXCLUDED.role,
    status = EXCLUDED.status,
    auth_pubkey = COALESCE(EXCLUDED.auth_pubkey, members.auth_pubkey),
    privy_authorization_key_id = COALESCE(EXCLUDED.privy_authorization_key_id, members.privy_authorization_key_id)
RETURNING *;

-- name: GetOrgMembers :many
SELECT * FROM members WHERE org_id = $1 ORDER BY email;

-- name: GetMemberByUser :one
SELECT m.*, o.name as org_name
FROM members m
JOIN orgs o ON o.id = m.org_id
WHERE m.user_id = $1
LIMIT 1;

-- name: CreateProject :one
INSERT INTO projects (org_id, slug, name, status, hcs_topic_id, quorum_threshold, withdraw_quorum_min_usd)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetProject :one
SELECT * FROM projects WHERE id = $1;

-- name: GetProjectsByOrg :many
SELECT * FROM projects WHERE org_id = $1 ORDER BY created_at DESC;

-- name: UpdateProjectStatus :one
UPDATE projects
SET status = $2, hcs_topic_id = COALESCE($3, hcs_topic_id)
WHERE id = $1
RETURNING *;

-- name: CreateWallet :one
INSERT INTO wallets (project_id, kind, custody, privy_wallet_id, local_key_ref, evm_address, hedera_account_id, public_key_hex, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetWalletsByProject :many
SELECT * FROM wallets WHERE project_id = $1 ORDER BY kind ASC;

-- name: GetWallet :one
SELECT * FROM wallets WHERE id = $1;

-- name: LockWalletForUpdate :one
SELECT * FROM wallets WHERE id = $1 FOR UPDATE;

-- name: UpdateWalletStatusAndAccount :one
UPDATE wallets
SET status = $2,
    hedera_account_id = COALESCE($3, hedera_account_id),
    public_key_hex = COALESCE($4, public_key_hex)
WHERE id = $1
RETURNING *;

-- name: UpdateWalletBalances :one
UPDATE wallets
SET usdc_balance = $2,
    hbar_balance = $3,
    balance_synced_at = now()
WHERE id = $1
RETURNING *;

-- name: UpsertPolicy :one
INSERT INTO policies (project_id, spec, privy_policy_id, version, pushed_at)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (project_id) DO UPDATE
SET spec = EXCLUDED.spec,
    privy_policy_id = COALESCE(EXCLUDED.privy_policy_id, policies.privy_policy_id),
    version = policies.version + 1,
    pushed_at = COALESCE(EXCLUDED.pushed_at, policies.pushed_at),
    updated_at = now()
RETURNING *;

-- name: GetPolicyByProject :one
SELECT * FROM policies WHERE project_id = $1;

-- name: CreateAPIKey :one
INSERT INTO api_keys (project_id, wallet_id, name, prefix, key_hash, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetAPIKeysByProject :many
SELECT id, project_id, wallet_id, name, prefix, status, carry_usd, last_used_at, created_at
FROM api_keys
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetKeyContext :one
SELECT k.id AS key_id, k.project_id, k.carry_usd,
       w.id AS wallet_id, w.custody, w.privy_wallet_id, w.hedera_account_id, w.evm_address, w.public_key_hex,
       p.status AS project_status, pol.spec AS policy
FROM api_keys k
JOIN wallets w   ON w.id = k.wallet_id
JOIN projects p  ON p.id = k.project_id
JOIN policies pol ON pol.project_id = p.id
WHERE k.key_hash = $1 AND k.status = 'active' AND w.status = 'ready';

-- name: UpdateKeyLastUsed :exec
UPDATE api_keys
SET last_used_at = now(),
    carry_usd = $2
WHERE id = $1;

-- name: CreateCall :one
INSERT INTO calls (project_id, api_key_id, idempotency_key, tool, args, status, estimate_usd)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetCallByIdempotency :one
SELECT * FROM calls WHERE api_key_id = $1 AND idempotency_key = $2;

-- name: GetCall :one
SELECT * FROM calls WHERE id = $1;

-- name: GetCallsByProject :many
SELECT * FROM calls
WHERE project_id = $1
ORDER BY started_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateCallStatus :one
UPDATE calls
SET status = $2,
    result = $3,
    error = $4,
    actual_usd = $5,
    metered_bytes = $6,
    tx_hash = $7,
    latency_ms = $8,
    finished_at = now()
WHERE id = $1
RETURNING *;

-- name: CreatePayment :one
INSERT INTO payments (call_id, project_id, wallet_id, nonce, asset, amount, amount_usd, facilitator, status, hedera_tx_id, settled_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetPaymentByNonce :one
SELECT * FROM payments WHERE nonce = $1;

-- name: GetPaymentByCall :one
SELECT * FROM payments WHERE call_id = $1;

-- name: GetPaymentsByProject :many
SELECT * FROM payments WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2;

-- name: UpdatePaymentSettled :one
UPDATE payments
SET status = 'settled',
    hedera_tx_id = $2,
    settled_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdatePaymentAudit :exec
UPDATE payments
SET hcs_seq = $2,
    hcs_ts = $3
WHERE id = $1;

-- name: PaymentsMissingAudit :many
SELECT * FROM payments
WHERE status = 'settled' AND hcs_seq IS NULL
ORDER BY settled_at ASC
LIMIT 100;

-- name: InsertLedgerEntry :one
INSERT INTO ledger_entries (wallet_id, asset, amount, amount_usd, kind, ref_type, ref_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetLedgerEntriesByWallet :many
SELECT * FROM ledger_entries
WHERE wallet_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: SpendLast24h :one
SELECT COALESCE(SUM(-amount_usd), 0)::numeric
FROM ledger_entries le
JOIN wallets w ON w.id = le.wallet_id
WHERE w.project_id = $1
  AND le.kind IN ('payment','swap_out','withdraw')
  AND le.created_at > now() - interval '24 hours';

-- name: SpendByDay :many
SELECT date_trunc('day', started_at) AS day,
       tool,
       SUM(COALESCE(actual_usd, estimate_usd))::numeric AS usd,
       COUNT(*)::bigint AS count
FROM calls
WHERE project_id = $1 AND status = 'succeeded' AND started_at > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1 DESC;

-- name: CreateApproval :one
INSERT INTO approvals (project_id, type, payload, challenge, threshold, signatures, status, created_by, expires_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetApproval :one
SELECT * FROM approvals WHERE id = $1;

-- name: GetPendingApprovalsByProject :many
SELECT * FROM approvals
WHERE project_id = $1 AND status = 'pending'
ORDER BY created_at DESC;

-- name: UpdateApprovalSignatures :one
UPDATE approvals
SET signatures = $2,
    status = $3,
    result_tx_id = COALESCE($4, result_tx_id)
WHERE id = $1
RETURNING *;

-- name: ReconcileWalletBalances :many
SELECT w.id AS wallet_id,
       w.project_id,
       w.usdc_balance,
       COALESCE(SUM(le.amount), 0)::numeric AS ledger_sum,
       (w.usdc_balance - COALESCE(SUM(le.amount), 0))::numeric AS diff
FROM wallets w
LEFT JOIN ledger_entries le ON le.wallet_id = w.id AND le.asset = 'USDC'
GROUP BY w.id, w.project_id, w.usdc_balance
HAVING w.usdc_balance != COALESCE(SUM(le.amount), 0);

-- name: GetAllActiveProjects :many
SELECT * FROM projects WHERE status = 'active' ORDER BY created_at DESC;

