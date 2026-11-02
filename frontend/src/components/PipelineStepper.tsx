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
} from 'lucide-react';

interface PipelineStepperProps {
  status: 'running' | 'awaiting_approval' | 'completed' | 'rejected' | 'failed';
  agentPrepMs?: number;
  approvalWaitMs?: number;
}

interface StepConfig {
  id: number;
  name: string;
  agent: string;
  desc: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    name: 'Signal Detection',
    agent: 'SignalAgent',
    desc: 'Scans store inventory & detects low cover (<7d)',
    icon: Radio,
  },
  {
    id: 2,
    name: 'Deterministic Checks',
    agent: 'ConstraintAgent',
    desc: 'MOQ, Lead Time, Store Budget & WH-NORTH-01 DC split',
    icon: Sliders,
  },
  {
    id: 3,
    name: 'Cognitive Drafting',
    agent: 'DraftAgent',
    desc: 'Gemini 2.5 Flash rationale & vendor email + Hallucination Guard',
    icon: Sparkles,
  },
  {
    id: 4,
    name: 'Governance Routing',
    agent: 'RoutingAgent',
    desc: 'Deterministic policy tiering & Temporal HITL signal gate',
    icon: GitPullRequest,
  },
  {
    id: 5,
    name: 'Enterprise Execution',
    agent: 'ExecutionAgent',
    desc: 'Ginesys ERP PO creation & supplier email dispatch',
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Autonomous Pipeline Stepper (LangGraph Cognitive Graph + Temporal Durability)
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          {agentPrepMs !== undefined && agentPrepMs > 0 && (
            <span className="text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/80">
              Prep Latency: {agentPrepMs}ms
            </span>
          )}
          {status === 'awaiting_approval' && (
            <span className="text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 animate-pulse">
              Temporal Signal: Paused for HITL
            </span>
          )}
          {status === 'completed' && (
            <span className="text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
              Execution Confirmed
            </span>
          )}
        </div>
      </div>

      {/* Grid of Steps */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {STEPS.map((s, idx) => {
          const state = getStepState(s.id);
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`relative rounded-lg p-3.5 border transition-all ${
                state === 'completed'
                  ? 'bg-slate-950/80 border-emerald-800/80 text-emerald-300 shadow-sm shadow-emerald-950/20'
                  : state === 'active'
                  ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/50'
                  : state === 'rejected'
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400">
                  Stage {s.id}
                </span>
                <div>
                  {state === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {state === 'active' && <Clock className="w-4 h-4 text-amber-400 animate-spin" />}
                  {state === 'rejected' && <XCircle className="w-4 h-4 text-rose-400" />}
                  {state === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-700 block" />}
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-1">
                <div
                  className={`p-1.5 rounded-md ${
                    state === 'completed'
                      ? 'bg-emerald-950 text-emerald-400'
                      : state === 'active'
                      ? 'bg-amber-950 text-amber-300'
                      : state === 'rejected'
                      ? 'bg-rose-950 text-rose-400'
                      : 'bg-slate-900 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-semibold text-xs text-slate-200 truncate">{s.name}</div>
              </div>

              <div className="text-[11px] font-mono text-indigo-400/90 font-medium">
                {s.agent}
              </div>

              <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                {s.desc}
              </p>

              {/* Status footer pill */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="capitalize font-mono">
                  {state === 'completed'
                    ? 'Completed'
                    : state === 'active'
                    ? 'Active'
                    : state === 'rejected'
                    ? 'Rejected'
                    : 'Pending'}
                </span>
                {idx < STEPS.length - 1 && (
                  <span className="text-slate-600 hidden md:inline">→</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
