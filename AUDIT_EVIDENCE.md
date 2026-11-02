# Veyronica Forensic Audit Evidence Log
**Repository:** `d:\Projects 2\Veyronica`  
**Execution Context:** Windows PowerShell / Python 3.13 / Node.js 20+  
**Execution Date:** 2026-11-02  

---

## 1. Automated Test Suite Execution (pytest)

```bash
$ pytest tests/ -v
============================= test session starts =============================
platform win32 -- Python 3.13.9, pytest-8.3.4, pluggy-1.5.0
cachedir: .pytest_cache
rootdir: D:\Projects 2\Veyronica
plugins: anyio-4.10.0, Faker-37.3.0, asyncio-0.24.0, cov-6.2.1
asyncio: mode=Mode.STRICT

collected 45 items

tests/test_agents.py::test_calculate_order_qty_hero_scenario PASSED      [  2%]
tests/test_agents.py::test_calculate_order_qty_moq_bound PASSED          [  4%]
tests/test_agents.py::test_calculate_order_qty_pack_size_round_up PASSED [  6%]
tests/test_agents.py::test_routing_agent_hero_scenario PASSED            [  8%]
tests/test_agents.py::test_check_results_json_array_serialization PASSED [ 11%]
tests/test_agents.py::test_multi_supplier_route_aggregation PASSED       [ 13%]
tests/test_api_approvals.py::test_role_hierarchy_permissions PASSED      [ 15%]
tests/test_api_approvals.py::test_rejection_reason_minimum_length PASSED [ 17%]
tests/test_api_approvals.py::test_decision_request_model PASSED          [ 20%]
tests/test_api_approvals.py::test_store_scoping_authorization PASSED     [ 22%]
tests/test_checks.py::test_moq_check_pass PASSED                         [ 24%]
tests/test_checks.py::test_moq_check_fail PASSED                         [ 26%]
tests/test_checks.py::test_lead_time_pass PASSED                         [ 28%]
tests/test_checks.py::test_lead_time_flag PASSED                         [ 31%]
tests/test_checks.py::test_lead_time_fail PASSED                         [ 33%]
tests/test_checks.py::test_budget_headroom_pass PASSED                   [ 35%]
tests/test_checks.py::test_budget_headroom_flag_hero_scenario PASSED     [ 37%]
tests/test_checks.py::test_budget_headroom_fail PASSED                   [ 40%]
tests/test_checks.py::test_credit_limit_pass PASSED                      [ 42%]
tests/test_checks.py::test_credit_limit_flag PASSED                      [ 44%]
tests/test_checks.py::test_credit_limit_fail PASSED                      [ 46%]
tests/test_innovations.py::test_active_rules_endpoint PASSED             [ 48%]
tests/test_innovations.py::test_policy_suggestion_flow PASSED            [ 51%]
tests/test_llm_client.py::test_llm_client_fallback_rationale PASSED      [ 53%]
tests/test_llm_client.py::test_llm_client_fallback_email PASSED          [ 55%]
tests/test_gemini_model_resolution PASSED            [ 57%]
tests/test_llm_client.py::test_gemini_eight_key_pool PASSED              [ 60%]
tests/test_llm_client.py::test_gemini_multi_key_failover PASSED          [ 62%]
tests/test_llm_client.py::test_numeric_hallucination_guard_clean PASSED  [ 64%]
tests/test_llm_client.py::test_numeric_hallucination_guard_catches_unauthorized_number PASSED [ 66%]
tests/test_policy.py::TestRiskClassification::test_any_fail_produces_high_risk PASSED [ 68%]
tests/test_policy.py::TestRiskClassification::test_unapproved_supplier_produces_high_risk PASSED [ 71%]
tests/test_policy.py::TestRiskClassification::test_value_exceeding_double_limit_produces_high_risk PASSED [ 73%]
tests/test_policy.py::TestRiskClassification::test_flag_produces_medium_risk PASSED [ 75%]
tests/test_policy.py::TestRiskClassification::test_all_pass_produces_low_risk PASSED [ 77%]
tests/test_policy.py::TestApprovalRoutingPolicy::test_routing_table_scenarios[checks0-total_value0-True-high-regional_manager] PASSED [ 80%]
tests/test_policy.py::TestApprovalRoutingPolicy::test_routing_table_scenarios[checks1-total_value1-True-high-regional_manager] PASSED [ 82%]
tests/test_policy.py::TestApprovalRoutingPolicy::test_routing_table_scenarios[checks2-total_value2-True-medium-regional_manager] PASSED [ 84%]
tests/test_policy.py::TestApprovalRoutingPolicy::test_routing_table_scenarios[checks3-total_value3-True-medium-store_manager] PASSED [ 86%]
tests/test_policy.py::TestApprovalRoutingPolicy::test_routing_table_scenarios[checks4-total_value4-False-low-store_manager] PASSED [ 88%]
tests/test_policy.py::TestApprovalRoutingPolicy::test_routing_table_scenarios[checks5-total_value5-True-low-auto] PASSED [ 91%]
tests/test_temporal_simulation.py::test_adapters_health_temporal_resilience PASSED [ 93%]
tests/test_workflow_graph.py::test_langgraph_topology_structure PASSED   [ 95%]
tests/test_workflow_graph.py::test_create_replenishment_graph_compile PASSED [ 97%]
tests/test_workflow_graph.py::test_api_graph_topology_endpoint PASSED    [100%]

======================= 45 passed, 16 warnings in 4.06s =======================
```

