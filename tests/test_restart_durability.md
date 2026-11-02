# Veyronica — Durability & Restart Verification Procedure

This document specifies the exact verification procedure for testing the durable human-in-the-loop approval gate across server crashes and worker restarts (Section 7.3 & Section 17).

---

## The Contract

1. When a replenishment run requires human approval (e.g. STORE-214 hero scenario), the workflow reaches `workflow.wait_condition(lambda: self._decision is not None)`.
2. The state is recorded in PostgreSQL (`runs.status = 'awaiting_approval'`, `approval_requests.status = 'pending'`).
3. **Failure Injection:** The API server, background worker, or both are killed completely while waiting for approval.
4. **Resumption:** Services are restarted. The Temporal workflow history is intact in Temporal history.
5. **Decision:** An approver approves or rejects via `POST /api/approvals/{approval_id}/approve`.
6. The decision is committed to Postgres **before** the Temporal signal is dispatched.
7. If the signal is delivered, the workflow immediately resumes, executes ERP PO creation and sends the supplier email.
8. If the Temporal service was temporarily unreachable during the API decision, the startup reconciliation loop in `app/main.py` detects any decided-but-unsignalled runs and re-signals Temporal automatically.

---

## 5-Step Verification Walkthrough

### Step 1: Trigger Replenishment
```bash
curl -X POST http://localhost:8000/api/workflows/replenishment/trigger \
  -H "Content-Type: application/json" \
  -d '{"store_id": "STORE-214"}'
```
Response:
```json
{
  "run_id": "d3b07384-...",
  "correlation_id": "...",
  "temporal_wf_id": "replenishment-d3b07384-...",
  "status": "running"
}
```

### Step 2: Verify Pending Approval
Poll `GET /api/runs/{run_id}` until `status == "awaiting_approval"`.
Verify in Postgres:
```sql
SELECT status, awaiting_since FROM runs WHERE run_id = '...';
SELECT approval_id, assigned_role, status FROM approval_requests WHERE run_id = '...';
```

### Step 3: Hard Kill Worker & API
```bash
# Terminate the worker process and API server process
pkill -f "app.temporal.worker"
pkill -f "app.main"
```

### Step 4: Restart Worker & API
```bash
python -m uvicorn app.main:app --port 8000 &
python -m app.temporal.worker &
```

### Step 5: Deliver Human Decision
```bash
curl -X POST http://localhost:8000/api/approvals/{approval_id}/approve \
  -H "Content-Type: application/json" \
  -d '{"approver_id": "APR-SM-214"}'
```

### Verification Assertions:
1. `purchase_orders` contains 1 new record with `action_id = ...`.
2. `sent_emails` contains 1 record to `supplier-a@example.com`.
3. `audit_events` contains `approval_decided`, `action_executed`, and `run_completed` in order.
4. Re-submitting the approval returns `409 Conflict`.
