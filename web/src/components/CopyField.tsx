import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CopyFieldProps {
  value: string;
  label?: string;
  masked?: boolean;
}

export const CopyField = ({ value, label, masked }: CopyFieldProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayValue = () => {
    if (masked) return '••••••••••••••••••••••••••••••••';
    if (value.length > 20) {
      return `${value.slice(0, 10)}...${value.slice(-8)}`;
    }
    return value;
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-[12px] font-mono uppercase text-ink-mut">{label}</span>}
      <div className="flex items-center justify-between border border-ink p-3 bg-paper2 font-mono text-sm">
        <span className="truncate text-ink">{displayValue()}</span>
        <button 
          onClick={handleCopy} 
          className="text-ink hover:text-forge transition-colors ml-4 flex-shrink-0 bg-transparent border-none cursor-pointer"
          aria-label="Copy to clipboard"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
};
