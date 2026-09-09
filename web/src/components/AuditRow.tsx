import React from "react";
import { ExternalLink } from "lucide-react";

export interface AuditItem {
  seq: number;
  tool: string;
  amountUSD: string;
  timestamp: string;
  topicId: string;
  txId: string;
  matched: boolean;
}

export const AuditRow: React.FC<{ item: AuditItem }> = ({ item }) => {
  return (
    <tr className="border-b border-[#16181D] hover:bg-[#EDE9DE] transition font-mono text-xs text-[#16181D]">
      <td className="py-2 px-3 font-bold text-[#16181D]">#{item.seq}</td>
      <td className="py-2 px-3 font-semibold">{item.tool}</td>
      <td className="py-2 px-3 text-[#F05423] font-bold">{item.amountUSD}</td>
      <td className="py-2 px-3 text-[#6B6E76]">{item.timestamp}</td>
      <td className="py-2 px-3">
        <a
          href={`https://hashscan.io/testnet/transaction/${item.txId}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-[#F05423] flex items-center gap-1 text-[#16181D]"
        >
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{item.txId}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </td>
      <td className="py-2 px-3 text-right">
        {item.matched ? (
          <span className="text-[#1E7F4F] font-bold">✓ matched</span>
        ) : (
          <span className="text-[#C6402E] font-bold">⚠ unmatched</span>
        )}
      </td>
    </tr>
  );
};
