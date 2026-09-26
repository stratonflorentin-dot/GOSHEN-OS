# 08 — Folder Structure

This is the target modular layout, not a literal inventory of files currently
present. Current implementation uses `lib/db/`, `lib/auth/`,
`db/migrations/`, `services/`, `features/`, and App Router pages. Modules and
test folders marked below are planned until corresponding code and checks exist.

Next.js App Router monorepo layout. Modules are isolated: each `features/<m>`
owns its components/hooks; shared logic lives in `services/` and `lib/`.

```
goshen-os/
├── app/                                # Next.js App Router (routing only — thin)
│   ├── (auth)/                         # login, register, invite acceptance
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (onboarding)/                   # org setup → farm creation wizard
│   │   └── onboarding/page.tsx
│   ├── (app)/                          # authenticated shell (sidebar nav, org switcher)
│   │   ├── dashboard/page.tsx
│   │   ├── farms/                      # list, [farmId]/ (overview, map, 3d, settings, team)
│   │   ├── map/                        # farm map workspace
│   │   ├── crops/                      # seasons list, planning, [seasonId] detail
│   │   ├── livestock/                  # groups, batches/[batchId], health, feed
│   │   ├── inventory/                  # items, movements, stores
│   │   ├── procurement/                # requests, orders, receipts, invoices
│   │   ├── finance/                    # accounts, expenses, revenues, payments, loans
│   │   ├── accounting/                 # chart, journals, trial balance
│   │   ├── profitability/
│   │   ├── production/                 # harvests, storage
│   │   ├── sales/
│   │   ├── labor/
│   │   ├── equipment/
│   │   ├── irrigation/
│   │   ├── soil/
│   │   ├── weather/
│   │   ├── analytics/
│   │   ├── reports/
│   │   ├── assistant/                  # AI assistant chat
│   │   ├── tasks/                      # incl. /field (mobile task view)
│   │   ├── documents/
│   │   ├── team/
│   │   ├── settings/                   # org, profile, notifications, subscription
│   │   └── admin/                      # platform super-admin area (separate guard)
│   ├── api/                            # Route Handlers (see 07-api-architecture.md §3)
│   │   └── v1/{ai,sync,documents,reports,weather,market,webhooks}/…
│   ├── layout.tsx
│   └── globals.css
├── features/                           # module UI (components, hooks, local state)
│   ├── auth/  onboarding/  dashboard/
│   ├── farms/  map/  maps3d/
│   ├── boundary-capture/               # GPS walk workflow (dedicated feature)
│   ├── plots/  crops/  livestock/
│   ├── inventory/  procurement/  finance/  accounting/
│   ├── labor/  equipment/  irrigation/  soil/  weather/
│   ├── production/  sales/  market/
│   ├── analytics/  reports/  assistant/
│   ├── tasks/  documents/  notifications/
│   ├── team/  settings/  billing/  admin/
│   └── sync-indicator/                 # offline/sync status UI
├── services/                           # business logic (see 07 §4)
│   ├── farmService.ts  plotService.ts  cropService.ts  livestockService.ts
│   ├── inventoryService.ts  procurementService.ts  financeService.ts
│   ├── accountingService.ts  laborService.ts  equipmentService.ts
│   ├── weatherService.ts  aiService.ts  reportService.ts  taskService.ts
│   ├── syncService.ts  billingService.ts  auditService.ts  documentService.ts
│   └── adapters/
│       ├── weather/          # interface.ts, openweather.ts, PENDING_PROVIDER.ts
│       ├── satellite/        # interface.ts, pending.ts
│       ├── market/           # interface.ts, manual.ts, pending.ts
│       ├── ai/               # interface.ts, provider.ts
│       └── storage/          # provider adapter (planned)
├── lib/
│   ├── db/                   # index.ts (postgres.js owner/app-role clients)
│   ├── auth/                 # Better Auth server/client/session helpers
│   ├── domain/               # PURE calculation functions (unit + property tested)
│   │   ├── geo.ts            # area, perimeter, polygon validation
│   │   ├── profitability.ts  # margins, per-hectare metrics
│   │   ├── livestock.ts      # FCR, mortality rate, batch economics
│   │   ├── inventory.ts      # moving average, unit conversion
│   │   └── money.ts          # currency/fx math
│   ├── validation/           # shared Zod schemas (forms + API)
│   ├── i18n/                 # en.json, sw.json, t() helper — translation keys only
│   ├── errors.ts  constants.ts  permissions.ts (mirrors docs/06 matrix)
│   └── hooks/                # useOnlineStatus, useOrg, useFarm, useSyncQueue
├── components/               # design-system primitives (shadcn/ui + custom)
│   ├── ui/                   # button, card, table, dialog, badge, …
│   ├── charts/               # ECharts wrappers
│   ├── maps/                 # MapLibre container, layer controls, popups
│   └── layout/               # shell, sidebar, topbar, mobile nav
├── types/                    # generated DB types + domain types
├── db/
│   └── migrations/           # deployed numbered SQL migrations
├── scripts/
│   └── migrate.ts            # migration runner and app-role provisioning
├── analytics-py/             # optional Python service (Phase 7+)
├── tests/
│   ├── unit/                 # Vitest — lib/domain focus
│   ├── integration/          # services against disposable PostgreSQL
│   ├── rls/                  # pgTAP tenant-isolation suites
│   ├── e2e/                  # Playwright journeys (docs/10)
│   └── property/             # fast-check property tests
├── docs/                     # this architecture package
├── .github/workflows/        # ci.yml, deploy.yml (see 19)
└── package.json / tsconfig / tailwind.config / next.config
```

## Rules

1. **`app/` is routing only.** Pages compose `features/` components; pages never
   contain business logic.
2. **`features/<m>/` may import** from `services/`, `lib/`, `components/`, and
   its own folder. It must **not** import from another feature (extract shared
   pieces to `components/` or a service).
3. **Database clients in `lib/db/` are server-only.** The owner connection is
   reserved for auth, migrations, and trusted jobs; tenant requests use the
   non-owner app role and `withUser()` so RLS applies.
4. **`lib/domain/` has zero I/O** — pure functions only. This is where
   testable calculations live (areas, profitability, FCR).
5. **No `Tanzania`/`Bagamoyo` literals anywhere in code** — locale data lives in
   i18n files and seed data.
6. **i18n**: user-facing strings are translation keys (`t('tasks.dueDate')`);
   seed with `en` + `sw` from Phase 1.
