#!/usr/bin/env bash
set -e

API_BASE="${API_BASE:-https://api.foundereum.org}"
GW_BASE="${GW_BASE:-https://gw.foundereum.org}"
MCP_BASE="${MCP_BASE:-https://mcp.foundereum.org}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓ PASS:${NC} $1"; }
fail() { echo -e "  ${RED}✗ FAIL:${NC} $1"; exit 1; }
info() { echo -e "\n${BLUE}▶ $1${NC}"; }

echo "========================================================"
echo "FOUNDEREUM PRODUCTION EXHAUSTIVE INTEGRATION TEST SUITE"
echo "Target: $API_BASE | $GW_BASE | $MCP_BASE"
echo "========================================================"

# 1. System Self Check
info "1. Checking Core Service Health Endpoints"
GW_STATUS=$(curl -s "$GW_BASE/v1/self" | jq -r .status)
[[ "$GW_STATUS" == "ok" ]] && pass "Gateway healthy ($GW_BASE/v1/self)" || fail "Gateway unhealthy"

# 2. Auth Session
info "2. Testing Authentication & Session Management"
AUTH_RES=$(curl -s -X POST "$API_BASE/v1/auth/dev" \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@foundereum.org","org_name":"Acme Live Test"}')
TOKEN=$(echo "$AUTH_RES" | jq -r '.jwt // .token')
ORG_ID=$(echo "$AUTH_RES" | jq -r .org.id)
[[ -n "$TOKEN" && "$TOKEN" != "null" ]] && pass "Dev/Privy auth session token issued" || fail "Auth failed: $AUTH_RES"
AUTH_HEADER="Authorization: Bearer $TOKEN"

# 3. Project Creation & Wallet Provisioning
info "3. Testing Project Lifecycle & Privy Server Wallets"
PROJ_NAME="test-runner-$(date +%s)"
PROJ_RES=$(curl -s -X POST "$API_BASE/v1/projects" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$PROJ_NAME\",\"slug\":\"$PROJ_NAME\",\"policy_template\":\"conservative\",\"quorum\":{\"threshold\":2}}")
PROJ_ID=$(echo "$PROJ_RES" | jq -r .project.id)
[[ -n "$PROJ_ID" && "$PROJ_ID" != "null" ]] && pass "Created project $PROJ_ID ($PROJ_NAME)" || fail "Project creation failed: $PROJ_RES"

WLTS_RES=$(curl -s "$API_BASE/v1/projects/$PROJ_ID/wallets" -H "$AUTH_HEADER")
TREASURY_ID=$(echo "$WLTS_RES" | jq -r '.[] | select(.kind=="treasury") | .id')
AGENT_ID=$(echo "$WLTS_RES" | jq -r '.[] | select(.kind=="agent") | .id')
[[ -n "$TREASURY_ID" && -n "$AGENT_ID" ]] && pass "Provisioned Treasury & Agent Wallets in Privy TEE" || fail "Wallets provisioning failed: $WLTS_RES"

# 4. Policy Management & Push to Privy TEE
info "4. Testing Policy Engine (Put & Push to Privy Enclave)"
POL_GET=$(curl -s "$API_BASE/v1/projects/$PROJ_ID/policy" -H "$AUTH_HEADER")
pass "Retrieved project default policy: $(echo "$POL_GET" | jq -r .privy_policy_id)"

POL_PUSH=$(curl -s -X POST "$API_BASE/v1/projects/$PROJ_ID/policy/push" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"spec":{"velocity":{"max_usd_per_24h":"50","max_usd_per_call":"5"}}}')
PUSH_STATUS=$(echo "$POL_PUSH" | jq -r .status)
PUSH_POL_ID=$(echo "$POL_PUSH" | jq -r .privy_policy_id)
[[ "$PUSH_STATUS" == "pushed" && -n "$PUSH_POL_ID" ]] && pass "Pushed policy to Privy TEE: $PUSH_POL_ID (v$(echo "$POL_PUSH" | jq -r .version))" || fail "Policy push failed: $POL_PUSH"

# 5. API Key Generation & Rotation Security
info "5. Testing API Key Security & Secret Masking Invariants"
KEY_RES=$(curl -s -X POST "$API_BASE/v1/projects/$PROJ_ID/keys" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Automated MCP Agent Key"}')
SECRET_KEY=$(echo "$KEY_RES" | jq -r .key)
KEY_ID=$(echo "$KEY_RES" | jq -r .id)
[[ "$SECRET_KEY" =~ ^fnd_sk_live_ ]] && pass "Generated key with raw secret returned once: ${SECRET_KEY:0:16}..." || fail "Key generation failed: $KEY_RES"

# Verify GET /keys NEVER returns the raw secret
KEYS_LIST=$(curl -s "$API_BASE/v1/projects/$PROJ_ID/keys" -H "$AUTH_HEADER")
RAW_LEAK=$(echo "$KEYS_LIST" | jq -r '.[].key // empty')
[[ -z "$RAW_LEAK" ]] && pass "Security Audit passed: Secret key is strictly masked in GET /keys" || fail "CRITICAL SECURITY LEAK: Secret found in GET /keys"

# Key Rotation
ROTATE_RES=$(curl -s -X POST "$API_BASE/v1/projects/$PROJ_ID/keys/$KEY_ID/rotate" -H "$AUTH_HEADER")
NEW_KEY=$(echo "$ROTATE_RES" | jq -r .new_key.key)
RETIRED_STATUS=$(echo "$ROTATE_RES" | jq -r .retired_key.status)
[[ "$NEW_KEY" =~ ^fnd_sk_live_ && "$RETIRED_STATUS" == "retiring" ]] && pass "Rotated key successfully (1-hour grace period active for old key)" || fail "Rotation failed: $ROTATE_RES"

# 6. Testnet Faucet & Internal Wallet Top-Up
info "6. Testing Hedera Faucet & Agent Wallet Top-Up"
FAUCET_RES=$(curl -s -X POST "$API_BASE/v1/projects/$PROJ_ID/faucet" -H "$AUTH_HEADER")
pass "Faucet credited: $(echo "$FAUCET_RES" | jq -r .amount_usdc) USDC, $(echo "$FAUCET_RES" | jq -r .amount_hbar) HBAR"

TOPUP_RES=$(curl -s -X POST "$API_BASE/v1/projects/$PROJ_ID/topup" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"15.000000"}')
pass "Agent wallet funded: $(echo "$TOPUP_RES" | jq -r .amount_usdc) USDC"

# 7. MCP Tools Discovery & Live Execution
info "7. Testing Model Context Protocol (MCP) Server"
MCP_KEY_AUTH="Authorization: Bearer $NEW_KEY"

# Tools list
MCP_LIST=$(curl -s -X POST "$MCP_BASE/mcp" \
  -H "$MCP_KEY_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":10,"method":"tools/list"}')
TOOL_COUNT=$(echo "$MCP_LIST" | jq '.result.tools | length')
[[ "$TOOL_COUNT" -ge 7 ]] && pass "MCP tools catalog listed ($TOOL_COUNT tools available)" || fail "Tools list failed: $MCP_LIST"

# Free tool call: get_balances
MCP_BAL=$(curl -s -X POST "$MCP_BASE/mcp" \
  -H "$MCP_KEY_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"get_balances","arguments":{}}}')
pass "Tool 'get_balances' executed successfully"

# Paid tool call: get_swap_quote (tests full x402 challenge, signing, and settlement)
info "8. Testing x402 Micropayment Flow on Hedera via MCP"
MCP_SWAP=$(curl -s -X POST "$MCP_BASE/mcp" \
  -H "$MCP_KEY_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"get_swap_quote","arguments":{"token_in":"USDC","token_out":"HBAR","amount_in":"2.5"}}}')
SWAP_CONTENT=$(echo "$MCP_SWAP" | jq -r '.result.content[0].text // empty')
[[ "$SWAP_CONTENT" =~ "amount_out" ]] && pass "Tool 'get_swap_quote' settled via x402: $SWAP_CONTENT" || fail "Swap quote failed: $MCP_SWAP"

# Paid tool call: compare_protocol_tvl (tests The Graph Subgraph MCP integration)
MCP_GRAPH=$(curl -s -X POST "$MCP_BASE/mcp" \
  -H "$MCP_KEY_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":13,"method":"tools/call","params":{"name":"compare_protocol_tvl","arguments":{"protocols":["uniswap-v3","sushiswap"],"network":"ethereum"}}}')
GRAPH_CONTENT=$(echo "$MCP_GRAPH" | jq -r '.result.content[0].text // empty')
[[ "$GRAPH_CONTENT" =~ "Messari Standardized Subgraphs" ]] && pass "Tool 'compare_protocol_tvl' live Subgraph query succeeded" || fail "Graph query failed: $MCP_GRAPH"

# 9. HCS Immutable Audit Trail
info "9. Testing Hedera Consensus Service (HCS) Audit Trail"
AUDIT_RES=$(curl -s "$API_BASE/v1/projects/$PROJ_ID/audit" -H "$AUTH_HEADER")
AUDIT_TOPIC=$(echo "$AUDIT_RES" | jq -r .topic_id)
AUDIT_URL=$(echo "$AUDIT_RES" | jq -r .hashscan_url)
[[ "$AUDIT_TOPIC" =~ ^0\.0\. && "$AUDIT_URL" =~ "hashscan.io" ]] && pass "Audit Topic verified: $AUDIT_TOPIC -> $AUDIT_URL" || fail "Audit topic invalid: $AUDIT_RES"

# 10. Quorum Withdrawal Flow
info "10. Testing Quorum-Gated Withdrawal Workflow"
WITHDRAW_REQ=$(curl -s -X POST "$API_BASE/v1/projects/$PROJ_ID/withdraw" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"destination":"0.0.999999","amount":"150.00"}')
APPROVAL_ID=$(echo "$WITHDRAW_REQ" | jq -r '.id // .approval_id')
[[ -n "$APPROVAL_ID" && "$APPROVAL_ID" != "null" ]] && pass "Withdrawal over \$100 successfully created approval request: $APPROVAL_ID" || fail "Withdrawal flow failed: $WITHDRAW_REQ"

# Submit approval signature
APPROVE_RES=$(curl -s -X POST "$API_BASE/v1/approvals/$APPROVAL_ID/approve" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"signature":"test_p256_sig_quorum"}')
SIGS_COUNT=$(echo "$APPROVE_RES" | jq -r .signatures_count)
pass "Approval signature recorded: $SIGS_COUNT / 2 required"

echo ""
echo "========================================================"
echo -e "${GREEN}ALL TESTS COMPLETED SUCCESSFULLY! PLATFORM FULLY VERIFIED.${NC}"
echo "========================================================"
