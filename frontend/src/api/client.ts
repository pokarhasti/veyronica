import {
  ApprovalRequest,
  ApproverInfo,
  AuditEvent,
  DashboardMetrics,
  HealthStatus,
  RunDetail,
  RunSummary,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Workflows
  triggerReplenishment: (store_id: string) =>
    fetchJson<{ run_id: string; correlation_id: string; temporal_wf_id: string; status: string }>(
      '/api/workflows/replenishment/trigger',
      {
        method: 'POST',
        body: JSON.stringify({ store_id }),
      }
    ),

  // Runs
  getRuns: (store_id?: string) =>
    fetchJson<RunSummary[]>(`/api/runs${store_id ? `?store_id=${store_id}` : ''}`),

  getRun: (run_id: string) => fetchJson<RunDetail>(`/api/runs/${run_id}`),

  // Approvals
  getPendingApprovals: (role?: string) =>
    fetchJson<ApprovalRequest[]>(`/api/approvals/pending${role ? `?role=${role}` : ''}`),

  getApproval: (approval_id: string) => fetchJson<any>(`/api/approvals/${approval_id}`),

  approveAction: (approval_id: string, approver_id: string) =>
    fetchJson<{ message: string; approval_id: string; status: string }>(
      `/api/approvals/${approval_id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ approver_id }),
      }
    ),

  rejectAction: (approval_id: string, approver_id: string, reason: string) =>
    fetchJson<{ message: string; approval_id: string; status: string }>(
      `/api/approvals/${approval_id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ approver_id, reason }),
      }
    ),

  // Audit
  getAuditEvents: (params?: { run_id?: string; event_type?: string; actor_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.run_id) q.set('run_id', params.run_id);
    if (params?.event_type) q.set('event_type', params.event_type);
    if (params?.actor_id) q.set('actor_id', params.actor_id);
    return fetchJson<AuditEvent[]>(`/api/audit?${q.toString()}`);
  },

  // Dashboard
  getDashboardMetrics: () => fetchJson<DashboardMetrics>('/api/dashboard/metrics'),

  // Approvers
  getApprovers: () => fetchJson<ApproverInfo[]>('/api/approvers'),

  // Adapters health
  getHealth: () => fetchJson<HealthStatus>('/api/adapters/health'),

  // Demo reset
  resetDemo: () => fetchJson<{ message: string; status: string }>('/api/admin/reset-demo', { method: 'POST' }),
};
