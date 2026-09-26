# 01 — System Architecture

## 1. Product Definition

GOSHEN OS is a **multi-tenant Agricultural Operating System**: one application,
one database, one deployment, serving many independent organizations. Each
organization (a farm business, cooperative, or agricultural company) owns one or
more farms. All tenant data is isolated by PostgreSQL Row Level Security (RLS),
never by application convention and never by frontend checks alone.

Tenancy hierarchy:

```
Platform
└── Organization            (tenant root — owns all data below)
    ├── Members (users + org-level roles)
    ├── Subscription / plan / usage
    └── Farms (1..n)
        ├── Farm members (farm-scoped roles)
        ├── Boundary (PostGIS polygon, versioned)
        ├── Plots → Blocks → Subplots
        ├── Crop seasons / activities / harvests
        ├── Livestock groups / batches / events / health
        ├── Inventory locations / movements
        ├── Finance: accounts, journals, cost allocations
        ├── Weather, observations, documents, tasks
        └── Analytics & reports
```

A user may belong to multiple organizations (e.g., a consultant managing two
clients). An organization may manage multiple farms. Nothing in the code
references a specific farm name.

## 2. High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENTS                                                              │
│  Desktop Browser (Next.js app)      Mobile / Field (PWA, offline)    │
│  - MapLibre 2D GIS                  - GPS boundary walk recorder     │
│  - 3D scene (extrusion → Cesium)    - Quick activity/task entry      │
│  - Dashboards (ECharts)             - IndexedDB outbox + cache       │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTPS (Next.js Server Components/Actions/Route Handlers)
┌───────────────▼──────────────────────────────────────────────────────┐
│ APPLICATION TIER (Vercel) — Next.js                                  │
│  app/ (UI)  →  features/ (module UX)  →  services/ (business logic)  │
│  - Server Components fetch via service layer                         │
│  - Route Handlers = BFF for AI, exports, webhooks, admin             │
│  - Adapters: WeatherProvider, SatelliteProvider, MarketDataProvider, │
│    AIProvider, StorageProvider (never coupled to one vendor)         │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │                               │
┌───────────────▼───────────────┐   ┌───────────▼──────────────────────┐
│ NEON / POSTGRES               │   │ EXTERNAL SERVICES (via adapters) │
│  Better Auth identity schema  │   │  Weather API (adapter, pending)  │
│  Postgres + PostGIS           │   │  Satellite/NDVI API (pending)    │
│  RLS tenant policies          │   │  Market data API (pending)       │
│  App role + transaction UID   │   │  LLM provider (server key only)  │
│  Storage/realtime: future     │   │  Map tiles / terrain provider    │
└───────────────────────────────┘   └──────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│ OPTIONAL PYTHON ANALYTICS SERVICE (Phase 7+, containerized)          │
│  Statistics, yield models, geospatial processing (rasterio etc.)     │
│  Called only by the Next.js service layer, never by the browser.     │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. Architectural Layers & Rules

1. **UI layer** (`app/`, `features/`): rendering, forms, maps. Contains **no**
   business rules and no direct SQL. Calls service functions or API routes only.
2. **Service layer** (`services/`): `farmService`, `plotService`, `cropService`,
   `livestockService`, `inventoryService`, `financeService`, `laborService`,
   `weatherService`, `aiService`, `reportService`, `taskService`, etc.
   All authorization-relevant logic, validation, and orchestration lives here.
   Services are plain TypeScript modules usable from Server Components, Route
   Handlers, and scheduled/server jobs.
3. **Data layer**: server-only `postgres.js` clients. Auth uses the owner
   connection; tenant data uses `DATABASE_URL_APP` with a non-owner role and
   `withUser()` transaction context (`app.user_id`). `public.app_uid()` and
   RLS policies enforce tenant access. Never expose database credentials to
   the browser.
4. **Integration layer** (`services/adapters/`): every external vendor sits
   behind an interface. If no provider is connected, the adapter is marked
   `PENDING` and returns a typed "unavailable" result — **never fabricated
   data**.
5. **Domain invariants in the database**: financial immutability, inventory
   movement append-only rules, balance derivation, and audit triggers are
   enforced by Postgres triggers/constraints, not only in TypeScript.

## 4. Key Architectural Decisions (ADR summary)

