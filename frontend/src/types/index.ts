export interface CheckResult {
  check_name: 'moq' | 'lead_time' | 'budget_headroom' | 'credit_limit' | 'dc_allocation' | 'peer_transfer';
  status: 'PASS' | 'FLAG' | 'FAIL';
  reason: string;
  numeric_evidence: Record<string, any>;
}

export interface DraftLine {
  sku: string;
  sku_name: string;
  qty: number;
  unit_cost: number;
  line_value: number;
}

export interface DraftAction {
  action_id: string;
  run_id: string;
  action_type: 'create_purchase_order' | 'send_supplier_email';
  tool_name: string;
  tool_args: {
    store_id: string;
    supplier_id: string;
    supplier_name?: string;
    lines: DraftLine[];
  };
  risk_class: 'low' | 'medium' | 'high';
  total_value: number;
  rationale: string;
  rationale_source: 'ai_generated' | 'template';
  evidence_refs: string[];
  check_results: CheckResult[];
  draft_status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed';
}

export interface ApprovalRequest {
  approval_id: string;
  action_id: string;
  run_id: string;
  assigned_role: 'store_manager' | 'regional_manager';
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  decided_by?: string;
  decided_by_role?: string;
  decided_at?: string;
  rejection_reason?: string;
  // joined fields in pending queue
  total_value?: number;
  risk_class?: 'low' | 'medium' | 'high';
  rationale?: string;
  rationale_source?: 'ai_generated' | 'template';
  tool_args?: any;
}

export interface ReplenishmentSignal {
  signal_id: string;
  run_id: string;
  sku: string;
  sku_name: string;
  store_id: string;
  current_stock: number;
  reorder_threshold: number;
  sales_velocity_7d: number;
  days_of_cover: number;
  supplier_id: string;
  created_at: string;
}

export interface AuditEvent {
  event_id: number;
  run_id: string;
  correlation_id: string;
  event_type: string;
  actor_type: 'agent' | 'human' | 'system';
  actor_id: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface RunSummary {
  run_id: string;
  correlation_id: string;
  store_id: string;
  status: 'running' | 'awaiting_approval' | 'completed' | 'rejected' | 'failed';
  started_at: string;
  temporal_wf_id?: string | null;
  awaiting_since?: string;
  completed_at?: string;
  agent_prep_ms?: number;
  approval_wait_ms?: number;
}

export interface PurchaseOrder {
  po_id: string;
  action_id: string;
  run_id: string;
  store_id: string;
  supplier_id: string;
  lines: any;
  total_value: number;
  created_at: string;
}

export interface SentEmail {
  email_id: string;
  action_id: string;
  run_id: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: string;
}

export interface RunDetail extends RunSummary {
  signals: ReplenishmentSignal[];
  drafts: DraftAction[];
  approval_requests: ApprovalRequest[];
  audit_events: AuditEvent[];
  purchase_orders?: PurchaseOrder[];
  sent_emails?: SentEmail[];
}

export interface DashboardMetrics {
  total_runs: number;
  pending_approvals: number;
  approved: number;
  rejected: number;
  auto_approved: number;
  avg_agent_prep_seconds?: number;
  avg_approval_wait_seconds?: number;
  manual_baseline_minutes: { low: number; high: number };
  digiproc_baseline_minutes: number;
}

export interface ApproverInfo {
  approver_id: string;
  name: string;
  role: 'store_manager' | 'regional_manager';
  store_id?: string;
}

export interface HealthStatus {
  postgres: string;
  temporal: string;
  worker: string;
  inventory_adapter: string;
  erp_adapter: string;
  supplier_adapter: string;
}
