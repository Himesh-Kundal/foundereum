---
name: security-threat-model-review
description: >-
  Use this skill to review new code, PRs, or architecture changes against Foundereum's
  threat model (docs/08-security.md). Checks prompt injection guardrails, allowlists,
  replay attacks, Privy policy checks, and key isolation.
---

# Security & Threat-Model Review Checklist

Review all changes against this checklist before merging or deploying.

## 1. Threat Matrix Audit

| Threat | Core Risk | Required Defense |
|---|---|---|
| **Prompt Injection Drain** | LLM persuaded to send funds to attacker | 1. Gateway constructs payment txs with fixed `payTo`; LLM arguments cannot set payment destination.<br/>2. Privy policy enforces `default_action: DENY`.<br/>3. External subgraph / web output MUST be prefixed with `data (untrusted):`. |
| **Payment Replay Attack** | Re-sending an `X-PAYMENT` header | 1. Nonce consumed atomically via Redis `GETDEL`.<br/>2. Postgres `payments.nonce` has a `UNIQUE` constraint.<br/>3. Hedera network rejects duplicate `TransactionID`s. |
| **Key Extraction / Privilege Escalation** | Compromise of gateway or API | 1. Gateway never holds root/treasury keys; holds only sign-only Privy authorization key.<br/>2. Gateway cannot alter Privy policies (only `cmd/api` with owner JWT + quorum).<br/>3. API keys are hashed with `sha256` at rest. |
| **Treasury Drain by Rogue Member** | Rogue operator withdrawing all funds | 1. Withdrawals above threshold require m-of-n P-256 WebCrypto key quorum signatures.<br/>2. Policy modifications require quorum approval when enabled. |
| **Facilitator Spam / Fee Drain** | Flooding fake payments to exhaust platform gas | 1. Preflight association and balance checks.<br/>2. Per-key rate limiting (token bucket: 10 rps, burst 30 in Redis). |
| **Metering Evasion** | Requesting huge data on tiny estimate | 1. Query size capped at 8 KB, `first` capped at 1000.<br/>2. Response capped at 256 KB.<br/>3. Carry overage tracked on `api_keys.carry_usd`; key suspended if unpaid carry > $0.05. |

---

## 2. Privy Policy & Selector Allowlist Guardrails

Whenever adding an EVM action:
1. Verify the target contract is in `allowlisted-contracts` (`0xSaucerRouter`, `0xUSDC`, `0xAgentIdentityRegistry`).
2. Verify the 4-byte selector is in `allowlisted-selectors`:
   - `0x095ea7b3` (`approve(address,uint256)`)
   - `0x38ed1739` (`swapExactTokensForTokens(...)`)
   - `0x18cbafe5` (`swapExactTokensForETH(...)`)
   - `0x...` (`register(string,address,bytes32)`)
3. Verify that value is capped (e.g. `per-tx-value-cap`).
4. Note on Hedera native calls: `raw_sign` is only permitted for HTS payments and token associations built exclusively by internal code. Treasury wallets never have `raw_sign` enabled.

---

## 3. Code Review Verification Checklist

- [ ] **No User-Supplied Payment Destinations:** Is `payTo` hardcoded to the platform account?
- [ ] **No Floats:** Are all balance and fee operations using `shopspring/decimal.Decimal` or integer base units?
- [ ] **Prefix Untrusted Data:** Does data from subgraphs, mirror nodes, or external APIs have the `data (untrusted): ` prefix before being returned to agents?
- [ ] **Proper Transaction Scope:** Are ledger mutations, payment records, and call status updates wrapped in a single Postgres transaction (`pgx.Tx`)?
- [ ] **Input Sanitization:** Are token symbols strictly validated against allowlists? Are addresses validated with EIP-55 checksums or Hedera entity format (`0.0.x`)?
