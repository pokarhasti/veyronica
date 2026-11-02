# Veyronica — The Editorial Ledger Redesign Progress

## Design System Overview: The Editorial Ledger
- **Base Concept:** Institutional High-Trust Financial Chronicle & Cryptographic Ledger (Concept A) + Ledger Process Ribbon (from Concept C on run/approval pages).
- **Color Palette (CSS Variables & Tailwind Mapped):**
  - Ground / Canvas: `#FDFBF7` (`--ledger-ground` / warm alabaster rag vellum)
  - Card & Surface: `#FFFFFF` (`--ledger-surface` / crisp archival white)
  - Surface Subdued: `#F5F2EB` (`--ledger-surface-subdued` / tinted parchment)
  - Primary Ink: `#1C1917` (`--ledger-ink` / high-contrast stone-black)
  - Secondary Ink: `#57534E` (`--ledger-ink-muted` / warm charcoal)
  - Tertiary / Caption: `#78716C` (`--ledger-ink-faint` / muted slate-stone)
  - Hairline Rule: `#E7E5E4` (`--ledger-hairline` / 1px crisp rule separator)
  - Primary Accent (Seal): `#991B1B` (`--ledger-crimson` / wax-seal vermilion)
  - Certified (Success): `#065F46` (`--ledger-emerald` / cryptographic forest green, bg `#F0FDF4`)
  - Pending (Awaiting Gate): `#B45309` (`--ledger-amber` / aged bronze, bg `#FFFBEB`)
  - Danger (Breached/Rejected): `#991B1B` (`--ledger-rose` / archival red, bg `#FEF2F2`)
- **Typography Hierarchy:**
  - Display / Headings: `Playfair Display`, Georgia, serif (high-trust editorial serif)
  - Body & UI Controls: `Plus Jakarta Sans`, system-ui, sans-serif (refined editorial geometric sans)
  - Hashes, IDs, Tabular Figures: `IBM Plex Mono`, Menlo, monospace (cryptographic ledger alignment)
- **Radii:** Sharp, restrained corners (`2px` to `6px` maximum) reflecting printed financial folios.
- **Elevation & Shadows:** Minimal shadows (`shadow-xs` / `1px` soft wash); visual hierarchy achieved through 1px hairline rules (`border-stone-200`) and whitespace.
- **Texture:** Subtle CSS-only micro paper grain (<4% opacity) for tactile depth without image assets.
- **Motion:** 150-300ms easing with stamp-press micro-interaction on status changes; respects `prefers-reduced-motion`.

---

## Redesign Progress Checklist

| ID | Item | Status | Files touched | Notes |
|:---|:---|:---:|:---|:---|
| **DS-00** | Concept & Navigation Pattern Selection | Done | `DESIGN_CONCEPTS.md` | Selected Concept A (Editorial Ledger) + Concept C process strip on run pages |
| **DS-01** | Design System Foundation & Tokens | Done | `frontend/tailwind.config.js`, `frontend/src/index.css`, `frontend/index.html` | Defined CSS variables, Tailwind tokens, Google Fonts, paper grain texture, stamp-press keyframes |
| **DS-02** | Shared Editorial Primitives | Done | `frontend/src/components/primitives/*` | Built StampBadge, HairlineRule, LedgerRow, HashBlock, SectionHeading, LedgerEmptyState, LedgerSkeleton, PrimitivesShowcase |
| **CMP-01** | Archival Masthead & Navigation | Done | `frontend/src/components/Header.tsx` | Broadsheet masthead, brand seal, hairline section links, approver selector, health stamp |
| **CMP-02** | RiskBadge | Done | `frontend/src/components/RiskBadge.tsx` | Rectangular ink stamp with double hairlines (`[ LOW RISK ]`, `[ HIGH RISK ]`) |
| **CMP-03** | CheckRow | Done | `frontend/src/components/CheckRow.tsx` | Tabular ledger line with dotted leaders (`...`) and certified pass/fail seal marks |
| **CMP-04** | Modal | Done | `frontend/src/components/Modal.tsx` | Archival affidavit dialog with hairline borders, vellum ground, and seal action buttons |
| **CMP-05** | Timeline | Done | `frontend/src/components/Timeline.tsx` | Chronological audit ledger with hairline rules and timestamped ink stamps |
| **CMP-06** | PipelineStepper | Done | `frontend/src/components/PipelineStepper.tsx` | Ledger process strip with curved connectors in ink/crimson/emerald/bronze palette |
| **CMP-07** | DecisionCard | Done | `frontend/src/components/DecisionCard.tsx` | Folio-style approval docket, multi-supplier tabs, dotted line overrides, certified hash proof strip |
| **CMP-08** | Masthead Meta Strip | Done | `frontend/src/components/Header.tsx` | Store volume index, temporal block ticker, cryptographic chain integrity status |
| **PG-01** | App Layout Wrapper | Done | `frontend/src/App.tsx` | Warm alabaster ground (`#FDFBF7`), subtle CSS grain, masthead layout wrapper, archival colophon footer |
| **PG-02** | HomePage (Daily Chronicle) | Done | `frontend/src/pages/HomePage.tsx` | Broadsheet hero trigger, daily dispatch summary, Balance Sheet Simulator with ink dials, primitives inspection drawer |
| **PG-03** | ApprovalQueuePage | Done | `frontend/src/pages/ApprovalQueuePage.tsx` | Fiduciary docket queue, role-scoped filings, empty archival seal state |
| **PG-04** | ApprovalDetailPage | Done | `frontend/src/pages/ApprovalDetailPage.tsx` | Folio-style inspection split-pane, ledger line breakdown, dual-signature decision stamp |
| **PG-05** | WorkflowRunsPage | Done | `frontend/src/pages/WorkflowRunsPage.tsx` | Archival transaction ledger table with hairline rows, monospace block IDs, pagination indices |
| **PG-06** | RunDetailPage | Done | `frontend/src/pages/RunDetailPage.tsx` | Full audit docket, Concept C ledger process ribbon, certified PO parchment view, email letterhead |
| **PG-07** | AuditTrailPage | Done | `frontend/src/pages/AuditTrailPage.tsx` | Cryptographic ledger, 4-char SHA-256 block inspector, tamper-evident certificate stamp |
| **PG-08** | DashboardPage | Done | `frontend/src/pages/DashboardPage.tsx` | Institutional financial metrics, inventory burn-down hairline chart, store ledger breakdown |
| **PG-09** | FuturePage | Done | `frontend/src/pages/FuturePage.tsx` | Policy learning chronicle, active rules ledger, suggested amendment dockets |
