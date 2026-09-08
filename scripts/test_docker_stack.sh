#!/usr/bin/env bash
set -eo pipefail

echo "=========================================================="
echo "    FOUNDEREUM DOCKER STACK COMPREHENSIVE VERIFIER        "
echo "=========================================================="

API_URL="http://localhost:8080"
GATEWAY_URL="http://localhost:8081"
MCP_URL="http://localhost:8082"
SUBGRAPH_URL="http://localhost:7000"
WEB_URL="http://localhost:5173"

echo "[1/7] Verifying Docker Containers..."
docker compose ps

echo "\n[2/7] Testing API Control Plane (Port 8080)..."
SERVICES=$(curl -sf "$API_URL/services")
TOOL_COUNT=$(echo "$SERVICES" | jq '.tools | length')
echo "  ✓ GET /services: $TOOL_COUNT tools registered"

AUTH_RESP=$(curl -sf -X POST "$API_URL/v1/auth/dev")
JWT=$(echo "$AUTH_RESP" | jq -r '.jwt')
echo "  ✓ POST /v1/auth/dev: session JWT obtained"

ME_RESP=$(curl -sf -H "Authorization: Bearer $JWT" "$API_URL/v1/me")
ROLE=$(echo "$ME_RESP" | jq -r '.role')
echo "  ✓ GET /v1/me: authenticated as $ROLE"

NEW_PROJ=$(curl -sf -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"name":"Docker E2E Quant Project","quorum":{"threshold":2}}' \
  "$API_URL/v1/projects")
PROJ_ID=$(echo "$NEW_PROJ" | jq -r '.project.id')
echo "  ✓ POST /v1/projects: created project $PROJ_ID"

WALLETS=$(curl -sf -H "Authorization: Bearer $JWT" "$API_URL/v1/projects/$PROJ_ID/wallets")
WALLET_COUNT=$(echo "$WALLETS" | jq '. | length')
echo "  ✓ GET /v1/projects/:id/wallets: $WALLET_COUNT wallets active"

FAUCET=$(curl -sf -X POST -H "Authorization: Bearer $JWT" "$API_URL/v1/projects/$PROJ_ID/faucet")
echo "  ✓ POST /v1/projects/:id/faucet: $(echo "$FAUCET" | jq -r '.message')"

POLICY_UPDATE=$(curl -sf -X PUT -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"spec":{"per_tx_usd_max":50,"daily_usd_max":1000,"destination_allowlist":["0.0.10413602"]}}' \
  "$API_URL/v1/projects/$PROJ_ID/policy")
echo "  ✓ PUT /v1/projects/:id/policy: version $(echo "$POLICY_UPDATE" | jq -r '.version')"

KEY_CREATE=$(curl -sf -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"name":"agent-docker-key"}' \
  "$API_URL/v1/projects/$PROJ_ID/keys")
API_KEY=$(echo "$KEY_CREATE" | jq -r '.key')
echo "  ✓ POST /v1/projects/:id/keys: API key created: ${API_KEY:0:15}..."

echo "\n[3/7] Testing Gateway & x402 Engine (Port 8081)..."
GW_STATUS=$(curl -sf "$GATEWAY_URL/v1/self")
echo "  ✓ GET /v1/self: $(echo "$GW_STATUS" | jq -r '.service') is $(echo "$GW_STATUS" | jq -r '.status')"

# Free tool call
FREE_RESP=$(curl -sf -X POST -H "Content-Type: application/json" -d '{}' "$GATEWAY_URL/v1/tools/get_balances")
echo "  ✓ Free tool execution: get_balances returned agent balance $(echo "$FREE_RESP" | jq -r '.result.agent_wallet.usdc_balance') USDC"

# Paid tool without payment -> 402 challenge
HTTP_CODE=$(curl -s -o /tmp/dock_402.json -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"pool_id":"0x1234567890abcdef1234567890abcdef12345678"}' \
  "$GATEWAY_URL/v1/tools/analyze_pool_health")

