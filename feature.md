# Veyronica — Website Features

## 1. § 01 Replenishment Check (Homepage & Trigger)
- **Multi-Store Selector**: Switch between demo stores (STORE-214 Lucknow, STORE-087 Jaipur, STORE-312 Patna).
- **Store Inventory & Context Cards**: Live overview of store profile, target categories, and risk status.
- **Replenishment Dispatch Trigger**: 1-click trigger to execute the autonomous multi-agent pipeline.
- **Interactive Balance Sheet Simulator**: Live slider to modify budget spent and simulate headroom constraints.
- **Certified Seed State Reset**: One-click restore button for clean demo state.
- **Recent Runs Feed**: Quick-access list of recent pipeline runs with status badges.

## 2. § 02 Approval Queue (Human-in-the-Loop Governance)
- **Role-Based Queue Filtering**: Automatically filters approvals by active signatory role (Store Manager vs Regional Manager).
- **Real-Time Polling Counter**: Live notification badge in header updated every 4 seconds.
- **Decision Card Previews**: At-a-glance cards showing store, total order value, risk tier, and triggered constraints.
- **Direct Review Navigation**: Quick routing to the approval evaluation workspace.

## 3. § 03 Workflow Runs (Pipeline Observability)
- **Audit-Grade Runs Ledger**: Complete historical table of all autonomous and human-gated runs.
- **Status & Mode Indicators**: Clear indicators for Running, Waiting Approval, Auto-Approved, Completed, and Rejected.
- **Run Metadata Inspection**: Stores duration, execution timestamp, store identifier, and total replenishment cost.

## 4. Run & Approval Detail Workspace
- **Multi-Agent Pipeline Visualizer**: Step-by-step progress tracking across signal detection, constraints, drafting, decision, and dispatch.
- **Constraint Rule Engine**: Deterministic checks for budget ceiling, supplier ratings, minimum order quantities (MOQ), and lead times.
- **Inventory Optimization Badges**: Surfaces warehouse DC availability and peer store transfer opportunities.
- **Signatory Action Console**: Secure Approve, Reject, and Delegate controls bound to user authority limits.
- **ERP Integration & Dispatch Simulation**: Automatic ERP Purchase Order creation and supplier email notifications.

## 5. § 04 Audit Trail (Cryptographic Ledger)
- **SHA-256 Hash Chaining**: Every lifecycle event is cryptographically linked to previous events for non-repudiation.
- **Audit Log Filtering**: Search events by Run ID, Actor ID, and Event Type.
- **Cryptographic Integrity Verifier**: Recomputes hash chain live and verifies PostgreSQL append-only trigger rules.
- **Tamper Evidence Display**: Real-time pass/fail certificate proving ledger immutability.

## 6. § 05 Metrics Desk (Operations Dashboard)
- **Executive KPI Cards**: Real-time metrics for Auto-Approval Rate, Stockout Reduction, Capital Saved, and Active Stores.
- **Interactive Visual Charts**: Dynamic charts powered by Recharts showing category distribution and replenishment trends.
- **Risk & Decision Analytics**: Breakdowns of automated vs human-escalated purchase orders.

## 7. § 06 Policy Learning & Sandbox
- **AI Policy Suggestion Engine**: Analyzes rejection rationale to recommend policy and threshold adjustments.
- **Policy Modification Actions**: Apply or dismiss AI-generated rules directly into governance policies.
- **Feedback Loop**: Enables self-improving replenishment guidelines over time.

## 8. Global Platform Features
- **Signatory Persona Switcher**: Instant switching between Store Managers and Regional Procurement Managers.
- **Global Demo State Reset**: Restores PostgreSQL database and seed data with a single click.
- **Financial Ledger Design System**: Bespoke editorial aesthetic with paper grain, serif typography, and accessible contrasts.
