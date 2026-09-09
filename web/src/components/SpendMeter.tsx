import React from "react";

interface SpendMeterProps {
  currentUSD: number;
  maxUSD: number;
  showCaption?: boolean;
  className?: string;
}

export const SpendMeter: React.FC<SpendMeterProps> = ({
  currentUSD,
  maxUSD,
  showCaption = true,
  className = "",
}) => {
  const percent = Math.min(100, Math.max(0, (currentUSD / maxUSD) * 100));
  const isHigh = percent >= 90;
  const fillColor = isHigh ? "bg-[#C6402E]" : "bg-[#F05423]";

  return (
    <div className={`flex items-center gap-2 font-mono text-xs text-[#16181D] ${className}`}>
      <span className="text-[#6B6E76]">24h</span>
      <div className="w-24 sm:w-28 h-3.5 border border-[#16181D] bg-[#EDE9DE] p-[1px]">
        <div
          className={`h-full ${fillColor} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showCaption && (
        <span className="font-semibold text-xs whitespace-nowrap">
          ${currentUSD.toFixed(2)} / ${maxUSD.toFixed(0)}
        </span>
      )}
    </div>
  );
};