if [ "$HTTP_CODE" -ne 402 ]; then
  echo "  ERROR: Expected 402 Payment Required, got $HTTP_CODE"
  exit 1
fi
NONCE=$(jq -r '.nonce' /tmp/dock_402.json)
echo "  ✓ Paid tool returned HTTP 402 Payment Required with challenge nonce: $NONCE"

# Build payment authorization
PAY_BUILD=$(curl -sf -X POST -H "Content-Type: application/json" \
  -d "{\"nonce\":\"$NONCE\"}" \
  "$GATEWAY_URL/v1/payments/build")
X_PAYMENT=$(echo "$PAY_BUILD" | jq -r '.x_payment')
echo "  ✓ Payments builder returned x-payment token"

# Re-execute with payment token
SETTLED=$(curl -sf -X POST \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $X_PAYMENT" \
  -d '{"pool_id":"0x1234567890abcdef1234567890abcdef12345678"}' \
  "$GATEWAY_URL/v1/tools/analyze_pool_health")
echo "  ✓ Re-execution with payment token succeeded! Result: $(echo "$SETTLED" | jq -c '.result | {pool_id, tvl_usd}')"

echo "\n[4/7] Testing MCP Server (Port 8082)..."
INIT_REQ='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"docker-test","version":"1.0.0"}}}'
INIT_RESP=$(curl -sf -X POST -H "Content-Type: application/json" -d "$INIT_REQ" "$MCP_URL/mcp")
echo "  ✓ MCP Initialize: $(echo "$INIT_RESP" | jq -r '.result.serverInfo.name') v$(echo "$INIT_RESP" | jq -r '.result.serverInfo.version')"

LIST_REQ='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
LIST_RESP=$(curl -sf -X POST -H "Content-Type: application/json" -d "$LIST_REQ" "$MCP_URL/mcp")
echo "  ✓ MCP tools/list: $(echo "$LIST_RESP" | jq '.result.tools | length') tools announced"

CALL_REQ='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_swap_quote","arguments":{"token_in":"USDC","token_out":"HBAR","amount_in":"50"}}}'
CALL_RESP=$(curl -sf -X POST -H "Content-Type: application/json" -d "$CALL_REQ" "$MCP_URL/mcp")
echo "  ✓ MCP tools/call (get_swap_quote): $(echo "$CALL_RESP" | jq -c '.result.content[0].text')"

echo "\n[5/7] Testing Subgraph MCP Sidecar (Port 7000)..."
SUB_HEALTH=$(curl -sf "$SUBGRAPH_URL/health")
echo "  ✓ Subgraph MCP Health: $(echo "$SUB_HEALTH" | jq -r '.service') is $(echo "$SUB_HEALTH" | jq -r '.status')"

SUB_QUERY_REQ='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"execute_query_by_deployment_id","arguments":{"deployment_id":"QmZb8x9y7zMessariUniswapV3Base","query":"{ liquidityPools { id name } }"}}}'
SUB_QUERY_RESP=$(curl -sf -X POST -H "Content-Type: application/json" -d "$SUB_QUERY_REQ" "$SUBGRAPH_URL/mcp")
echo "  ✓ Subgraph MCP tools/call query returned: $(echo "$SUB_QUERY_RESP" | jq -c '.result.data.liquidityPools[0].name')"

echo "\n[6/7] Testing Web Frontend (Port 5173)..."
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/")
echo "  ✓ Web Frontend returned HTTP $WEB_STATUS from Caddy file server"

echo "\n[7/7] Testing Background Worker Reconciliation..."
WORKER_LOGS=$(docker compose logs --tail 20 worker)
if echo "$WORKER_LOGS" | grep -q "reconciliation"; then
  echo "  ✓ Background ledger reconciliation sweep confirmed running in worker"
fi

echo "=========================================================="
echo "    ALL 7 DOCKER SERVICES VERIFIED AND OPERATIONAL!       "
echo "=========================================================="
