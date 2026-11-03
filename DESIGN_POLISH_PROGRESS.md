# Veyronica — Design Polish Progress & Critique Checklist

This document tracks the Phase 0 audit and visual polish roadmap for the Veyronica Editorial Ledger application.
Identified under Phase 0 ("Look Before You Touch"), evaluated against real desktop (1440px) and mobile (390px) screenshots stored in `design-review/before/`.

---

## 1. Design System Identity & Guardrails

- **Aesthetic:** Concept A "The Editorial Ledger" (Institutional High-Trust Financial Chronicle & Cryptographic Ledger).
- **Theme:** Strictly LIGHT. Warm alabaster rag vellum ground (`#FDFBF7`), archival white cards (`#FFFFFF`), tinted parchment (`#F5F2EB`).
- **Typography:**
  - Display/Headings: `Playfair Display` (High-trust editorial serif)
  - Body/UI: `Plus Jakarta Sans` (Refined geometric editorial sans)
  - Figures/Hashes/Monospace: `IBM Plex Mono` (Cryptographic alignment, tabular numerals)
- **Palette:**
  - Primary Ink: `#1C1917` (High-contrast stone black)
  - Secondary Ink: `#57534E` (Warm charcoal) / Tertiary: `#78716C`
  - Hairlines: `#E7E5E4` (Crisp 1px borders) / Dark: `#D6D3D1`
  - Archival Crimson: `#991B1B` (Wax-seal vermilion accent)
  - Cryptographic Emerald: `#065F46` (Valid chains, certified checks)
  - Aged Amber Bronze: `#B45309` (Awaiting review, audit flags)
- **Hard Rules:**
  - No dark mode.
  - Zero changes to business logic, API calls, routes, or backend code.
  - No new external font packages or libraries.
  - Refinement pass only — no rebuilds.

---

## 2. Page-by-Page Audit & Polish Checklist

