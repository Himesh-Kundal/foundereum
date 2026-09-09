import React from "react";

interface StatCellProps {
  label: string;
  value: string | number;
  delta?: string;
  className?: string;
}

export const StatCell: React.FC<StatCellProps> = ({
  label,
  value,
  delta,
  className = "",
}) => {
  return (
    <div className={`p-4 border border-[#16181D] bg-[#F4F1E9] ${className}`}>
      <div className="text-[11px] font-mono uppercase tracking-wider text-[#6B6E76] mb-1">
        {label}
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-mono font-medium text-[#16181D]">
          {value}
        </div>
        {delta && (
          <span className="text-xs font-mono text-[#1E7F4F] font-semibold">
            {delta}
          </span>
        )}
      </div>
    </div>
  );
};
