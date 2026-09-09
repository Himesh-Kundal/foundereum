import { PolicyEditor } from '../PolicyEditor';
import type { PolicyResponse } from '../../types';

export interface PolicyTabProps {
  policyData: PolicyResponse | null;
  treasuryHederaId?: string;
  onPushPolicy: (policyJson: string) => Promise<void>;
}

export function PolicyTab({ policyData, treasuryHederaId, onPushPolicy }: PolicyTabProps) {
  return (
    <PolicyEditor 
      policy={policyData?.spec}
      payToAddress={treasuryHederaId && treasuryHederaId !== '—' ? treasuryHederaId : undefined}
      onPushToPrivy={onPushPolicy}
    />
  );
}
