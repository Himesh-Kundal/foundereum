import React from "react";

export const PricePill: React.FC<{ price: string; className?: string }> = ({
  price,
  className = "",
}) => {
  return (
    <span
      className={`inline-block border border-[#16181D] px-2.5 py-0.5 rounded-full font-mono text-xs text-[#16181D] bg-[#EDE9DE] font-medium ${className}`}
    >
      {price}
    </span>
  );
};

export const StatusPill: React.FC<{
  status: "settled" | "pending" | "rejected" | "failed" | "active" | string;
  className?: string;
}> = ({ status, className = "" }) => {
  let color = "border-[#16181D] text-[#16181D]";

  if (status === "settled" || status === "active" || status === "ok") {
    color = "border-[#1E7F4F] text-[#1E7F4F]";
  } else if (status === "rejected" || status === "failed" || status === "err") {
    color = "border-[#C6402E] text-[#C6402E]";
  } else if (status === "pending" || status === "settling") {
    color = "border-[#F05423] text-[#F05423]";
  }

  return (
    <span
      className={`inline-block border ${color} px-2 py-0.5 rounded-full font-mono text-[11px] lowercase tracking-wide font-semibold ${className}`}
    >
      {status}
    </span>
  );
};
