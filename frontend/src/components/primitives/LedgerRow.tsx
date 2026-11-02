import React from 'react';

interface LedgerRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  sublabel?: string;
  subvalue?: string;
  monoValue?: boolean;
  highlight?: boolean;
  className?: string;
}

export const LedgerRow: React.FC<LedgerRowProps> = ({
  label,
  value,
  sublabel,
  subvalue,
  monoValue = true,
  highlight = false,
  className = '',
}) => {
  return (
    <div
      className={`group flex items-baseline justify-between py-1.5 text-xs transition-colors ${
        highlight ? 'bg-ledger-subdued/80 px-2 rounded-xs font-medium' : ''
      } ${className}`}
    >
      <div className="flex items-baseline gap-1.5 min-w-0 flex-shrink">
        <span className="text-ledger-ink font-medium tracking-tight truncate">{label}</span>
        {sublabel && <span className="text-[10px] text-ledger-faint font-mono truncate">({sublabel})</span>}
      </div>

      <div className="ledger-dotted-leader" />

      <div className="flex items-baseline gap-1.5 flex-shrink-0 text-right">
        <span
          className={`text-ledger-ink ${
            monoValue ? 'font-mono font-medium tracking-tight' : 'font-sans'
          }`}
        >
          {value}
        </span>
        {subvalue && <span className="text-[10px] text-ledger-faint font-mono">[{subvalue}]</span>}
      </div>
    </div>
  );
};
