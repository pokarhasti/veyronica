import React from 'react';

interface HairlineRuleProps {
  label?: string;
  sublabel?: string;
  folio?: string;
  ornament?: boolean;
  className?: string;
}

export const HairlineRule: React.FC<HairlineRuleProps> = ({
  label,
  sublabel,
  folio,
  ornament = false,
  className = '',
}) => {
  if (!label && !folio && !ornament) {
    return <hr className={`border-0 border-t border-ledger-hairline my-4 ${className}`} />;
  }

  return (
    <div className={`relative flex items-center my-5 ${className}`}>
      <div className="flex-grow border-t border-ledger-hairline" />
      <div className="flex items-center gap-2 px-3 text-[10px] font-mono tracking-widest text-ledger-muted uppercase select-none">
        {folio && <span className="font-semibold text-ledger-crimson">{folio}</span>}
        {folio && label && <span className="text-ledger-hairline-dark">•</span>}
        {label && <span className="font-medium tracking-wider text-ledger-ink">{label}</span>}
        {sublabel && <span className="text-ledger-faint">({sublabel})</span>}
        {ornament && <span className="text-ledger-crimson/80 text-[8px]">◆</span>}
      </div>
      <div className="flex-grow border-t border-ledger-hairline" />
    </div>
  );
};
