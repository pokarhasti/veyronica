import React from 'react';
import { Check, Clock, AlertCircle, Ban } from 'lucide-react';
import { StampBadge } from './primitives/StampBadge';

interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed' | 'rejected';
  timestamp?: string;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export const Timeline: React.FC<TimelineProps> = ({ steps }) => {
  return (
    <div className="relative border-l border-ledger-hairline ml-3.5 my-4 space-y-6">
      {steps.map((step, idx) => {
        const isCompleted = step.status === 'completed';
        const isInProgress = step.status === 'in_progress';
        const isRejected = step.status === 'rejected';
        const isFailed = step.status === 'failed';

        return (
          <div key={step.id} className="relative pl-6">
            {/* Archival Step Marker Node */}
            <span
              className={`absolute -left-3 top-0.5 flex items-center justify-center w-6 h-6 rounded-xs border text-xs shadow-ledger-xs transition-all ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-800/50 text-emerald-800'
                  : isInProgress
                  ? 'bg-amber-50 border-amber-800/60 text-amber-900 animate-pulse'
                  : isRejected
                  ? 'bg-rose-50 border-rose-900/50 text-ledger-crimson'
                  : isFailed
                  ? 'bg-rose-50 border-rose-900/50 text-ledger-crimson'
                  : 'bg-ledger-ground border-ledger-hairline text-ledger-faint'
              }`}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5" />
              ) : isInProgress ? (
                <Clock className="w-3.5 h-3.5" />
              ) : isRejected ? (
                <Ban className="w-3.5 h-3.5" />
              ) : isFailed ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <span className="font-mono text-[9px] font-semibold text-ledger-faint">
                  {idx + 1}
                </span>
              )}
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-sm tracking-tight ${
                    isCompleted
                      ? 'font-serif font-bold text-ledger-ink'
                      : isInProgress
                      ? 'font-serif font-bold text-ledger-crimson'
                      : isRejected
                      ? 'font-serif font-bold text-ledger-crimson'
                      : isFailed
                      ? 'font-serif font-bold text-ledger-crimson'
                      : 'font-sans font-medium text-ledger-faint'
                  }`}
                >
                  {step.label}
                </span>

                {isInProgress && (
                  <StampBadge label="ACTIVE EVALUATION" variant="pending" size="sm" />
                )}
                {isCompleted && (
                  <StampBadge label="CERTIFIED" variant="certified" size="sm" />
                )}
                {isRejected && (
                  <StampBadge label="REJECTED" variant="rejected" size="sm" />
                )}
              </div>

              {step.timestamp && (
                <span className="text-[11px] text-ledger-muted font-mono mt-0.5 block tracking-wider">
                  RECORDED: {step.timestamp}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
