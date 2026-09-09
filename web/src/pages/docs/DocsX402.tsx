import { Cell } from '../../components/Cell';
import { TerminalBlock } from '../../components/TerminalBlock';

export function DocsX402() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="border border-ink bg-paper2 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-forge inline-block"></span>
          <span className="text-xs uppercase tracking-wider text-ink-mut font-bold">Protocol Specification</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-display uppercase tracking-tight text-ink">
          The HTTP 402 Payment Lifecycle
        </h2>
        <p className="text-sm md:text-base text-ink leading-relaxed">
          Foundereum implements the <strong>x402 specification</strong> for machine-to-machine agentic commerce. 
          Agents never require human intervention, pre-paid seat licenses, or credit card top-ups. Each tool 
          invocation negotiates an on-demand micropayment challenge settled directly in Hedera Token Service (HTS) USDC.
        </p>
      </div>

      {/* 5-Step Lifecycle Sequence */}
      <Cell title="5-STEP PAYMENT & SETTLEMENT LIFECYCLE" number="01">
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <TerminalBlock>{`AI Agent (MCP)              Foundereum Gateway            Privy TEE Enclave        Blocky402 / Hedera
      │                             │                             │                         │
  [1] │ POST /v1/tools/:name        │                             │                         │
      ├────────────────────────────►│                             │                         │
      │                             │ [Calculates Price + Nonce]  │                         │
  [2] │ 402 Payment Required        │                             │                         │
      │◄────────────────────────────┤                             │                         │
      │                             │                             │                         │
  [3] │ POST /v1/payments/build     │                             │                         │
      ├────────────────────────────►│ Checks Velocity & Allowlist │                         │
      │                             ├────────────────────────────►│ Signs TransferTx bytes  │
      │                             │◄────────────────────────────┤ (raw_sign in enclave)   │
      │ 200 {x_payment: base64}     │                             │                         │
      │◄────────────────────────────┤                             │                         │
      │                             │                             │                         │
  [4] │ POST /v1/tools/:name        │                             │                         │
      │ Header: X-PAYMENT: <base64> │                             │                         │
      ├────────────────────────────►│ Consumes Nonce (GETDEL)     │                         │
      │                             ├──────────────────────────────────────────────────────►│ Preflights & Countersigns
      │                             │                             │                         │ Submits HTS transfer
  [5] │                             │◄──────────────────────────────────────────────────────┤ Returns Hedera TxID
      │                             │ Executes Tool & Publishes HCS Audit Log               │
      │ 200 OK + Tool Result        │                             │                         │
      │◄────────────────────────────┤                             │                         │`}</TerminalBlock>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-forge uppercase block mb-1">Step 1: Initial Tool Invocation</span>
              <p className="text-ink-mut">
                The agent initiates an execution request with <code>POST /v1/tools/{'{tool_name}'}</code> containing 
                its API key and an <code>Idempotency-Key</code> header.
              </p>
            </div>

            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-forge uppercase block mb-1">Step 2: 402 Payment Challenge</span>
              <p className="text-ink-mut">
                The gateway calculates the exact estimated price (base fee + payload estimate), issues a cryptographically 
                random nonce in Redis (TTL 120s), and returns HTTP 402 with network settlement parameters.
              </p>
            </div>

            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-forge uppercase block mb-1">Step 3: Enclave Payment Signing</span>
              <p className="text-ink-mut">
                The MCP client requests a payment bundle via <code>POST /v1/payments/build</code>. The gateway checks 
                spending policies and invokes Privy's TEE to sign the partial <code>TransferTransaction</code> without 
                exposing the key.
              </p>
            </div>

            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-forge uppercase block mb-1">Step 4 & 5: Settlement & Execution</span>
              <p className="text-ink-mut">
                The agent retries the call with <code>X-PAYMENT</code>. The nonce is consumed atomically, Blocky402 
                countersigns and pays network gas fees, the HTS USDC moves, the upstream tool executes, and HCS records the audit.
              </p>
            </div>
          </div>
        </div>
      </Cell>

      {/* Wire Format Specifications */}
      <Cell title="PROTOCOL WIRE FORMAT SPECIFICATIONS" number="02">
        <div className="flex flex-col gap-6 text-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold uppercase text-ink">A. HTTP 402 Challenge Payload</span>
              <span className="text-[10px] text-ink-mut">Response from Gateway</span>
            </div>
            <TerminalBlock>{`HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "resource": "execute_subgraph_query",
  "nonce": "c8f12a76-92d4-4e78-b118-2e1a3b890f42",
  "expires": "2026-09-09T14:32:00Z",
  "pricing": {
    "estimate_usd": "0.000030",
    "rule": "base $0.00001 + $0.000002/KB * 10KB estimate",
    "carry_usd": "0.000000"
  },
  "accepts": [
    {
      "scheme": "hedera-exact",
      "network": "hedera-testnet",
      "asset": "0.0.429274",
      "amount": "30",
      "payTo": "0.0.5551234",
      "extra": {
        "memo": "fnd:c8f12a76",
        "maxTimeoutSeconds": 120
      }
    }
  ]
}`}</TerminalBlock>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold uppercase text-ink">B. Decoded X-PAYMENT Authorization</span>
              <span className="text-[10px] text-ink-mut">Base64 Encoded in Header</span>
            </div>
            <TerminalBlock>{`// X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiaGVkZXJhLWV4YWN0Iiwibm...
{
  "x402Version": 1,
  "scheme": "hedera-exact",
  "network": "hedera-testnet",
  "nonce": "c8f12a76-92d4-4e78-b118-2e1a3b890f42",
  "payload": {
    "transaction": "ChMKDRkS1gD/..." // Base64 partially-signed Hedera TransferTransaction
  }
}`}</TerminalBlock>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold uppercase text-ink">C. Settled 200 OK Response</span>
              <span className="text-[10px] text-ink-mut">Tool Result + Proof of Settlement</span>
            </div>
            <TerminalBlock>{`HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": {
    "pools": [
      { "id": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640", "totalValueLockedUSD": "184920412.50" }
    ]
  },
  "call_id": "call_98fa201b-c12e-4b67",
  "payment": {
    "hedera_tx_id": "0.0.5559876@1757301214.000000000",
    "amount": "30",
    "amount_usd": "0.000030",
    "hashscan_url": "https://hashscan.io/testnet/transaction/0.0.5559876@1757301214.000000000",
    "facilitator": "blocky402"
  },
  "metering": {
    "estimate_usd": "0.000030",
    "actual_usd": "0.000028",
    "actual_bytes": 9120,
    "carry_adjustment_usd": "-0.000002"
  },
  "latency_ms": 1140
}`}</TerminalBlock>
          </div>
        </div>
      </Cell>

      {/* Dynamic Metering & Carryover */}
      <Cell title="DYNAMIC METERING & CARRYOVER LEDGER" number="03">
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-ink">
            Unlike static paywalls, Foundereum meters variable-payload queries (such as GraphQL responses and EVM bytecode) 
            down to the exact byte. To avoid double round-trips:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-ink uppercase block mb-1">1. Upfront Estimate</span>
              <p className="text-ink-mut">
                The 402 challenge calculates an estimated fee: <code>base + (rate_per_kb * est_kb)</code>. The agent pays this estimate upfront.
              </p>
            </div>
            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-ink uppercase block mb-1">2. Exact Byte Metering</span>
              <p className="text-ink-mut">
                When upstream data returns, the gateway measures actual response bytes. If actual exceeds estimate, 
                an overage delta is computed.
              </p>
            </div>
            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-ink uppercase block mb-1">3. Nonce Carryover</span>
              <p className="text-ink-mut">
                Any overage is added to the agent's key carryover balance in the Postgres double-entry ledger, automatically 
                settled on the agent's next 402 challenge.
              </p>
            </div>
          </div>
        </div>
      </Cell>

      {/* Error Codes & Edge Cases */}
      <Cell title="ERROR CODES & PROTOCOL REJECTIONS" number="04">
        <div className="overflow-x-auto text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-ink bg-paper2 text-left">
                <th className="p-2.5 font-bold uppercase">Error Code</th>
                <th className="p-2.5 font-bold uppercase">HTTP Status</th>
                <th className="p-2.5 font-bold uppercase">Trigger Condition</th>
                <th className="p-2.5 font-bold uppercase">System Resolution</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink">
                <td className="p-2.5 font-mono text-forge font-bold">PAYMENT_REPLAYED</td>
                <td className="p-2.5">409 Conflict</td>
                <td className="p-2.5 text-ink-mut">Re-submission of already consumed or expired nonce</td>
                <td className="p-2.5">Gateway rejects atomically; fresh 402 challenge required</td>
              </tr>
              <tr className="border-b border-ink">
                <td className="p-2.5 font-mono text-err font-bold">POLICY_REJECTED</td>
                <td className="p-2.5">403 Forbidden</td>
                <td className="p-2.5 text-ink-mut">Spend exceeds daily cap or attempts unapproved contract call</td>
                <td className="p-2.5">Privy TEE blocks signature; requires operator policy change</td>
              </tr>
              <tr className="border-b border-ink">
                <td className="p-2.5 font-mono text-err font-bold">TREASURY_UNDERFUNDED</td>
                <td className="p-2.5">402 Payment Req.</td>
                <td className="p-2.5 text-ink-mut">Agent wallet USDC balance is below tool challenge amount</td>
                <td className="p-2.5">Top up agent wallet via Treasury or testnet faucet</td>
              </tr>
              <tr className="border-b border-ink">
                <td className="p-2.5 font-mono text-ink font-bold">CARRY_LIMIT_EXCEEDED</td>
                <td className="p-2.5">429 Too Many Req.</td>
                <td className="p-2.5 text-ink-mut">Unpaid metering overage exceeds safety floor ($0.05)</td>
                <td className="p-2.5">Agent must execute immediate settlement call to clear carry</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Cell>
    </div>
  );
}
