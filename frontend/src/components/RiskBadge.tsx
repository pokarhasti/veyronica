import React from 'react';
import { StampBadge } from './primitives/StampBadge';

interface RiskBadgeProps {
  riskClass: 'low' | 'medium' | 'high' | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  riskClass,
  size = 'md',
  className = '',
}) => {
  const normalized = riskClass.toLowerCase();

  if (normalized === 'low') {
    return (
      <StampBadge
        label="LOW RISK"
        prefix="CERTIFIED •"
        variant="certified"
        size={size}
        className={className}
      />
    );
  }

  if (normalized === 'medium') {
    return (
      <StampBadge
        label="MEDIUM RISK"
        prefix="CAUTION •"
        variant="pending"
        size={size}
        className={className}
      />
    );
  }

  return (
    <StampBadge
      label="HIGH RISK"
      prefix="STRICT GATE •"
      variant="rejected"
      size={size}
      className={className}
    />
  );
};