| ID | Decision | Rationale |
|----|----------|-----------|
| ADR-01 | Single shared Postgres DB, tenant isolation by `organization_id` + RLS | Simplest isolation model that scales to thousands of tenants; avoids per-tenant DB operational burden |
| ADR-02 | RLS policies derive from membership helper functions (`SECURITY DEFINER`, `STABLE`), not from joins in every policy | Consistent, testable, fast policy evaluation |
| ADR-03 | Financial ledger is append-only; corrections are reversal entries | Auditability; "never silently delete financial transactions" |
| ADR-04 | Inventory is an event-sourced movement ledger; balances are derived (view + cached column) | Auditable stock; supports conversions, losses, transfers |
| ADR-05 | Geometry stored as `geometry(GeometryCollection/…,4326)` with GiST indexes; areas computed with `ST_Area(geography)` | Correct acreage on the ellipsoid; spatial query performance |
| ADR-06 | MapLibre operational maps use MapTiler Hybrid + Terrain RGB in 3D mode when configured; full CesiumJS globe remains behind an adapter in Phase 8 | Reliability first; 3D is visualization only |
| ADR-07 | External data (weather, satellite, market, LLM) only through provider adapters with explicit `PENDING` state | No fake data, no vendor lock-in |
| ADR-08 | AI answers farm questions by calling whitelisted analytics functions (structured retrieval), not free-text SQL | Security, correctness, evidence trail |
| ADR-09 | Offline via IndexedDB outbox with idempotency keys and append-only-first design | Field data must never be lost; append-only records rarely conflict |
| ADR-10 | i18n via translation keys (en / sw) from day one; DB stores user content verbatim | Tanzania-first, internationally extensible |
| ADR-11 | Money: `numeric(18,4)`, ISO currency code + optional `fx_rate` retained on every transaction | Multi-currency without precision loss |
| ADR-12 | Roles: two scopes — organization role and per-farm role — stored in membership tables | A manager of Farm A need not see Farm B; accountants scoped per org |

## 5. Core Data Flow (the product principle)

Operational → financial linkage, enforced by schema:

```
Purchase fertilizer ──► supplier_invoice + payment ──► journal entry
        │                                        └──► inventory_movement (in)
        ▼
Application to Plot A01 ──► crop_activity + crop_input
        │                             └──► inventory_movement (out)
        ▼                       └──► cost_allocation (amount → plot/crop_season)
Harvest ──► harvests (+ optional storage_records)
Sale    ──► sales/sale_items ──► inventory_movement (out, if stock item)
        │                             └──► revenue + journal entry
        ▼
Profitability views: cost_allocations + labor_records + revenues
        → per farm / plot / crop season / livestock batch / activity
```

The same chain applies to livestock: chicks purchased → batch → feed/medicine
consumption (inventory out) → mortality/sales events → revenue → batch P&L.

## 6. Multi-Tenancy Enforcement Summary

- Every tenant table carries `organization_id NOT NULL` (and `farm_id` where
  farm-scoped). See `05-security-model.md` for the full policy set.
- Postgres RLS is **forced** (tables are not readable via `security definer`
  bypass except through explicit audited helpers).
- Platform super admins use audited server routes; owner credentials are
  reserved for auth, migrations, and explicitly trusted platform jobs, never
  ordinary tenant requests.
- A synthetic tenant-isolation test suite (pgTAP) must pass in CI for every
  migration (see `18-testing-strategy.md`).

## 7. Scalability & Performance Strategy

- **Indexes**: B-tree on every FK and filter column; composite indexes for hot
  queries (`(organization_id, created_at)`); **GiST** on all geometry columns;
  GIN on jsonb/fts where searched.
- **Pagination everywhere**: server-side keyset pagination for lists (activities,
  movements, journal lines, events). Virtualized tables (TanStack Virtual) for
  large client grids.
- **Aggregates in Postgres**: profitability, inventory balances, batch economics
  are SQL views / materialized views refreshed on schedule, never computed in
  the browser over full datasets.
- **Caching**: TanStack Query client cache; Next.js Server Component caching for
  read-heavy reference data (crop catalog, chart of accounts template).
- **Map performance**: vector tiles (pg_tileserv or ST_AsMVT RPC) for plots/
  features beyond ~2,000 geometries per farm; cluster GPS traces.
- **Targets**: p95 API < 400 ms for dashboard aggregates on a 5,000-plot farm;
  map first paint < 2 s on 3G-class connections.

## 8. Module Map (35 modules → feature folders)

Authentication · Organization management · Farm management · GIS/mapping ·
3D visualization · Plots · Crops · Livestock · Inventory · Procurement ·
Finance · Accounting · Labor · Equipment · Irrigation · Soil · Weather ·
Observations · Production/Harvest · Storage · Sales · Customers · Suppliers ·
Market data · Analytics · Reports · AI assistant · Notifications · Tasks ·
Documents · Audit log · Offline sync · User management · Subscription/billing ·
System administration. Each maps to `features/<module>` with its own service in
`services/<module>Service.ts` (see `08-folder-structure.md`).

## 9. Non-Goals for v1 (explicit)

- No offline *creation* of complex financial documents (field offline scope:
  GPS, tasks, activities, observations, inventory consumption — see `12`).
- No automated agronomic prescriptions (weather/AI produce *evidence-backed
  insights*, not certain predictions).
- No hardcoded pricing; subscription architecture is schema + limits only.

## Open Questions (for review)

RESOLVED (2026-09-25):

1. Tenancy: single shared PostgreSQL database with Row Level Security confirmed (ADR-01).
2. 3D: high-quality CesiumJS scene in Phase 8 (Cesium ion terrain + satellite imagery), with MapLibre fill-extrusion fallback; satellite basemap is primary for 2D.
3. Python analytics service: called synchronously (REST) when required in Phase 7+.
