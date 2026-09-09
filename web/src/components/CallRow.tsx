import React, { useState } from "react";
import { ExternalLink } from "lucide-react";

export interface CallItem {
  id: string;
  tool: string;
  priceUSD: string;
  status: "settling" | "settled" | "rejected" | "failed";
  meta?: string;
  txHash?: string;
  hashscanUrl?: string;
  latency?: string;
  timeAgo?: string;
  payload?: any;
}

export const CallRow: React.FC<{ call: CallItem }> = ({ call }) => {
  const [expanded, setExpanded] = useState(false);

  let sparkColor = "bg-[#1E7F4F]"; // ok / green
  if (call.status === "settling") {
    sparkColor = "bg-[#F05423] animate-pulse"; // forge / orange pulse
  } else if (call.status === "rejected" || call.status === "failed") {
    sparkColor = "bg-[#C6402E]"; // err / red
  }

  return (
    <div className="border-b border-[#16181D] last:border-b-0">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-2.5 hover:bg-[#EDE9DE] transition cursor-pointer text-xs font-mono select-none"
      >
        <div className="flex items-center gap-2.5 overflow-hidden pr-2">
          {/* 8x8px square spark per spec */}
          <div className={`w-2 h-2 shrink-0 ${sparkColor}`} />
          <span className="font-bold text-[#16181D]">{call.tool}</span>

          {call.status === "rejected" ? (
            <span className="text-[#C6402E] truncate font-medium">
              policy_rejected · {call.meta || "contract_allowlist"}
            </span>
          ) : (
            <span className="text-[#F05423] font-semibold">{call.priceUSD}</span>
          )}

          {call.meta && call.status !== "rejected" && (
            <span className="text-[#6B6E76] hidden sm:inline">· {call.meta}</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[#6B6E76]">
          {call.status === "settling" ? (
            <span className="text-[#F05423] italic">settling...</span>
          ) : (
            <>
              {call.hashscanUrl && (
                <a
                  href={call.hashscanUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-[#16181D] flex items-center gap-0.5"
                >
                  <span className="hidden md:inline">{call.txHash || "0.0.1234@...4"}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {call.latency && <span>{call.latency}</span>}
              {call.timeAgo && <span className="hidden lg:inline">{call.timeAgo}</span>}
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-3 bg-[#16181D] text-[#EDE9DE] font-mono text-xs border-t border-[#16181D] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#A0A4AB] border-b border-[#2a2e37] pb-1">
            <span>CALL ID: {call.id}</span>
            <span>STATUS: {call.status.toUpperCase()}</span>
          </div>
          {call.payload && (
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#EDE9DE]">
              {JSON.stringify(call.payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
