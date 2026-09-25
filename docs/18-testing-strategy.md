# 18 — Testing Strategy

## 1. Test Pyramid

| Layer | Tooling | Scope | CI |
|---|---|---|---|
| Unit | Vitest | `lib/domain/` pure functions: area math, profitability, FCR, mortality, moving-average cost, unit conversion, money/fx | every PR (fast) |
| Property | fast-check | Invariants: allocation sums ≤ source; conversions invert; ledger replay == cached balances; journal always balances | every PR |
| Database/RLS | pgTAP against local Supabase | Every migration: tenant isolation, role floors, immutability triggers, negative-stock rejection, batch-count triggers | every PR (blocking) |
| Integration | Vitest + local Supabase | Service flows: procurement chain, activity→movement→allocation, sync batch apply, reversal flow | every PR |
| E2E | Playwright | User journeys (docs/10), mobile viewport, offline mode, export downloads | PRs touching app/services; nightly full |
| Load | k6 (Phase 13) | 5,000-plot farm aggregates, map tiles, sync bursts | pre-release |

## 2. Critical Calculation Fixtures (must be exact)

1. **Area**: GeoJSON fixture polygons (incl. multiparts, near-poles-free TZ
   plots) — client/Turf preview vs. `ST_Area(geography)` tolerance ≤ 0.5%;
   displayed acres/ha/m² mutually consistent.
2. **Inventory**: scripted movement sequence → expected balances & moving
   average to 4 dp; negative-stock attempt rejected.
3. **Profit**: season fixture (inputs + labor + allocations + sales) → margin
   to the cent; per-hectare metrics vs hand-computed values.
4. **Livestock**: 500 birds → deaths 12 → sold 480 → expected counts, mortality
   rate, FCR from weighing fixtures, cost/bird & profit/bird.
5. **Financial**: balanced journals only; reversal nets to zero; trial balance
   = 0; fx conversion retained (original + rate + base).
6. **Cost allocation**: partial allocations sum ≤ source; unallocated remainder
   visible, never silently dropped.

## 3. RLS Security Suite (`tests/rls/`, pgTAP — always green gate)

For **every tenant table**:
- Org A user sees 0 rows of Org B (and vice versa).
- Org A user cannot INSERT/UPDATE rows claiming Org B's id (WITH CHECK fails).
- Role floors: `worker` denied financial writes; `viewer` denied all writes;
  farm-scoped member of Farm 1 denied Farm 2 data.
- Ledger immutability: UPDATE/DELETE on posted journals, movements, events
  raises.
- Service-role bypass limited to platform admin paths (documented exceptions).

## 4. E2E Journeys (Playwright)

- J1 Full first-customer journey (docs/10 §1) incl. boundary capture
  (mocked geolocation), plots, inputs, labor, harvest, sale, profit.
- J2 Broiler batch economics end-to-end.
- J3 Offline: airplane-mode activity recording → reconnect → sync verified.
- J4 Tenant isolation UI: org switcher shows no cross-org data; direct URL
  access to foreign ids → 403/not-found.
- J5 AI assistant: question → answer cites sources; refusal on insufficient
  evidence.
- Mobile profiles (iPhone SE / 360×640) on field modules; a11y smoke
  (axe-core) on core pages.

## 5. Data & Fixtures

- Seed: two orgs ("Tesha Family Agriculture" with Bagamoyo Farm as one record;
  "John Agricultural Enterprises") + fixture seasons/batches/movements for
  deterministic assertions. Bagamoyo exists **only as seed data**.
- Every bug fix ships with a regression test first (red → green).

## 6. Quality Gates

- PRs: unit + property + pgTAP + affected integration/E2E green; coverage
  floor: 90% on `lib/domain/`, 80% on services (ratchet, never decrease).
- Pre-release: full suite + load test + backup-restore drill green.
