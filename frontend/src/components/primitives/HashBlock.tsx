import React, { useState } from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';

interface HashBlockProps {
  hash: string;
  verified?: boolean;
  length?: 'short' | 'medium' | 'full';
  label?: string;
  className?: string;
}

export const HashBlock: React.FC<HashBlockProps> = ({
  hash,
  verified = true,
  length = 'short',
  label = 'SHA-256',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const cleanHash = hash.replace(/^0x/, '');

  let displayHash = cleanHash;
  if (length === 'short') {
    displayHash = cleanHash.slice(0, 16);
  } else if (length === 'medium') {
    displayHash = cleanHash.slice(0, 32);
  }

  // Format in 4-character blocks
  const chunked = displayHash.match(/.{1,4}/g)?.join(' ') || displayHash;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cleanHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      onClick={handleCopy}
      title="Click to copy full SHA-256 hash"
      className={`inline-flex items-center gap-2 px-2.5 py-1 bg-ledger-subdued/80 border border-ledger-hairline rounded-xs font-mono text-[11px] text-ledger-ink cursor-pointer hover:border-ledger-hairline-dark hover:bg-ledger-surface transition-all select-all ${className}`}
    >
      {verified && (
        <span className="flex items-center text-emerald-800" title="Cryptographically Validated">
          <ShieldCheck className="w-3.5 h-3.5" />
        </span>
      )}
      {label && (
        <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-ledger-crimson px-1 bg-ledger-crimson-light/80 rounded-xs">
          {label}
        </span>
      )}
      <span className="tracking-widest text-ledger-ink font-mono font-medium">
        {chunked}
        {length !== 'full' && cleanHash.length > displayHash.length && (
          <span className="text-ledger-faint tracking-normal font-sans">…</span>
        )}
      </span>
      <button
        type="button"
        className="text-ledger-faint hover:text-ledger-ink ml-1 p-0.5 rounded transition-colors"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-800" />
        ) : (
          <Copy className="w-3 h-3 opacity-60" />
        )}
      </button>
    </div>
  );
};