---

## 2. Frontend Production Build Verification (Vite + TypeScript)

```bash
$ npm --prefix frontend run build
> veyronica-frontend@0.1.0 build
> tsc && vite build

vite v6.4.5 building for production...
transforming...
✓ 2221 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.97 kB │ gzip:   0.56 kB
dist/assets/index-D5hYNPrE.css   33.09 kB │ gzip:   6.55 kB
dist/assets/index-BFwEupH_.js   676.09 kB │ gzip: 184.59 kB
✓ built in 5.25s
```

---

## 3. Real Backend API Endpoint Probing Results

Probed via ASGI client against live FastAPI app:

| Status Code | Method | Path | Response Snippet / Observed Error |
|---|---|---|---|
| `200 OK` | `GET` | `/` | `{"name": "Veyronica", "description": "V-Mart Governed Agentic Replenishment Platform", "version": "0.1.0", "status": "running", "docs": "/docs"}` |
| `200 OK` | `GET` | `/api/workflows/graph/topology` | `{"engine": "LangGraph", "version": "StateGraph", "nodes": [{"id": "signal_node", "name": "Inventory Signal Agent", "type": "agent"...` |
| `200 OK` | `GET` | `/api/policy/rules` | `{"auto_approve_limit_inr": 10000, "store_manager_limit_inr": 50000, "regional_manager_limit_inr": 150000, "max_lead_time_days": 7...` |
| `200 OK` | `GET` | `/api/adapters/health` | `{"postgres": "error", "temporal": "ok", "worker": "ok", "inventory_adapter": "error", "erp_adapter": "error", "supplier_adapter": "error"}` |
| `200 OK` | `GET` | `/api/policy/suggestions` | `[]` (silently catches DB exception and returns empty list per `api/policy.py:48-49`) |
| `422 Unprocessable` | `POST` | `/api/approvals/.../reject` (short reason: 9 chars) | `{"detail": "Rejection reason must be at least 20 characters"}` |
| `EXCEPTION` | `GET` | `/api/approvers` | `TypeError: connect() got an unexpected keyword argument 'channel_binding'` |
| `EXCEPTION` | `GET` | `/api/runs` | `TypeError: connect() got an unexpected keyword argument 'channel_binding'` |
| `EXCEPTION` | `GET` | `/api/approvals/pending` | `TypeError: connect() got an unexpected keyword argument 'channel_binding'` |
| `EXCEPTION` | `POST` | `/api/workflows/replenishment/trigger` | `TypeError: connect() got an unexpected keyword argument 'channel_binding'` |
| `EXCEPTION` | `GET` | `/api/audit` | `TypeError: connect() got an unexpected keyword argument 'channel_binding'` |
| `EXCEPTION` | `GET` | `/api/audit/verify-integrity` | `TypeError: connect() got an unexpected keyword argument 'channel_binding'` |
| `EXCEPTION` | `GET` | `/api/dashboard/metrics` | `TypeError: connect() got an unexpected keyword argument 'channel_binding'` |

---

## 4. Dynamic Proof Test 2: Different Inputs, Different Outputs

