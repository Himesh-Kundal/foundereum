import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface TerminalBlockProps {
  content: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

export const TerminalBlock: React.FC<TerminalBlockProps> = ({
  content,
  title,
  className = "",
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border border-[#16181D] bg-[#16181D] text-[#F4F1E9] font-mono text-xs ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2e37] text-[11px] text-[#A0A4AB] bg-[#1a1d24]">
          <span className="uppercase tracking-wider font-semibold">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[#F05423] hover:text-[#ff7448] transition cursor-pointer"
          >
            {copied ? <Check className="h-3 w-3 text-[#1E7F4F]" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "COPIED" : "COPY"}</span>
          </button>
        </div>
      )}
      <div className={`relative ${compact ? "p-2.5" : "p-4"}`}>
        {!title && (
          <button
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 bg-[#2a2e37] hover:bg-[#393e4a] text-[#F4F1E9] text-[10px] font-mono border border-[#444a56] transition cursor-pointer"
          >
            {copied ? <Check className="h-3 w-3 text-[#1E7F4F]" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "COPIED" : "COPY"}</span>
          </button>
        )}
        <pre className="overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-[#EDE9DE]">
          {content}
        </pre>
      </div>
    </div>
  );
};
