import React from "react";

interface CellProps {
  children: React.ReactNode;
  className?: string;
  num?: string;
  title?: string;
  brackets?: boolean;
  fill?: "paper" | "paper2" | "ink";
}

export const Cell: React.FC<CellProps> = ({
  children,
  className = "",
  num,
  title,
  brackets = false,
  fill = "paper",
}) => {
  const bgClass =
    fill === "paper2"
      ? "bg-[#EDE9DE]"
      : fill === "ink"
      ? "bg-[#16181D] text-[#F4F1E9]"
      : "bg-[#F4F1E9]";

  return (
    <div
      className={`border border-[#16181D] ${bgClass} ${
        brackets ? "bracket-cell" : ""
      } ${className}`}
    >
      {(num || title) && (
        <div className="flex items-center gap-2 border-b border-[#16181D] px-3 py-1.5 text-xs font-mono text-[#6B6E76] bg-[#EDE9DE]">
          {num && <span className="font-bold text-[#16181D]">{num}</span>}
          {num && title && <span>—</span>}
          {title && <span className="uppercase tracking-wider font-semibold text-[#16181D]">{title}</span>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