Script executed: `scratch/test_different_inputs.py`  
Output:
```text
=== TEST 2: DIFFERENT INPUTS, DIFFERENT OUTPUTS ===
Input A (INR 8,000, 4d lead, clean budget) -> Qty: 30, Risk: low, Tier: auto
Input B (INR 42,000, 5d lead, 70% budget flag) -> Qty: 60, Risk: medium, Tier: store_manager
Input C (INR 120,000, 11d lead time, budget breach) -> Qty: 210, Risk: high, Tier: regional_manager
```
**Conclusion:** Order quantity calculation (`calculate_order_qty`), deterministic checks (`check_moq`, `check_lead_time`, `check_budget_headroom`, `check_credit_limit`), and risk/tier classification (`classify_risk`, `evaluate_approval_policy`) compute dynamically and logically from inputs.

---

## 5. Dynamic Proof Test 5: Audit Trail SHA-256 Tamper Detection

Script executed: `scratch/test_audit_integrity.py`  
Output:
```text
=== TEST 5: AUDIT TRAIL INTEGRITY & TAMPER DETECTION ===
Original Root Hash: a860e56da50e64c05561f3af5aa0f85a8b228450fc9d81a449b0d23819dd9f21
Tampered Root Hash: c69d9b382b7c85a8f2f64bb849ee38346499a3c7e9543c3d8150a0efe30a77df
SUCCESS: Cryptographic hash chain mismatch detected! Tampering broke the chain root.
```
**Conclusion:** Recomputing SHA-256 hashes across event records produces a completely different root hash if any single value in the payload is modified. However, `api/audit.py:56-117` re-hashes without checking against an anchored root, meaning `/verify-integrity` alone always reports `verified: True` for the current table state.

---

## 6. Dynamic Proof Test 6: External Integrations & LLM Key Pool

Script executed: `scratch/test_llm_live.py`  
Raw Output:
```text
=== TEST 6: LIVE LLM CALL TEST ===
Gemini API key #1 failed (429 You exceeded your current quota... limit: 5, model: gemini-3.8-flash... Please retry in 37s); trying next available key...
Gemini API key #2 failed (429 You exceeded your current quota... Please retry in 25s); trying next available key...
Gemini API key #3 failed (429 You exceeded your current quota... Please retry in 25s); trying next available key...
Gemini API key #4 failed (429 You exceeded your current quota... Please retry in 13s); trying next available key...
Gemini API key #5 failed (429 You exceeded your current quota... Please retry in 56s); trying next available key...
Gemini API key #6 failed (429 You exceeded your current quota... Please retry in 55s); trying next available key...
Gemini API key #7 failed (429 You exceeded your current quota... Please retry in 54s); trying next available key...
Gemini API key #8 failed (429 You exceeded your current quota... Please retry in 53s); trying next available key...
Grok fallback rationale generation failed: Error code: 400 - {'code': 'invalid-argument', 'error': 'Incorrect API key provided. You can obtain an API key from https://console.x.ai.'}
RATIONALE SOURCE: template
RATIONALE TEXT: Store STORE-214 has 2.0 days of cover for SKU-8821 (items) at a 7-day sales velocity of 5.0 units/day. Reordering 60 units restores 14-day cover.
```
**Conclusion:** Real network calls are made to Google Gemini across all 8 configured keys and then to xAI Grok. All 8 free-tier Gemini keys are currently rate-limited (HTTP 429), and the Grok API key is invalid (HTTP 400). The client gracefully fell back to the Plan C deterministic template.

---

## 7. Real Browser Interaction & Console Logs

Recorded browser session: `audit_browser_tour_1793640383658.webp`  
Console Error Logs Observed in Browser:
```text
[Browser Console] Failed to load resource: the server responded with a status of 500 (Internal Server Error) [http://localhost:8000/api/approvers]
[Browser Console] Failed to load resource: the server responded with a status of 500 (Internal Server Error) [http://localhost:8000/api/approvals/pending]
[Browser Console] Failed to load resource: the server responded with a status of 500 (Internal Server Error) [http://localhost:8000/api/runs]
[Browser Console] Failed to load resource: the server responded with a status of 500 (Internal Server Error) [http://localhost:8000/api/admin/store-state/STORE-214]
[Browser Console] Failed to load resource: the server responded with a status of 500 (Internal Server Error) [http://localhost:8000/api/audit]
[Browser Console] Failed to load resource: the server responded with a status of 500 (Internal Server Error) [http://localhost:8000/api/dashboard/metrics]
[Browser Console] Failed to load resource: the server responded with a status of 500 (Internal Server Error) [http://localhost:8000/api/workflows/replenishment/trigger]
[UI Notification Alert] "Trigger failed: Failed to fetch / Internal Server Error"
```
