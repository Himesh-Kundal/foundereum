import React from "react";
import { BlockButton } from "./Buttons";

export interface ApprovalItem {
  id: string;
  type: string;
  description: string;
  signatures_collected: number;
  threshold: number;
  requester: string;
  expires_at: string;
  status: "pending" | "approved" | "rejected";
}

export const ApprovalCard: React.FC<{
  approval: ApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ approval, onApprove, onReject }) => {
  // Render filled and empty squares: e.g. ■ □ (1/2)
  const squares = [];
  for (let i = 0; i < approval.threshold; i++) {
    const filled = i < approval.signatures_collected;
    squares.push(
      <span
        key={i}
        className={`inline-block w-3 h-3 border border-[#16181D] ${
          filled ? "bg-[#16181D]" : "bg-[#EDE9DE]"
        }`}
      />
    );
  }

  return (
    <div className="border border-[#16181D] bg-[#F4F1E9] p-4 bracket-cell font-mono text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-[#16181D] pb-2">
        <span className="font-bold text-[#16181D] uppercase tracking-wider">
          {approval.type}
        </span>
        <span className="text-[#6B6E76] text-[11px]">EXP: {approval.expires_at}</span>
      </div>

      <p className="text-sm font-medium text-[#16181D]">{approval.description}</p>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6B6E76] uppercase">Signatures:</span>
          <div className="flex items-center gap-1.5">{squares}</div>
          <span className="font-bold text-[#16181D]">
            {approval.signatures_collected} / {approval.threshold}
          </span>
        </div>

        {approval.status === "pending" && (
          <div className="flex items-center gap-2">
            <BlockButton
              variant="ghost"
              onClick={() => onReject(approval.id)}
              className="text-[11px] py-1 px-2.5"
            >
              Reject
            </BlockButton>
            <BlockButton
              variant="forge"
              onClick={() => onApprove(approval.id)}
              className="text-[11px] py-1 px-3"
            >
              Approve
            </BlockButton>
          </div>
        )}
      </div>
    </div>
  );
};
