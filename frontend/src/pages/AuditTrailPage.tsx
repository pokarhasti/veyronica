import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuditEvent } from '../types';
import { ShieldAlert, Search, RefreshCw, ChevronDown, ChevronRight, Filter } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [runIdFilter, setRunIdFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchAudit = async () => {
    try {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-100">Immutable Audit Trail</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Append-Only Triggers Enforced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Every state transition, agent signal, check result, and human approval is cryptographically logged with zero update/delete permission.
          </p>
        </div>

        <button
          onClick={fetchAudit}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Refresh audit events"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold">Event Type:</span>
          <select
            aria-label="Filter by event type"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
            <option value="action_executed">action_executed</option>
            <option value="action_rejected">action_rejected</option>
            <option value="run_completed">run_completed</option>
            <option value="run_failed">run_failed</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by Run ID..."
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
            value={runIdFilter}
            onChange={(e) => setRunIdFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-400" />
            <span>Loading audit log...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No audit events found matching filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3">Event ID</th>
                <th className="p-3">Event Type</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Run ID</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {events.map((e) => {
                const isExpanded = expandedId === e.event_id;

                return (
                  <React.Fragment key={e.event_id}>
                    <tr
                      className="hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : e.event_id)}
                    >
                      <td className="p-3 text-slate-500">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td className="p-3 text-slate-400">#{e.event_id}</td>
                      <td className="p-3 font-semibold text-indigo-300">{e.event_type}</td>
                      <td className="p-3 text-slate-200">
                        {e.actor_id} <span className="text-slate-500 text-[10px]">({e.actor_type})</span>
                      </td>
                      <td className="p-3 text-slate-400">{e.run_id.slice(0, 8)}...</td>
                      <td className="p-3 text-slate-400">{new Date(e.created_at).toLocaleString()}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-950">
                        <td colSpan={6} className="p-4 border-t border-slate-800">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-sans">
                            Event Payload (JSONB)
                          </div>
                          <pre className="text-xs text-emerald-400 font-mono bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                            {JSON.stringify(e.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
