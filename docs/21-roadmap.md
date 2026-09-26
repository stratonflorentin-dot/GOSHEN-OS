# 21 — Development Roadmap

Phases mirror the brief (§62). Each phase has an **acceptance gate** — defined
in `22-definition-of-done.md` — that must pass before the next phase starts.
Vertical slices ship to staging continuously inside each phase.

## Phase 1 — Foundation
Architecture (this package) → review → then:
Scaffolding (Next.js + TS strict + Tailwind + shadcn/ui + i18n en/sw) ·
Neon PostgreSQL project, numbered `db/migrations/` for tenancy schema (docs/03 §1–2 identity+farms) ·
Better Auth (email/password first; phone OTP deferred), profiles, organizations, members, invitations ·
Org + farm creation wizard (form-based, no map yet) · RLS + pgTAP suites ·
Billing/plan scaffolding (schema + trial) · CI/CD baseline.
**Gate:** a second org cannot see org 1's data (automated proof).

## Phase 2 — GIS Core
MapLibre workspace + layer system · GPS "Walk the Boundary" recorder
(accuracy display, pause/resume/undo, point filters) · polygon validation +
area/perimeter (ellipsoidal) · manual draw, GeoJSON/KML import · vertex editor
(move/add/delete; split/merge for polygons) · boundary versioning · map
features (buildings, water, fences…) · plots CRUD with geometry.
**Gate:** acceptance test items 4–8 from brief §71 work on a phone.

## Phase 3 — Operations: Crops & Livestock
Crop catalog/varieties/seasons · crop season planning · activities + inputs ·
harvests · plot rotation history · livestock species/groups/batches · events
(arrival/death/sale/weighing) · health records · feed consumption · batch
economics panel (all §14 metrics) · tasks v1 (assign/complete).
**Gate:** broiler batch 001 economics reproduce hand-calculated values exactly.

## Phase 4 — Inventory & Procurement
Inventory items/locations/categories · movement ledger + balances + moving
average cost · purchase request → PO → receipt → invoice → payment workflow ·
inputs consumed from stock link to activities/batches.
**Gate:** fertilizer purchase → inventory → application → plot cost chain
works end-to-end (brief §65).

## Phase 5 — Finance, Accounting, Profitability
Financial accounts (cash/bank/mobile money) · expenses/revenues · payments ·
double-entry journals + reversals · cost allocations · profitability views and
dashboards (plot/crop/season/batch) · owner contributions/withdrawals · loans.
**Gate:** trial balance zeroes; profitability per hectare matches manual calc.

## Phase 6 — Field Operations
Labor records → cost flow · equipment + usage + maintenance · irrigation zones
and events · soil records + lab report upload · documents module · tasks with
completion records feeding activities.
**Gate:** task completion auto-creates activity + labor + consumption records.

## Phase 7 — Weather & Analytics
Weather adapter (provider connected) + per-farm forecast/observations/alerts ·
weather→operations insight rules (evidence-backed, uncertainty-labeled) ·
satellite adapter interface (pending unless a provider is contracted) ·
analytics module: yield/cost/profit per hectare, FCR, mortality, comparisons ·
optional Python analytics service if SQL proves insufficient.
**Gate:** heavy-rain forecast produces review-actions referencing actual plots;
no fabricated satellite data shown.

## Phase 8 — 3D Visualization
High-quality CesiumJS scene (Cesium ion terrain + satellite imagery) behind `Scene3DProvider` adapter · terrain + boundary + plots +
infrastructure · orbit/tilt/zoom, plot pick → detail panel · falls back to
MapLibre fill-extrusion fallback when tokens are absent.
**Gate:** farm viewable in 3D; PostGIS remains spatial source of truth.

## Phase 9 — Offline
PWA + service worker · IndexedDB cache + outbox queue · offline GPS capture,
task viewing/completion, activity/observation/inventory-consumption recording ·
sync engine with idempotency + statuses (pending/syncing/synced/failed) ·
conflict policy per `12-offline-sync-architecture.md`.
**Gate:** airplane-mode field session syncs losslessly on reconnect.

## Phase 10 — AI Knowledge System
Knowledge source registry + ingestion pipeline · pgvector RAG · assistant UI ·
farm-data retrieval via whitelisted analytics functions · citations · safety
guardrails + confidence states · audit of all AI interactions.
**Gate:** every specialized answer carries inspectable citations; refusing
questions is demonstrable when evidence is absent.

## Phase 11 — Reports
Report catalog (farm, crop, livestock, financial, inventory, production,
profitability, weather, management) · PDF (server-rendered) · CSV/XLSX exports ·
scheduled report jobs.
**Gate:** export matches on-screen figures to the cent.

## Phase 12 — Commercial SaaS
Plans/limits enforcement (usage metering) · subscription lifecycle UI ·
granular permission model activation · platform admin console hardening.
**Gate:** limit exceeded → correct enforcement + upgrade path; no pricing
hardcoded.

## Phase 13 — Hardening & Production
Performance pass (targets in docs/01 §7) · security review + pen-test
checklist · observability (error tracking, API latency, sync-failure monitors)
· backup/restore drill · load test with 5,000-plot farm · production launch ·
**Bagamoyo Farm onboarded as tenant #1**.

## Continuous (all phases)
pgTAP RLS suite green · i18n keys (no hardcoded strings) · accessibility
contrast · mobile-first review · docs updated with code.