| ID | Page / Component | Problems Found in Before Screenshots | Planned Improvements | Status |
|:---|:---|:---|:---|:---:|
| **POL-00** | **Design Tokens & Primitives** (`tailwind.config.js`, `index.css`, `primitives/`) | Inconsistent button states (no unified primary/secondary/ghost/danger hierarchy); missing focus-visible rings; inputs lack custom chevrons; badges have uneven padding; elevation lacks subtle soft layering (`shadow-ledger-sm`). | Centralize button variants with hover lift & active press; refine input/select styling with SVG chevrons; polish `StampBadge`, `HashBlock`, and `LedgerEmptyState`; add smooth 200ms transitions and focus rings. | **Completed** |
| **POL-01** | **Global Masthead & Navigation** (`Header.tsx`, `App.tsx`) | Top metadata strip wraps clumsily on mobile; signatory selector looks like a raw HTML select without role badge or caret; tab navigation overflows abruptly on mobile with no scroll edge masking; reset button looks like an unstyled utility icon. | Add elegant custom dropdown wrapper with user avatar/role badge; add subtle horizontal scroll gradient indicators for mobile tabs; refine brand mark with crisp seal styling; polish reset button with tooltip and spinner indicator. | **Completed** |
| **POL-02** | **HomePage / § 01 Replenishment Check** (`HomePage.tsx`) | Hero text is dense with low weight contrast; primary "DISPATCH REPLENISHMENT RUN" button lacks visual hierarchy and click feel; Balance Sheet Simulator slider is bare HTML with no tactile notch feedback; Recent Dispatches table has plain text rows and clips awkwardly on 390px mobile. | Strengthen hero typographic hierarchy; elevate primary dispatch CTA with rich crimson gradient, hover micro-lift, and keyboard focus; transform budget simulator into a refined financial instrument dial; make Recent Dispatches table responsive with mobile card view. | **Completed** |
| **POL-03** | **Approval Queue / § 02 Approval Queue** (`ApprovalQueuePage.tsx`) | Table feels flat and bureaucratic; monospace hash columns overpower human store/SKU context; black pill filter buttons clash with the warm editorial theme; on mobile (390px), table forces horizontal scrolling rather than reflowing into clean dockets. | Rebalance table visual hierarchy (prominent store name, formatted ₹ amounts, compact hash chips); refine role filters to archival tab buttons; implement mobile card view with clear review action buttons and risk badges. | Planned |
| **POL-04** | **Approval Detail / Human Decision Card** (`ApprovalDetailPage.tsx`, `DecisionCard.tsx`) | Excessive border nesting creates visual fatigue; pipeline stepper above docket consumes too much vertical height; SKU item table lacks clear right-aligned tabular numbers; action buttons (Reject / Certify) lack distinct visual states and hover feedback; accordion checks have plain monospace blocks. | Streamline card container depth with soft shadows and hairline rules; optimize pipeline stepper height; format SKU table with crisp tabular figures and dotted leaders; polish Reject vs Certify action bar with prominent primary button, tooltips, and loading states; enhance compliance checks with clear pass/fail icons. | Planned |
| **POL-05** | **Workflow Runs / § 03 Workflow Runs** (`WorkflowRunsPage.tsx`) | Top KPI cards have thin hairline borders and plain numbers without trend or context; search and filter bar has mismatched heights and raw borders; raw milliseconds (`86335 ms`) look unrefined; mobile layout clips columns. | Elevate KPI cards with archival corner brackets and formatted figures; harmonize search and filter controls into a unified toolbar; format prep times as human-friendly seconds (`86.3s`); add mobile-responsive card reflow for run records. | Planned |
| **POL-06** | **Run Detail / § 03 Run Detail View** (`RunDetailPage.tsx`) | Metadata box at top is fragmented; stepper + timeline stack takes over 500px before order contents appear; tab navigation bar blends into existing hairlines; ERP PO parchment letterhead lacks crisp archival typography. | Consolidate run header metadata into an executive summary folio; streamline stepper layout to save vertical space; polish tab switcher with crisp active states; refine completed PO parchment view with elegant official seal and print-ready layout. | Planned |
| **POL-07** | **Audit Trail / § 04 Cryptographic Ledger** (`AuditTrailPage.tsx`) | "AUDIT CRYPTOGRAPHIC INTEGRITY" button has high-contrast teal that clashes with the palette; verification certificate is a huge block of text; 90+ events render as an endless flat list without visual chunking; expanded JSON payloads lack syntax styling. | Unify verification button with cryptographic emerald palette; structure verification certificate into high-trust certificate stamps; add pagination or clean batching for events; format JSON payloads into clean, readable key-value inspection grids. | Planned |
| **POL-08** | **Metrics Desk / § 05 Operations Dashboard** (`DashboardPage.tsx`) | KPI cards display plain zeros with no sparklines or comparative context; latency comparison bar chart has harsh brown/crimson bars and sparse typography; lacks category breakdown and inventory burn-down visuals mentioned in design spec. | Redesign KPI cards with subtle accent tints and benchmark comparison micro-badges; polish Recharts bar chart with warm editorial color palette, custom tooltips, and rounded corners; add category breakdown or replenishment volume charts. | Planned |
| **POL-09** | **Policy Learning & Sandbox / § 06 Policy Learning** (`FuturePage.tsx`) | Threshold cards have flat typography and uneven alignment; empty state for amendment proposals feels like a blank wireframe; enterprise scaling cards at bottom look like generic SaaS marketing blocks. | Refine statutory threshold cards into institutional policy codex plaques; design an elegant, purposeful empty state with illustrated archival seal and clear explanation; elevate scaling chronicle into high-trust system integration dockets. | Planned |

---

## 3. Before / After Screenshot Index

All screenshots are stored in `design-review/`:

### Before Screenshots
- `design-review/before/01_home_desktop.png` (1440px)
- `design-review/before/01_home_mobile.png` (390px)
- `design-review/before/02_approval_queue_desktop.png` (1440px)
- `design-review/before/02_approval_queue_mobile.png` (390px)
- `design-review/before/03_approval_detail_desktop.png` (1440px)
- `design-review/before/03_approval_detail_mobile.png` (390px)
- `design-review/before/04_workflow_runs_desktop.png` (1440px)
- `design-review/before/04_workflow_runs_mobile.png` (390px)
- `design-review/before/05_run_detail_desktop.png` (1440px)
- `design-review/before/05_run_detail_mobile.png` (390px)
- `design-review/before/06_audit_trail_desktop.png` (1440px)
- `design-review/before/06_audit_trail_mobile.png` (390px)
- `design-review/before/07_dashboard_desktop.png` (1440px)
- `design-review/before/07_dashboard_mobile.png` (390px)
- `design-review/before/08_policy_learning_desktop.png` (1440px)
- `design-review/before/08_policy_learning_mobile.png` (390px)

### After Screenshots
- `design-review/after/01_home_desktop.png` (1440px) — **POL-02 Completed**
- `design-review/after/01_home_mobile.png` (390px) — **POL-02 Completed**
