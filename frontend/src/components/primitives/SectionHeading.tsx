import React from 'react';

interface SectionHeadingProps {
  folio?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  folio,
  title,
  subtitle,
  action,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-serif font-bold tracking-tight',
    lg: 'text-2xl font-serif font-bold tracking-tight',
  };

  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-3 border-b border-ledger-hairline pb-2.5 mb-4 ${className}`}>
      <div>
        {folio && (
          <div className="text-[10px] font-mono uppercase tracking-widest text-ledger-crimson font-semibold mb-0.5 select-none">
            {folio}
          </div>
        )}
        <h2 className={`${sizeStyles[size]} text-ledger-ink leading-tight`}>{title}</h2>
        {subtitle && <p className="text-xs text-ledger-muted mt-0.5 font-sans">{subtitle}</p>}
      </div>

      {action && <div className="flex-shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
};
