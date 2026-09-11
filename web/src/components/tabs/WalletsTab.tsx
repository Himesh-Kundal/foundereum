import { Cell } from '../Cell';
import { CopyField } from '../CopyField';
import { BlockButton } from '../Buttons';
import { ExternalLink } from 'lucide-react';
import type { Wallet, ProjectSummary } from '../../types';

export interface WalletsTabProps {
  treasuryWallet: Wallet;
  agentWallet: Wallet;
  currentProject: ProjectSummary | null;
  spendLimit: number;
  onOpenTopUp: () => void;
  onOpenWithdraw: () => void;
  onFaucet: () => void;
}

export function WalletsTab({
  treasuryWallet,
  agentWallet,
  currentProject,
  spendLimit,
  onOpenTopUp,
  onOpenWithdraw,
  onFaucet,
}: WalletsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 font-mono">
      <Cell title="TREASURY (MULTI-SIG QUORUM)" number="01">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-ink pb-6 border-dashed">
            <div className="flex justify-between items-end">
              <span className="text-4xl font-mono font-medium">{parseFloat(treasuryWallet.usdc || '0').toFixed(2)}</span>
              <span className="text-ink-mut font-mono">USDC</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-mono">{parseFloat(treasuryWallet.hbar || '0').toFixed(2)}</span>
              <span className="text-ink-mut font-mono">HBAR</span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-ink-mut uppercase font-bold">HEDERA ACCOUNT ID</span>
                {treasuryWallet.hedera_account_id && (
                  <a
                    href={`https://hashscan.io/testnet/account/${treasuryWallet.hedera_account_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink hover:text-forge flex items-center gap-1 transition-colors"
                    title="View Account on HashScan"
                  >
                    <span>HashScan</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <CopyField value={treasuryWallet.hedera_account_id} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-ink-mut uppercase font-bold">EVM ALIAS</span>
                {treasuryWallet.evm_address && (
                  <a
                    href={`https://hashscan.io/testnet/account/${treasuryWallet.evm_address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink hover:text-forge flex items-center gap-1 transition-colors"
                    title="View EVM Address on HashScan"
                  >
                    <span>HashScan</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <CopyField value={treasuryWallet.evm_address} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <BlockButton onClick={onOpenTopUp}>TOP UP AGENT</BlockButton>
            <BlockButton onClick={onOpenWithdraw} variant="danger">
              WITHDRAW
            </BlockButton>
          </div>
          <p className="text-xs font-mono text-ink-mut">
            Withdrawals over ${currentProject?.withdraw_quorum_min_usd || 100} require {currentProject?.quorum_threshold || 2} signatures via WebCrypto P-256.
          </p>
        </div>
      </Cell>

      <Cell title="AGENT (POLICY-BOUND CUSTODY)" number="02">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-ink pb-6 border-dashed">
            <div className="flex justify-between items-end">
              <span className="text-4xl font-mono font-medium">{parseFloat(agentWallet.usdc || '0').toFixed(2)}</span>
              <span className="text-ink-mut font-mono">USDC</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-mono">{parseFloat(agentWallet.hbar || '0').toFixed(2)}</span>
              <span className="text-ink-mut font-mono">HBAR</span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-ink-mut uppercase font-bold">HEDERA ACCOUNT ID</span>
                {agentWallet.hedera_account_id && (
                  <a
                    href={`https://hashscan.io/testnet/account/${agentWallet.hedera_account_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink hover:text-forge flex items-center gap-1 transition-colors"
                    title="View Account on HashScan"
                  >
                    <span>HashScan</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <CopyField value={agentWallet.hedera_account_id} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-ink-mut uppercase font-bold">EVM ALIAS</span>
                {agentWallet.evm_address && (
                  <a
                    href={`https://hashscan.io/testnet/account/${agentWallet.evm_address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink hover:text-forge flex items-center gap-1 transition-colors"
                    title="View EVM Address on HashScan"
                  >
                    <span>HashScan</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <CopyField value={agentWallet.evm_address} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <BlockButton onClick={onFaucet}>FAUCET (+50 USDC)</BlockButton>
          </div>
          <p className="text-xs font-mono text-ink-mut">
            Enforced by Privy TEE Enclave. Max ${spendLimit.toFixed(2)}/day spend limit.
          </p>
        </div>
      </Cell>
    </div>
  );
}
