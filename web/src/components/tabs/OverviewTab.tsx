import { Cell } from '../Cell';
import { StatCell } from '../StatCell';
import { TerminalBlock } from '../TerminalBlock';
import { CopyField } from '../CopyField';
import { CallRow } from '../CallRow';
import { EmptyState } from '../EmptyState';
import type { Wallet, CallRecord, ProjectSummary } from '../../types';

export interface OverviewTabProps {
  treasuryWallet: Wallet;
  agentWallet: Wallet;
  spend24h: number;
  calls: CallRecord[];
  currentProject: ProjectSummary | null;
  auditTopicId: string;
  mcpConfigText: string;
  onNavigateToCalls: () => void;
}

export function OverviewTab({
  treasuryWallet,
  agentWallet,
  spend24h,
  calls,
  currentProject,
  auditTopicId,
  mcpConfigText,
  onNavigateToCalls,
}: OverviewTabProps) {
  return (
    <div className="flex flex-col gap-8 font-mono">
      {/* Row of StatCells (Doc 11 §4.3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCell label="TREASURY USDC" value={parseFloat(treasuryWallet.usdc || '0').toFixed(2)} />
        <StatCell label="AGENT USDC" value={parseFloat(agentWallet.usdc || '0').toFixed(2)} />
        <StatCell label="SPEND 24H" value={`$${spend24h.toFixed(2)}`} />
        <StatCell label="CALLS TODAY" value={String(calls.length)} />
      </div>

      {/* Split row: MCP config on left, Identity on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Cell className="lg:col-span-2" title="MCP SERVER CONFIGURATION" number="01">
          <TerminalBlock>
            {mcpConfigText || JSON.stringify({
              mcpServers: {
                foundereum: {
                  command: "npx",
                  args: [
                    "-y", 
                    "foundereum-mcp", 
                    "--url", 
                    typeof window !== 'undefined' && window.location.hostname !== 'localhost'
                      ? `https://mcp.${window.location.hostname.replace(/^app\./, '')}/mcp`
                      : "https://mcp.foundereum.org/mcp"
                  ],
                  env: { FOUNDEREUM_API_KEY: "fnd_sk_live_paste_your_key_here" }
                }
              }
            }, null, 2)}
          </TerminalBlock>
        </Cell>

        <Cell title="IDENTITY & SETTLEMENT" number="02">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-ink-mut font-bold">ERC-8004 AGENT REGISTRY ID</span>
              <CopyField value={agentWallet.evm_address !== '—' ? agentWallet.evm_address : 'Pending provisioning'} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-ink-mut font-bold">HCS AUDIT TOPIC ID</span>
              <CopyField value={currentProject?.hcs_topic_id || auditTopicId || 'Pending provisioning'} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-ink-mut font-bold">SETTLEMENT FACILITATOR</span>
              <CopyField value={treasuryWallet.hedera_account_id !== '—' ? treasuryWallet.hedera_account_id : (currentProject?.hcs_topic_id || 'Pending')} />
            </div>
          </div>
        </Cell>
      </div>

      <Cell title="RECENT CALLS" number="03">
        {calls.length > 0 ? (
          calls.slice(0, 4).map((c) => (
            <CallRow
              key={c.id}
              tool={c.tool}
              status={c.status === 'succeeded' ? 'settled' : c.status === 'pending' ? 'pending' : 'rejected'}
              price={`$${c.actual_usd || c.estimate_usd}`}
              time={new Date(c.started_at).toLocaleTimeString()}
              txId={c.tx_hash}
              latency={`${c.latency_ms}ms`}
              reason={c.reason}
              args={c.args}
              meteringBreakdown={c.metered_bytes ? `Settled: $${c.actual_usd || c.estimate_usd} (${c.metered_bytes} bytes metered)` : undefined}
            />
          ))
        ) : (
          <EmptyState title="No recent calls" description="Agent calls via x402 gateway will stream live here." />
        )}
        <div className="p-3 text-right border-t border-ink">
          <button
            type="button"
            onClick={onNavigateToCalls}
            className="text-xs font-mono uppercase underline hover:text-forge text-ink font-bold cursor-pointer"
          >
            VIEW FULL LIVE CALL LOG ({calls.length}) ↗
          </button>
        </div>
      </Cell>
    </div>
  );
}
