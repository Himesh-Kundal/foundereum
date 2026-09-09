import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface TerminalBlockProps {
  children: string;
  lang?: string;
  className?: string;
}

export const TerminalBlock = ({ children, className = '' }: TerminalBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Basic syntax highlighting for JSON keys
  const renderHighlighted = () => {
    return children.split('\n').map((line, i) => {
      const match = line.match(/^(\s*)(".*?":)(.*)$/);
      if (match) {
        return (
          <div key={i}>
            <span>{match[1]}</span>
            <span className="text-forge">{match[2]}</span>
            <span>{match[3]}</span>
          </div>
        );
      }
      return <div key={i}>{line || ' '}</div>;
    });
  };

  return (
    <div className={`relative bg-ink text-[#E8E4DA] p-4 font-mono text-[13px] border border-ink rounded-none overflow-x-auto ${className}`}>
      <button 
        onClick={handleCopy}
        className="absolute top-4 right-4 text-[#E8E4DA] hover:text-paper hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-1"
        aria-label="Copy code"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <pre className="whitespace-pre">
        {renderHighlighted()}
      </pre>
    </div>
  );
};
