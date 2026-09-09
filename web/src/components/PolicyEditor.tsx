import { useState, useEffect } from 'react';
import { Cell } from './Cell';
import { TerminalBlock } from './TerminalBlock';
import { BlockButton } from './Buttons';

export interface PolicyEditorProps {
  policy?: Record<string, unknown>;
  onPushToPrivy?: (policyJson: string) => void;
  payToAddress?: string;
}

const KNOWN_SELECTORS = [
  { selector: '0xa9059cbb', name: 'transfer(address,uint256)' },
  { selector: '0x095ea7b3', name: 'approve(address,uint256)' },
  { selector: '0x38ed1739', name: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)' },
  { selector: '0x7ff36ab5', name: 'swapExactETHForTokens(uint256,address[],address,uint256)' },
];

export const PolicyEditor = ({ policy, onPushToPrivy, payToAddress: propPayTo }: PolicyEditorProps) => {
  const [dailyCap, setDailyCap] = useState(25.00);
  const [perCallMax, setPerCallMax] = useState(1.00);
  const [contracts, setContracts] = useState<string[]>([
    '0.0.429274', // Hedera testnet USDC token
  ]);
  const [newContract, setNewContract] = useState('');
  const [selectedSelectors, setSelectedSelectors] = useState<string[]>([
    '0xa9059cbb',
    '0x095ea7b3',
    '0x38ed1739'
  ]);
  const [customSelector, setCustomSelector] = useState('');
  const [payTo, setPayTo] = useState<string>(propPayTo || '0.0.429274');
  const [defaultAction] = useState<'DENY' | 'ALLOW'>('DENY');
  const [isPushed, setIsPushed] = useState(false);

  useEffect(() => {
    if (policy) {
      const polAny = policy as Record<string, any>;
      const maxDaily = polAny.max_daily_usd || polAny.velocity?.max_usd_per_24h;
      if (maxDaily !== undefined && maxDaily !== null) {
        const val = parseFloat(String(maxDaily));
        if (!isNaN(val)) setDailyCap(val);
      }

      const maxPerCall = polAny.max_per_call_usd || polAny.velocity?.max_usd_per_call;
      if (maxPerCall !== undefined && maxPerCall !== null) {
        const val = parseFloat(String(maxPerCall));
        if (!isNaN(val)) setPerCallMax(val);
      }

      if (Array.isArray(polAny.contract_allowlist) && polAny.contract_allowlist.length > 0) {
        setContracts(polAny.contract_allowlist);
      }
      if (Array.isArray(polAny.selector_allowlist) && polAny.selector_allowlist.length > 0) {
        setSelectedSelectors(polAny.selector_allowlist);
      }
      const pTo = polAny.payment?.pay_to?.[0] || polAny.pay_to_address || propPayTo;
      if (pTo) {
        setPayTo(pTo);
      }
    }
  }, [policy, propPayTo]);

  const toggleSelector = (sel: string) => {
    setSelectedSelectors(prev => 
      prev.includes(sel) ? prev.filter(s => s !== sel) : [...prev, sel]
    );
  };

  const addContract = () => {
    if (!newContract.trim()) return;
    setContracts(prev => [...prev, newContract.trim()]);
    setNewContract('');
  };

  const removeContract = (idx: number) => {
    setContracts(prev => prev.filter((_, i) => i !== idx));
  };

  const addCustomSelector = () => {
    if (!customSelector.trim()) return;
    const clean = customSelector.trim().toLowerCase();
    if (!selectedSelectors.includes(clean)) {
      setSelectedSelectors(prev => [...prev, clean]);
    }
    setCustomSelector('');
  };

  const currentPolicyObject = {
    version: '2.1.0',
    max_daily_usd: dailyCap.toFixed(2),
    max_per_call_usd: perCallMax.toFixed(2),
    contract_allowlist: contracts,
    selector_allowlist: selectedSelectors,
    default_action: defaultAction,
    pay_to_address: payTo,
    enforcement: 'TEE_ISOLATED_CONFIDENTIAL_VM',
  };

  const jsonString = JSON.stringify(currentPolicyObject, null, 2);

  const handlePush = () => {
    setIsPushed(true);
    if (onPushToPrivy) {
      onPushToPrivy(jsonString);
    }
    setTimeout(() => setIsPushed(false), 4000);
  };

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Quorum Notice Banner */}
      <div className="border border-ink bg-paper2 p-4 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-forge font-bold">ℹ</span>
          <span>
            <strong>Quorum Notice:</strong> Updates to this spending policy require 2-of-3 signatures from the multi-sig quorum before taking effect in Privy&apos;s TEE.
          </span>
        </div>
        <span className="text-ink-mut uppercase text-[10px]">P-256 WebCrypto</span>
      </div>

      <Cell brackets title="POLICY EDITOR" number="01">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
          {/* Left Form */}
          <div className="flex flex-col gap-6 text-xs">
            {/* 1. Velocity Controls */}
            <div className="flex flex-col gap-3 pb-4 border-b border-ink border-dashed">
              <span className="font-bold uppercase text-ink">1. Velocity Limits</span>
              
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-ink-mut">
                  <span>MAX DAILY SPEND (USD)</span>
                  <span className="text-ink font-bold">${dailyCap.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="200" 
                  step="1"
                  value={dailyCap}
                  onChange={(e) => setDailyCap(parseFloat(e.target.value))}
                  className="accent-forge cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-ink-mut">
                  <span>MAX PER-CALL LIMIT (USD)</span>
                  <span className="text-ink font-bold">${perCallMax.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="20" 
                  step="0.05"
                  value={perCallMax}
                  onChange={(e) => setPerCallMax(parseFloat(e.target.value))}
                  className="accent-forge cursor-pointer"
                />
              </div>
            </div>

            {/* 2. Contract Allowlist */}
            <div className="flex flex-col gap-3 pb-4 border-b border-ink border-dashed">
              <span className="font-bold uppercase text-ink">2. Contract Allowlist</span>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                {contracts.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-paper2 p-2 border border-ink">
                    <span className="text-[11px] truncate">{c}</span>
                    <button 
                      type="button"
                      onClick={() => removeContract(idx)} 
                      className="text-err hover:text-ink font-bold px-1 ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="0.0.x or 0x..." 
                  value={newContract} 
                  onChange={(e) => setNewContract(e.target.value)}
                  className="border border-ink bg-paper2 px-2 py-1 flex-1 text-xs outline-none"
                />
                <button 
                  type="button"
                  onClick={addContract}
                  className="border border-ink px-3 py-1 bg-paper hover:bg-ink hover:text-paper font-bold uppercase text-xs"
                >
                  + ADD
                </button>
              </div>
            </div>

            {/* 3. Selector Allowlist */}
            <div className="flex flex-col gap-3 pb-4 border-b border-ink border-dashed">
              <span className="font-bold uppercase text-ink">3. EVM Function Selectors</span>
              <div className="flex flex-col gap-2">
                {KNOWN_SELECTORS.map(sel => (
                  <label key={sel.selector} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input 
                      type="checkbox"
                      checked={selectedSelectors.includes(sel.selector)}
                      onChange={() => toggleSelector(sel.selector)}
                      className="accent-forge"
                    />
                    <span className="font-bold text-forge">{sel.selector}</span>
                    <span className="text-ink-mut truncate text-[11px]">{sel.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <input 
                  type="text" 
                  placeholder="0x12345678" 
                  value={customSelector} 
                  onChange={(e) => setCustomSelector(e.target.value)}
                  className="border border-ink bg-paper2 px-2 py-1 flex-1 text-xs outline-none"
                />
                <button 
                  type="button"
                  onClick={addCustomSelector}
                  className="border border-ink px-3 py-1 bg-paper hover:bg-ink hover:text-paper font-bold uppercase text-xs"
                >
                  + ADD
                </button>
              </div>
            </div>

            {/* 4. Payment Read-Only */}
            <div className="flex flex-col gap-1">
              <span className="font-bold uppercase text-ink">4. Facilitator PayTo Address (Immutable)</span>
              <div className="border border-ink p-2 bg-paper2 text-xs flex justify-between">
                <span>{payTo} (Blocky402 Settlement)</span>
                <span className="text-ink-mut font-bold">[LOCKED]</span>
              </div>
            </div>
          </div>

          {/* Right Pane: Live JSON */}
          <div className="flex flex-col h-full">
            <span className="text-xs font-mono uppercase text-ink-mut mb-2 font-bold">Live Policy JSON (Privy TEE)</span>
            <TerminalBlock className="flex-1 min-h-[420px]">
              {jsonString}
            </TerminalBlock>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-ink flex items-center justify-between">
          <div className="text-xs text-ink-mut font-mono">
            {isPushed ? (
              <span className="text-ok font-bold">✓ Policy pushed to Privy TEE Enclave! Version 2.1.1</span>
            ) : (
              <span>Policy version 2.1.0 · pushed 12m ago</span>
            )}
          </div>
          <BlockButton onClick={handlePush}>
            {isPushed ? 'PUSHED ✓' : 'PUSH TO PRIVY'}
          </BlockButton>
        </div>
      </Cell>
    </div>
  );
};
