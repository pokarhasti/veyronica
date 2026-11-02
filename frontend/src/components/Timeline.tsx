import React from 'react';
import { Check, Clock, AlertCircle, Ban } from 'lucide-react';

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
    <div className="relative border-l border-slate-800 ml-4 my-4 space-y-6">
      {steps.map((step) => {
        const isCompleted = step.status === 'completed';
        const isInProgress = step.status === 'in_progress';
        const isRejected = step.status === 'rejected';
        const isFailed = step.status === 'failed';

        return (
          <div key={step.id} className="relative pl-6">
            <span
              className={`absolute -left-3 top-0.5 flex items-center justify-center w-6 h-6 rounded-full border text-xs ${
                isCompleted
                  ? 'bg-emerald-950 border-emerald-600 text-emerald-400'
                  : isInProgress
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-300 animate-pulse'
                  : isRejected
                  ? 'bg-amber-950 border-amber-600 text-amber-400'
                  : isFailed
                  ? 'bg-rose-950 border-rose-600 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
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
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              )}
            </span>

            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-sm font-medium ${
                    isCompleted
                      ? 'text-slate-200'
                      : isInProgress
                      ? 'text-indigo-400 font-semibold'
                      : isRejected
                      ? 'text-amber-400'
                      : isFailed
                      ? 'text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
                {isInProgress && (
                  <span className="text-[10px] tracking-wide uppercase px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">
                    Active
                  </span>
                )}
              </div>
              {step.timestamp && (
                <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                  {step.timestamp}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
