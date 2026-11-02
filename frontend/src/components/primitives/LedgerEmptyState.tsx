import React from 'react';
import { Scroll, FileText } from 'lucide-react';

interface LedgerEmptyStateProps {
  title: string;
  description: string;
  folio?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const LedgerEmptyState: React.FC<LedgerEmptyStateProps> = ({
  title,
  description,
  folio = 'EMPTY FOLIO',
  action,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`border border-dashed border-ledger-hairline-dark/70 rounded-xs bg-ledger-subdued/30 p-8 text-center max-w-xl mx-auto my-6 paper-grain ${className}`}
    >
      <div className="w-10 h-10 mx-auto mb-3 border border-ledger-hairline rounded-xs bg-ledger-surface flex items-center justify-center text-ledger-crimson shadow-ledger-xs">
        {icon || <Scroll className="w-5 h-5 opacity-80" />}
      </div>

      <div className="text-[10px] font-mono uppercase tracking-widest text-ledger-faint font-semibold mb-1">
        § {folio}
      </div>

      <h3 className="font-serif text-lg font-bold text-ledger-ink mb-1">{title}</h3>
      <p className="text-xs text-ledger-muted max-w-md mx-auto mb-4 leading-relaxed font-sans">
        {description}
      </p>

      {action && <div className="inline-flex justify-center">{action}</div>}
    </div>
  );
};
