import { Cell } from '../../components/Cell';
import { TerminalBlock } from '../../components/TerminalBlock';

export function DocsHedera() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="border border-ink bg-paper2 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-forge inline-block"></span>
          <span className="text-xs uppercase tracking-wider text-ink-mut font-bold">Consensus & Settlement</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-display uppercase tracking-tight text-ink">
          Hedera Hashgraph & Blocky402 Settlement
        </h2>
        <p className="text-sm md:text-base text-ink leading-relaxed">
          Foundereum settles every agent payment natively on the <strong>Hedera testnet</strong>. Hedera was chosen 
          because autonomous machine-to-machine commerce requires high throughput, sub-3-second deterministic finality, 
          and fixed sub-cent transaction fees that never fluctuate with network congestion.
        </p>
      </div>

      {/* Why Hedera Comparison */}
      <Cell title="1. WHY HEDERA FOR AGENTIC MICROPAYMENTS" number="01">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="border border-ink p-4 bg-paper flex flex-col gap-2">
            <span className="font-bold text-forge uppercase">Sub-3s Deterministic Finality</span>
            <p className="text-ink-mut leading-relaxed">
              Unlike probabilistic PoW/PoS chains where blocks can reorg, Hedera uses asynchronous Byzantine Agreement 
              (aBFT). When a transaction is signed, finality is 100% deterministic within 2.5 seconds.
            </p>
          </div>

          <div className="border border-ink p-4 bg-paper flex flex-col gap-2">
            <span className="font-bold text-forge uppercase">Predictable USD-Pegged Fees</span>
            <p className="text-ink-mut leading-relaxed">
              Hedera fees are fixed in USD and converted to HBAR at consensus time. An HTS token transfer costs exactly 
              <strong> $0.0001 USD</strong>, making $0.00003 micropayments commercially viable.
            </p>
          </div>

          <div className="border border-ink p-4 bg-paper flex flex-col gap-2">
            <span className="font-bold text-forge uppercase">Native Tokens (HTS)</span>
            <p className="text-ink-mut leading-relaxed">
              Tokens exist at the ledger level, not in high-gas EVM bytecode. Transfers do not execute arbitrary EVM code, 
              eliminating reentrancy and token approval drain vectors.
            </p>
          </div>
        </div>
      </Cell>

      {/* Account Bootstrapping & Token Association */}
      <Cell title="2. ACCOUNT BOOTSTRAP & EVM ALIAS DERIVATION" number="02">
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-ink">
            When a new project is created in Foundereum, Privy generates standard secp256k1 Ethereum keypairs. 
            Hedera accounts (in <code>0.0.X</code> notation) are automatically bootstrapped through Hedera's EVM alias system:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-ink uppercase block mb-1">Step A: Auto-Creation Transfer</span>
              <p className="text-ink-mut">
                The platform operator sends an initial 5 HBAR transfer to the EVM alias address (e.g. <code>0x742d...bD18</code>). 
                Hedera's consensus nodes automatically allocate a durable <code>0.0.X</code> account number.
              </p>
            </div>

            <div className="border border-ink p-3 bg-paper">
              <span className="font-bold text-ink uppercase block mb-1">Step B: Token Association</span>
              <p className="text-ink-mut">
                Before holding HTS USDC (<code>0.0.429274</code>), the account must execute a <code>TokenAssociateTransaction</code>. 
                Foundereum orchestrates this automatically using Privy's <code>raw_sign</code> during project setup.
              </p>
            </div>
          </div>
        </div>
      </Cell>

      {/* Blocky402 Facilitator */}
      <Cell title="3. BLOCKY402 FACILITATOR (GASLESS AGENT EXPERIENCE)" number="03">
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-ink">
            In standard Web3 architectures, every agent wallet must hold both native gas tokens (HBAR) and payment tokens (USDC). 
            Managing gas reserves across hundreds of agents causes operational failure. Foundereum eliminates this via 
            <strong> Blocky402 settlement facilitation</strong>:
          </p>

          <TerminalBlock>{`// TransferTransaction Wire Construction
TransferTransaction tx = new TransferTransaction()
    .addTokenTransfer(USDC_TOKEN_ID, agentAccountId, -30)      // Agent pays exact USDC
    .addTokenTransfer(USDC_TOKEN_ID, platformAccountId, +30)   // Platform receives exact USDC
    .setTransactionID(agentAccountId)                          // Agent nonce
    .setTransactionMemo("fnd:nonce_c8f12a76")                  // Unique challenge memo
    .freezeWith(client);

// 1. Agent signs partial transaction in Privy TEE enclave
byte[] agentSignature = privyClient.rawSign(keccak256(tx.toBytes()));
tx.addSignature(agentPublicKey, agentSignature);

// 2. Blocky402 Facilitator acts as Fee Payer
// Facilitator countersigns with fee-payer key, pays HBAR network fee, and submits to Hedera.
// Result: Zero HBAR required in agent wallet for payments!`}</TerminalBlock>
        </div>
      </Cell>

      {/* HCS Audit Trail */}
      <Cell title="4. HEDERA CONSENSUS SERVICE (HCS) AUDIT TRAIL" number="04">
        <div className="flex flex-col gap-4 text-xs leading-relaxed">
          <p className="text-ink">
            Every settled payment is mirrored asynchronously to a project-specific <strong>Hedera Consensus Service (HCS) topic</strong>. 
            Once recorded by Hedera consensus nodes, audit entries are immutable and can never be modified or scrubbed by 
            operators or compromised servers:
          </p>

          <TerminalBlock>{`// Sample HCS Audit Message (Inspectable on HashScan)
{
  "project_id": "prj_982f1b4a",
  "call_id": "call_98fa201b-c12e-4b67",
  "tool": "execute_subgraph_query",
  "payment_id": "pay_38102830",
  "hedera_tx_id": "0.0.5559876@1757301214.000000000",
  "amount_usdc": "0.000030",
  "payer": "0.0.5559876",
  "pay_to": "0.0.5551234",
  "consensus_timestamp": "1757301216.429102914",
  "status": "SETTLED"
}`}</TerminalBlock>

          <div className="border border-ink p-3 bg-paper">
            <span className="font-bold text-ink uppercase block mb-1">Public Verifiability</span>
            <p className="text-ink-mut">
              Auditors do not need access to Foundereum databases. Entering the project topic ID into any public mirror node 
              explorer (e.g. HashScan) independently reconciles the exact billing ledger.
            </p>
          </div>
        </div>
      </Cell>
    </div>
  );
}
