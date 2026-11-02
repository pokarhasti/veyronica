import React from 'react';

interface RiskBadgeProps {
  riskClass: 'low' | 'medium' | 'high';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ riskClass }) => {
  const styles = {
    low: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
    medium: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
    high: 'bg-rose-950/80 text-rose-400 border-rose-800/60',
  };

  const labels = {
    low: 'LOW RISK',
    medium: 'MEDIUM RISK',
    high: 'HIGH RISK',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${styles[riskClass]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current animate-pulse" />
      {labels[riskClass]}
    </span>
  );
};
