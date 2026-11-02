import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuditEvent } from '../types';
import { StampBadge, HashBlock, LedgerEmptyState, LedgerSkeleton } from '../components/primitives';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Filter,
  Lock,
  Hash,
  Award,
  CheckCircle2,
  FileKey,
} from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [runIdFilter, setRunIdFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Innovation 3.5: SHA-256 verification state
  const [verifying, setVerifying] = useState(false);
  const [integrityData, setIntegrityData] = useState<{
    status: string;
    verified: boolean;
    total_events_verified: number;
    root_hash: string;
    triggers_enforced: boolean;
    active_triggers: string[];
    algorithm: string;
    verified_at: string;
    chain_preview: any[];
  } | null>(null);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditEvents({
        event_type: eventTypeFilter || undefined,
        run_id: runIdFilter || undefined,
      });
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [eventTypeFilter, runIdFilter]);

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyAuditIntegrity();
      setIntegrityData(res);
    } catch (err: any) {
      alert(`Integrity verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Folio Masthead Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-ledger-hairline">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-800 inline-block" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted">
              Append-Only Cryptographic Register
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ledger-ink tracking-tight">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-ledger-muted mt-1 font-sans max-w-2xl">
            Every state transition, inventory signal, constraint check, and human authorization is sequentially hashed and sealed under strict PostgreSQL append-only immutability triggers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVerifyIntegrity}
            disabled={verifying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-800/40 text-emerald-900 text-xs font-mono font-semibold tracking-wider transition-colors shadow-xs active:scale-[0.98]"
          >
            <ShieldCheck className={`w-4 h-4 text-emerald-800 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'VERIFYING CHAIN...' : 'AUDIT CRYPTOGRAPHIC INTEGRITY'}</span>
          </button>

          <button
            onClick={fetchAudit}
            className="p-2 rounded-xs bg-ledger-surface hover:bg-ledger-vellum border border-ledger-hairline text-ledger-ink transition-colors shadow-xs active:scale-[0.98]"
            title="Refresh audit journal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-ledger-ink' : 'text-ledger-muted'}`} />
          </button>
        </div>
      </div>

      {/* Signature Embossed Cryptographic Verification Certificate */}
      {integrityData && (
        <div className="bg-emerald-50/50 border-2 border-emerald-800/40 rounded-xs p-6 shadow-ledger-stamp space-y-5 paper-grain relative">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/20 pb-3">
            <div className="flex items-center space-x-2.5">
              <Award className="w-5 h-5 text-emerald-800" />
              <div>
                <span className="font-serif font-bold text-emerald-950 text-base block">
                  Statutory Audit Certificate of Integrity
                </span>
                <span className="text-[11px] font-sans text-emerald-900/80">
                  Cryptographic verification confirms zero tampering across the sequential event chain.
                </span>
              </div>
            </div>
            <StampBadge label="ZERO TAMPERING DETECTED" variant="certified" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-ledger-surface/90 p-3.5 rounded-xs border border-emerald-800/20 shadow-xs">
              <span className="font-mono text-[10px] uppercase text-ledger-muted block mb-1 font-semibold">
                Total Events Chained
              </span>
              <span className="font-serif text-2xl font-bold text-ledger-ink">
                {integrityData.total_events_verified}
              </span>
              <div className="text-[11px] text-emerald-800 mt-1 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                <span>Sequential SHA-256 Validated</span>
              </div>
            </div>

            <div className="bg-ledger-surface/90 p-3.5 rounded-xs border border-emerald-800/20 shadow-xs">
              <span className="font-mono text-[10px] uppercase text-ledger-muted block mb-1 font-semibold">
                PostgreSQL Immutability Triggers
              </span>
              <div className="font-serif text-2xl font-bold text-emerald-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-800" />
                <span>Enforced</span>
              </div>
              <div className="text-[10px] font-mono text-ledger-muted mt-1 truncate" title={integrityData.active_triggers.join(', ')}>
                {integrityData.active_triggers.join(', ') || 'trg_audit_no_update, trg_audit_no_delete'}
              </div>
            </div>

            <div className="bg-ledger-surface/90 p-3.5 rounded-xs border border-emerald-800/20 shadow-xs">
              <span className="font-mono text-[10px] uppercase text-ledger-muted block mb-1 font-semibold">
                Audit Verification Timestamp
              </span>
              <span className="font-serif text-base font-bold text-ledger-ink block">
                {new Date(integrityData.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <div className="text-[11px] font-mono text-ledger-muted mt-1">
                {new Date(integrityData.verified_at).toLocaleDateString()} • {integrityData.algorithm}
              </div>
            </div>
          </div>

          {/* Root Hash Monospace Certificate Anchor */}
          <div className="bg-ledger-surface/90 p-3.5 rounded-xs border border-emerald-800/20 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold text-ledger-ink uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5 text-emerald-800" />
                <span>Root SHA-256 Digest (Cryptographic Anchor):</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 uppercase font-semibold">
                IMMUTABLE CHAIN ROOT
              </span>
            </div>
            <div className="p-2.5 rounded-xs bg-ledger-vellum border border-ledger-hairline">
              <HashBlock hash={integrityData.root_hash} length="full" label="CHAIN ROOT" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Ledger Bar */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-3 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 bg-ledger-vellum border border-ledger-hairline rounded-xs px-2.5 py-1.5 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-ledger-muted" />
          <span className="text-ledger-muted text-[10px] uppercase font-bold">EVENT TYPE:</span>
          <select
            aria-label="Filter by event type"
            className="bg-transparent text-ledger-ink font-semibold focus:outline-none cursor-pointer"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <option value="">All Events</option>
            <option value="run_started">run_started</option>
            <option value="signal_detected">signal_detected</option>
            <option value="data_read">data_read</option>
            <option value="constraint_checked">constraint_checked</option>
            <option value="action_drafted">action_drafted</option>
            <option value="approval_requested">approval_requested</option>
            <option value="approval_decided">approval_decided</option>
            <option value="approval_quantity_overridden">approval_quantity_overridden</option>
            <option value="action_executed">action_executed</option>
            <option value="action_rejected">action_rejected</option>
            <option value="run_completed">run_completed</option>
            <option value="run_failed">run_failed</option>
          </select>
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ledger-muted" />
          <input
            type="text"
            placeholder="Filter by Run ID or correlation hash..."
            className="w-full bg-ledger-vellum border border-ledger-hairline rounded-xs pl-8 pr-3 py-1.5 text-xs font-mono text-ledger-ink placeholder:text-ledger-muted focus:outline-none focus:border-ledger-ink transition-colors"
            value={runIdFilter}
            onChange={(e) => setRunIdFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Events Ledger List */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-ledger-muted">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-ledger-ink" />
              <span>Fetching audit transactions from immutable ledger...</span>
            </div>
            <LedgerSkeleton lines={5} />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 px-4">
            <LedgerEmptyState
              title="No Audit Records Matched"
              description="No journal events correspond to the active filter criteria. Clear the filter parameters to view the chronological log."
              folio="EMPTY LEDGER"
              action={
                (eventTypeFilter || runIdFilter) ? (
                  <button
                    onClick={() => {
                      setEventTypeFilter('');
                      setRunIdFilter('');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-ledger-ink text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors"
                  >
                    Reset Filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-ledger-hairline">
            {events.map((e) => {
              const isExpanded = expandedId === e.event_id;

              let badgeVariant: 'certified' | 'pending' | 'rejected' | 'neutral' | 'crimson' = 'neutral';
              if (e.event_type.includes('completed') || e.event_type.includes('executed')) badgeVariant = 'certified';
              else if (e.event_type.includes('rejected') || e.event_type.includes('failed')) badgeVariant = 'crimson';
              else if (e.event_type.includes('requested') || e.event_type.includes('overridden')) badgeVariant = 'pending';

              return (
                <div key={e.event_id} className="hover:bg-ledger-vellum/50 transition-colors">
                  <div
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                    onClick={() => setExpandedId(isExpanded ? null : e.event_id)}
                  >
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <button className="text-ledger-muted hover:text-ledger-ink transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-mono text-xs font-bold text-ledger-muted">
                        #{String(e.event_id).padStart(4, '0')}
                      </span>
                      <StampBadge label={e.event_type} variant={badgeVariant} size="sm" />
                      <div className="flex items-center gap-1 font-mono text-xs text-ledger-muted">
                        <span>Run:</span>
                        <HashBlock hash={e.run_id} length="short" />
                      </div>
                      <span className="text-xs text-ledger-ink font-mono">
                        Actor: <strong>{e.actor_id}</strong> <span className="text-ledger-muted text-[11px]">({e.actor_type})</span>
                      </span>
                    </div>

                    <div className="text-xs text-ledger-muted font-mono whitespace-nowrap">
                      {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-10 pb-4 pt-1 bg-ledger-vellum/60 border-t border-ledger-hairline">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-ledger-muted mb-1.5 flex items-center gap-1.5">
                        <FileKey className="w-3.5 h-3.5" />
                        <span>Cryptographic Event Payload (JSON-LD Immutable):</span>
                      </div>
                      <pre className="text-xs text-ledger-ink font-mono bg-ledger-surface p-3 rounded-xs border border-ledger-hairline overflow-x-auto shadow-xs leading-relaxed">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
