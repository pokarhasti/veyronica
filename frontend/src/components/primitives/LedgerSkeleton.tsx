import React from 'react';

interface LedgerSkeletonProps {
  lines?: number;
  type?: 'row' | 'card' | 'table';
  className?: string;
}

export const LedgerSkeleton: React.FC<LedgerSkeletonProps> = ({
  lines = 3,
  type = 'row',
  className = '',
}) => {
  if (type === 'table') {
    return (
      <div className={`space-y-3 py-2 animate-pulse ${className}`}>
        <div className="h-4 bg-ledger-subdued rounded-xs w-full mb-3" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-ledger-hairline">
            <div className="h-3 bg-ledger-subdued rounded-xs w-1/4" />
            <div className="h-3 bg-ledger-subdued rounded-xs w-1/3" />
            <div className="h-3 bg-ledger-subdued rounded-xs w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`border border-ledger-hairline bg-ledger-surface p-5 rounded-xs space-y-3 animate-pulse ${className}`}>
        <div className="h-4 bg-ledger-subdued rounded-xs w-1/3 mb-2" />
        <div className="h-3 bg-ledger-subdued rounded-xs w-3/4" />
        <div className="h-3 bg-ledger-subdued rounded-xs w-1/2" />
        <div className="pt-3 border-t border-ledger-hairline flex justify-between">
          <div className="h-3 bg-ledger-subdued rounded-xs w-1/4" />
          <div className="h-3 bg-ledger-subdued rounded-xs w-1/5" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-ledger-subdued rounded-xs"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
};
