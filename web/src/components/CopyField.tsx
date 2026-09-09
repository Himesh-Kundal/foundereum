import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyFieldProps {
  label?: string;
  value: string;
  displayValue?: string;
  className?: string;
}

export const CopyField: React.FC<CopyFieldProps> = ({
  label,
  value,
  displayValue,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`font-mono text-xs ${className}`}>
      {label && (
        <span className="block text-[11px] uppercase tracking-wider text-[#6B6E76] mb-1">
          {label}
        </span>
      )}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border border-[#16181D] bg-[#EDE9DE]">
        <span className="truncate text-[#16181D] font-mono select-all">
          {displayValue || value}
        </span>
        <button
          onClick={handleCopy}
          className="text-[#6B6E76] hover:text-[#16181D] transition cursor-pointer shrink-0"
          title="Copy"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[#1E7F4F]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
