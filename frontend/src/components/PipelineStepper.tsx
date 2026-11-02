import React from 'react';
import {
  Radio,
  Sliders,
  Sparkles,
  GitPullRequest,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { StampBadge } from './primitives/StampBadge';

interface PipelineStepperProps {
  status: 'running' | 'awaiting_approval' | 'completed' | 'rejected' | 'failed';
  agentPrepMs?: number;
  approvalWaitMs?: number;
}

interface StepConfig {
  id: number;
  folio: string;
  name: string;
  agent: string;
  desc: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    folio: '§ 01',
    name: 'Signal Detection',
    agent: 'SignalAgent',
    desc: 'Scans store stock cover & velocity (<7d burn-down)',
    icon: Radio,
  },
  {
    id: 2,
    folio: '§ 02',
    name: 'Deterministic Checks',
    agent: 'ConstraintAgent',
    desc: 'MOQ bounds, lead times, OTB budget & DC allocation',
    icon: Sliders,
  },
  {
    id: 3,
    folio: '§ 03',
    name: 'Cognitive Drafting',
    agent: 'DraftAgent',
    desc: 'Gemini reasoning, vendor email & Hallucination Guard',
    icon: Sparkles,
  },
  {
    id: 4,
    folio: '§ 04',
    name: 'Governance Gate',
    agent: 'RoutingAgent',
    desc: 'Deterministic policy tiering & Temporal durable pause',
    icon: GitPullRequest,
  },
  {
    id: 5,
    folio: '§ 05',
    name: 'Enterprise Execution',
    agent: 'ExecutionAgent',
    desc: 'ERP purchase orders & vendor dispatch confirmation',
    icon: Send,
  },
];

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  status,
  agentPrepMs,
  approvalWaitMs,
}) => {
  const getStepState = (stepId: number): 'completed' | 'active' | 'pending' | 'rejected' => {
    if (status === 'completed') {
      return 'completed';
    }
    if (status === 'awaiting_approval') {
      if (stepId <= 3) return 'completed';
      if (stepId === 4) return 'active';
      return 'pending';
    }
    if (status === 'rejected') {
      if (stepId <= 3) return 'completed';
      if (stepId === 4) return 'rejected';
      return 'pending';
    }
    if (status === 'failed') {
      if (stepId <= 2) return 'completed';
      return 'rejected';
    }
    // running
    if (stepId <= 2) return 'completed';
    if (stepId === 3) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-5 shadow-ledger-xs paper-grain select-none">
      {/* Top Ledger Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-ledger-hairline">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-ledger-crimson shrink-0" />
          <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-ledger-ink">
            Autonomous Pipeline Stream (LangGraph Cognitive Loop + Temporal Durability)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono">
          {agentPrepMs !== undefined && agentPrepMs > 0 && (
            <span className="text-ledger-ink bg-ledger-ground px-2.5 py-0.5 rounded-xs border border-ledger-hairline">
              Prep Latency: <strong>{agentPrepMs}ms</strong>
            </span>
          )}
          {approvalWaitMs !== undefined && approvalWaitMs > 0 && (
            <span className="text-ledger-muted bg-ledger-ground px-2.5 py-0.5 rounded-xs border border-ledger-hairline">
              Approval Wait: <strong>{(approvalWaitMs / 1000).toFixed(1)}s</strong>
            </span>
          )}
          {status === 'awaiting_approval' && (
            <StampBadge label="TEMPORAL PAUSED: HITL GATE" variant="pending" size="sm" />
          )}
          {status === 'completed' && (
            <StampBadge label="ALL STAGES CERTIFIED" variant="certified" size="sm" />
          )}
          {status === 'rejected' && (
            <StampBadge label="REJECTED AT GOVERNANCE GATE" variant="rejected" size="sm" />
          )}
        </div>
      </div>

      {/* Horizontal Process Ribbon with Hairline Bridges */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {STEPS.map((s, idx) => {
          const state = getStepState(s.id);
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`relative rounded-xs p-3.5 border transition-all ${
                state === 'completed'
                  ? 'bg-emerald-50/50 border-emerald-800/40 text-emerald-900 shadow-ledger-xs'
                  : state === 'active'
                  ? 'bg-amber-50/70 border-amber-800/60 text-amber-950 shadow-ledger-xs ring-1 ring-amber-800/20 animate-pulse'
                  : state === 'rejected'
                  ? 'bg-rose-50/60 border-rose-900/50 text-rose-950 shadow-ledger-xs'
                  : 'bg-ledger-ground/60 border-ledger-hairline text-ledger-faint'
              }`}
            >
              {/* Stage Folio & State Icon */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-ledger-crimson uppercase">
                  {s.folio}
                </span>

                <div className="shrink-0">
                  {state === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                  )}
                  {state === 'active' && (
                    <Clock className="w-4 h-4 text-amber-800 animate-spin" />
                  )}
                  {state === 'rejected' && (
                    <XCircle className="w-4 h-4 text-ledger-crimson" />
                  )}
                  {state === 'pending' && (
                    <span className="w-2 h-2 rounded-full bg-stone-300 block" />
                  )}
                </div>
              </div>

              {/* Stage Identity */}
              <div className="flex items-center space-x-2 mb-1">
                <div
                  className={`w-6 h-6 rounded-xs border flex items-center justify-center shrink-0 ${
                    state === 'completed'
                      ? 'bg-white border-emerald-800/30 text-emerald-900'
                      : state === 'active'
                      ? 'bg-white border-amber-800/40 text-amber-900'
                      : state === 'rejected'
                      ? 'bg-white border-rose-900/30 text-ledger-crimson'
                      : 'bg-white border-ledger-hairline text-ledger-faint'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="font-serif font-bold text-xs text-ledger-ink truncate">
                  {s.name}
                </div>
              </div>

              {/* Agent Attribution */}
              <div className="text-[10px] font-mono text-ledger-crimson/90 font-semibold mb-1">
                {s.agent}
              </div>

              {/* Description */}
              <p className="text-[10px] text-ledger-muted leading-tight font-sans">
                {s.desc}
              </p>

              {/* Bottom Process Status */}
              <div className="mt-3 pt-2 border-t border-ledger-hairline/60 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider">
                <span className="font-semibold">
                  {state === 'completed'
                    ? '[ CERTIFIED ]'
                    : state === 'active'
                    ? '[ EVALUATING ]'
                    : state === 'rejected'
                    ? '[ DOCKET VOID ]'
                    : '[ PENDING ]'}
                </span>
                {idx < STEPS.length - 1 && (
                  <span className="text-ledger-hairline-dark hidden md:inline font-sans text-xs">
                    →
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
