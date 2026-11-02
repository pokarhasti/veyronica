import React from 'react';

export type StampVariant = 'certified' | 'pending' | 'rejected' | 'neutral' | 'crimson';

interface StampBadgeProps {
  label: string;
  variant?: StampVariant;
  size?: 'sm' | 'md' | 'lg';
  mono?: boolean;
  prefix?: string;
  className?: string;
}

export const StampBadge: React.FC<StampBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  mono = true,
  prefix,
  className = '',
}) => {
  const variantStyles: Record<StampVariant, string> = {
    certified: 'border-emerald-800/40 text-emerald-900 bg-emerald-50/60 shadow-ledger-xs',
    pending: 'border-amber-800/40 text-amber-900 bg-amber-50/70 shadow-ledger-xs',
    rejected: 'border-rose-900/40 text-rose-950 bg-rose-50/60 shadow-ledger-xs',
    crimson: 'border-ledger-crimson/50 text-ledger-crimson bg-ledger-crimson-light/80 shadow-ledger-stamp',
    neutral: 'border-stone-400/50 text-stone-800 bg-stone-100/60 shadow-ledger-xs',
  };

  const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'text-[10px] px-1.5 py-0.5 tracking-wider',
    md: 'text-[11px] px-2 py-0.5 tracking-widest',
    lg: 'text-xs px-2.5 py-1 tracking-widest',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold uppercase border ${variantStyles[variant]} ${sizeStyles[size]} ${
        mono ? 'font-mono' : 'font-sans'
      } rounded-xs transition-transform duration-150 animate-stamp-press ${className}`}
    >
      <span className="opacity-40 select-none">[</span>
      {prefix && <span className="opacity-60 font-normal">{prefix}</span>}
      <span>{label}</span>
      <span className="opacity-40 select-none">]</span>
    </span>
  );
};
