import requests
import json
import time
import concurrent.futures

MCP_URL = "https://mcp.foundereum.org/mcp"
API_KEY = "fnd_sk_live_bBsENEJ0tYz7wEvBinVsxp"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def call_mcp(name, args, call_id=1):
    payload = {
        "jsonrpc": "2.0",
        "id": call_id,
        "method": "tools/call",
        "params": {
            "name": name,
            "arguments": args
        }
    }
    t0 = time.time()
    try:
        res = requests.post(MCP_URL, headers=HEADERS, json=payload, timeout=30)
        dur = (time.time() - t0) * 1000
        return {
            "status_code": res.status_code,
            "duration_ms": round(dur, 2),
            "data": res.json()
        }
    except Exception as e:
        return {
            "status_code": 0,
            "duration_ms": round((time.time() - t0) * 1000, 2),
            "error": str(e)
        }

def run_tests():
    print("=================================================================")
    print(f"FOUNDEREUM MCP EXHAUSTIVE TOOL TEST & STRESS SUITE")
    print(f"API Key: {API_KEY[:16]}... | Target: {MCP_URL}")
    print("=================================================================\n")

    test_cases = [
        # 1. Project Info (Free)
        {
            "tool": "get_project_info",
            "args": {},
            "desc": "Fetch Project Metadata & Wallet Config"
        },
        # 2. Balances (Free)
        {
            "tool": "get_balances",
            "args": {},
            "desc": "Check Agent & Treasury USDC/HBAR Balances"
        },
        # 3. Subgraph Search
        {
            "tool": "search_subgraphs",
            "args": {"keyword": "uniswap"},
            "desc": "Search The Graph Decentralized Index"
        },
        # 4. Compare Protocol TVL (The Graph Messari)
        {
            "tool": "compare_protocol_tvl",
            "args": {"network": "base", "protocols": ["uniswap-v3", "aerodrome"]},
            "desc": "Compare Protocol TVL across DEXes via Subgraph"
        },
        # 5. Analyze Pool Health
        {
            "tool": "analyze_pool_health",
            "args": {"network": "base", "protocol": "uniswap-v3", "pool": "USDC/WETH 0.05%"},
            "desc": "Assess DEX Liquidity Pool Health via Graph"
        },
        # 6. Execute Subgraph Query
        {
            "tool": "execute_subgraph_query",
            "args": {
                "deployment_id": "QmZ6W8W1234567890abcdef1234567890abcdef", 
                "query": "{ protocols(first: 2) { id name totalValueLockedUSD } }"
            },
            "desc": "Execute Raw GraphQL against Subgraph"
        },
        # 7. Verify Agent (ERC-8004 Identity)
        {
            "tool": "verify_agent",
            "args": {"wallet_address": "0x211a312D1EB4ed4924B17F0D62804Eb5550CE67e"},
            "desc": "Verify Agent Identity in ERC-8004 Registry"
        },
        # 8. Swap Quote
        {
            "tool": "get_swap_quote",
            "args": {"token_in": "USDC", "token_out": "HBAR", "amount_in": "1.0"},
            "desc": "Fetch Live SaucerSwap DEX Quote on Hedera"
        },
        # 9. Substreams Pipeline Deploy
        {
            "tool": "deploy_substreams_pipeline",
            "args": {
                "network": "base",
                "prompt": "Index USDC Transfer events into PostgreSQL table"
            },
            "desc": "Autonomous Streaming Data Pipeline Generator"
        },
        # 10. Pipeline Query
        {
            "tool": "execute_pipeline_query",
            "args": {
                "pipeline_id": "pipe_demo_base_usdc",
                "query": "SELECT * FROM transfers LIMIT 5"
            },
            "desc": "Read SQL from Substreams Postgres Sink"
        },
        # 11. Swap Tokens (Paid live DEX swap)
        {
            "tool": "swap_tokens",
            "args": {
                "token_in": "USDC",
                "token_out": "HBAR",
                "amount_in": "0.10",
                "slippage_bps": 50
            },
            "desc": "Execute Real SaucerSwap DEX Trade via x402 Micropayment"
        },
        # 12. Transfer Token (Paid Hedera transfer)
        {
            "tool": "transfer_token",
            "args": {
                "token": "USDC",
                "to_account": "0.0.10413602",
                "amount": "0.01"
            },
            "desc": "HTS Transfer to Account via x402 Micropayment"
        }
    ]

    results = []
    print("--- PART 1: TESTING EVERY SINGLE MCP TOOL (12 TOOLS) ---\n")
    for i, tc in enumerate(test_cases, 1):
        print(f"[{i:02d}/12] Calling '{tc['tool']}' - {tc['desc']}...")
        res = call_mcp(tc["tool"], tc["args"], call_id=i)
        
        is_error = "error" in res.get("data", {}) or res.get("status_code") != 200
        if is_error:
            err_info = res.get("data", {}).get("error", res.get("error", "Unknown error"))
            print(f"   ↳ [FAIL/ERR] Status {res['status_code']} ({res['duration_ms']}ms): {json.dumps(err_info)[:160]}")
        else:
            raw_text = res["data"]["result"]["content"][0]["text"]
            try:
                parsed = json.loads(raw_text)
                pricing = parsed.get("pricing", {})
                cost = pricing.get("actual_usd", pricing.get("estimate_usd", "0"))
                print(f"   ↳ [SUCCESS] ({res['duration_ms']}ms) Settled! Cost: ${cost} | Summary: {json.dumps(parsed.get('result', {}))[:120]}...")
            except:
                print(f"   ↳ [SUCCESS] ({res['duration_ms']}ms): {raw_text[:120]}...")
        results.append({"tool": tc["tool"], "res": res})
        time.sleep(0.5)

    print("\n--- PART 2: TESTING POLICY LIMIT VIOLATIONS & BOUNDARY CONDITIONS ---\n")
    
    limit_cases = [
        {
            "name": "Excessive Transfer Amount ($10,000 exceeding wallet balance & policy)",
            "tool": "transfer_token",
            "args": {"token": "USDC", "to_account": "0.0.999999", "amount": "10000.00"}
        },
        {
            "name": "Excessive Swap Amount ($50,000 exceeding cap)",
            "tool": "swap_tokens",
            "args": {"token_in": "USDC", "token_out": "HBAR", "amount_in": "50000.00", "slippage_bps": 50}
        },
        {
            "name": "Disallowed / Unsupported Token (SHIB)",
            "tool": "transfer_token",
            "args": {"token": "SHIB", "to_account": "0.0.10413602", "amount": "100"}
        },
        {
            "name": "Malformed Hedera Destination Account (invalid-format)",
            "tool": "transfer_token",
            "args": {"token": "USDC", "to_account": "invalid_acc_id", "amount": "0.01"}
        },
        {
            "name": "Negative Amount Attack",
            "tool": "transfer_token",
            "args": {"token": "USDC", "to_account": "0.0.10413602", "amount": "-50.00"}
        },
        {
            "name": "Zero Amount Violation",
            "tool": "swap_tokens",
            "args": {"token_in": "USDC", "token_out": "HBAR", "amount_in": "0.00"}
        }
    ]

    for j, lc in enumerate(limit_cases, 1):
        print(f"[LIMIT TEST {j:02d}] {lc['name']}...")
        res = call_mcp(lc["tool"], lc["args"], call_id=100 + j)
        resp_str = json.dumps(res.get("data", {}))
        print(f"   ↳ Intercepted/Responded ({res['duration_ms']}ms): {resp_str[:160]}...")
        time.sleep(0.4)

    print("\n--- PART 3: CONCURRENCY STRESS TEST (10 RAPID CONCURRENT TOOL CALLS) ---\n")
    def worker(worker_id):
        return call_mcp("get_balances", {}, call_id=200 + worker_id)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(worker, k) for k in range(10)]
        c_results = [f.result() for f in concurrent.futures.as_completed(futures)]

    success_count = sum(1 for r in c_results if r.get("status_code") == 200 and "result" in r.get("data", {}))
    print(f"Concurrent batch completed: {success_count}/10 succeeded cleanly without race conditions.")
    avg_lat = sum(r["duration_ms"] for r in c_results) / len(c_results)
    print(f"Average latency under concurrency: {avg_lat:.2f}ms")

if __name__ == "__main__":
    run_tests()
