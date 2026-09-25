# 22 — Definition of Done

A module is **done** only when every applicable item below is true. Phase gates
in `21-roadmap.md` apply these definitions plus the phase gate.

## 1. Universal Definition of Done (every module)

**Functionality**
- [ ] Implements the approved wireframe (`09-wireframes.md`) and user journey
      (`10-user-journeys.md`) for its screens.
- [ ] No placeholder/mock functionality presented as real; unavailable
      integrations show an explicit "pending" state.
- [ ] Progressive disclosure respected: primary info first, detail views for
      advanced fields; role-appropriate disclosure (e.g., workers see no financials).

**Data & correctness**
- [ ] Tables/migrations added follow `03-database-schema.md` conventions;
      every tenant table has RLS policies + indexes.
- [ ] Calculations use pure functions in `lib/domain/` with unit tests
      covering edge cases (zero, empty, negative, currency/units mismatch).
- [ ] Financial figures reconcile: source doc → journal → report totals match.
- [ ] Caches (stock, counts, balances) maintained only via triggers/services —
      never ad-hoc writes.

**Security & tenancy**
- [ ] pgTAP RLS tests added: cross-org read denied, unauthorized write denied,
      role floor enforced (updated `tests/rls/` in the same PR).
- [ ] Zod validation on every input path; no trust in client data.
- [ ] Sensitive actions write audit records (actor, before/after, reason).
- [ ] No secrets in client code (lint-enforced); no PII in logs.

**Quality**
- [ ] Unit tests pass; integration tests for service flows; E2E journey for
      user-facing modules (Playwright).
- [ ] Typecheck + lint clean; no `any` in new code without justification.
- [ ] i18n: all strings are translation keys (en + sw provided).
- [ ] Accessible: keyboard navigable, contrast AA, labels on inputs.
- [ ] Mobile-responsive: field modules verified at 360 px width.

**Performance**
- [ ] Lists paginated server-side; no unbounded queries.
- [ ] N+1 patterns eliminated (query review); aggregates in SQL.
- [ ] Map views use tiles/clustering where geometry count can exceed ~2,000.

**Operations**
- [ ] Errors surface typed codes (`lib/errors.ts`); error tracking wired.
- [ ] Docs updated (module doc section + this checklist verified in PR
      description).
- [ ] Deployed to staging and smoke-tested by a second person.

## 2. Per-Module Addenda

| Module | Additional done-criteria |
|---|---|
| **Boundary capture** | Accuracy shown live; poor GPS warned; polygon validation catches self-intersection/duplicates/jumps; area in acres+ha+m² matches `ST_Area(geography)` reference within 0.5%; boundary versions retained; manual edit tools work (move/add/delete vertex, split, merge) |
| **Farm map** | Layer toggles persist; plot click opens info panel with live totals; < 2 s first paint on 3G |
| **Crop module** | Activity with input creates stock movement + cost allocation atomically; rotation history complete and correct |
| **Livestock** | All §14 economics metrics computed from ledger (not cached guesses); mortality never yields negative counts (trigger-verified); FCR correct within test tolerance |
| **Inventory** | Balance never negative (DB-enforced); every movement auditable with reference doc; unit conversions exact |
| **Procurement** | Full workflow state machine enforced; partial receipts handled; invoice ↔ PO ↔ receipt 3-way match |
| **Finance/Accounting** | Double-entry enforced; posted entries immutable; reversals balance; trial balance = 0; multi-currency retains original + rate |
| **Profitability** | Per hectare / per kg metrics match hand-calculated fixture to the cent; allocations cannot exceed source cost |
| **Labor/Equipment/Irrigation/Soil** | Costs flow into profitability targets; soil data only from real records (no fabrication) |
| **Weather** | Adapter contract honored; provider switch possible without UI change; alerts evidence-labeled; no data when provider pending |
| **AI assistant** | Answers cite retrievable evidence; refuses/flags insufficient evidence; all queries+responses stored; safety filter tests for diagnosis/dosage/application-rate questions |
| **Reports** | PDF/CSV/XLSX open correctly; totals match UI; parameterized (date range, farm); rate-limited |
| **Tasks** | Completion updates downstream records transactionally; overdue notifications fire |
| **Offline** | Queue survives app kill/relaunch; sync statuses visible; conflicts resolved per policy; zero data loss test in airplane mode |
| **Billing** | Usage metered accurately; limits enforced server-side; trial→paid transitions correct |
| **Admin** | Platform admin actions 100% audited; tenant financials read-only |

## 3. Acceptance Test Mapping (brief §71)

The Phase 13 gate replays the full §71 acceptance script as Playwright +
pgTAP suites:

| §71 item | Automated by |
|---|---|
| Account→org→farm→boundary→plots→crops→inputs→labor→harvest→sale→profit | Playwright journey J1 (`10-user-journeys.md` §1) |
| Broiler batch economics | Playwright journey J2 + unit fixtures |
| Weather, 2D, 3D | E2E + visual snapshot |
| AI question + sources | AI integration test with citation assertions |
| Offline record + reconnect sync | Playwright offline context test |
| Farm isolation & org isolation | pgTAP suite `rls/isolation.sql` (always runs in CI) |
