# 07 — API Architecture

## 1. Separation of Concerns

```
UI (app/ + features/)
   │  calls only
   ▼
Service layer (services/*Service.ts)   ← business logic, validation, orchestration
   │  uses only
   ├── Data access (lib/supabase/*)    ← typed clients; complex queries in Postgres views/RPC
   ├── Adapters (services/adapters/*)  ← weather, satellite, market, AI, storage
   └── Shared domain (lib/domain/*)    ← pure calculation functions (profit, FCR, areas)
```

Rules:
- React components never import Supabase clients directly; never contain SQL,
  business rules, or role logic.
- Services are isomorphic (run on server; the browser calls them through Route
  Handlers or Server Actions).
- All external HTTP I/O lives in adapters, never in services or components.

## 2. Transport Patterns

| Pattern | Used for | Auth |
|---|---|---|
| **Server Components** (default) | Reads: dashboards, lists, detail pages | Server Supabase client (cookie session) |
| **Server Actions** | Writes from forms: create plot, record activity, log expense | Same + `requireRole` inside service |
| **Route Handlers** (`app/api/…`) | AI endpoints, file uploads (signed URLs), exports (PDF/CSV/XLSX), webhooks, platform admin, device sync | JWT + `requireAuth`/`requireRole`/`requirePlatformAdmin` |
| **Supabase client direct** | Realtime subscriptions (notifications), Storage signed URL fetch | anon key + RLS |
| **Postgres RPCs** | Aggregate reads (profitability, batch economics), geometry ops (MVT tiles) | RLS-enforced functions |

## 3. Route Handler Conventions

- Path scheme: `/api/v1/<module>/…` — e.g. `/api/v1/ai/ask`,
  `/api/v1/sync/batch`, `/api/v1/documents/upload-url`,
  `/api/v1/reports/export`, `/api/platform/*` (admin only).
- **Validation**: every handler parses input with the module's Zod schema
  (shared with forms from `lib/validation/`). 422 on failure.
- **Auth**: `requireAuth()` → session; `requireRole(orgId, roles…)` for
  org-scoped writes; `requirePlatformAdmin()` for `/api/platform/*`.
- **Error envelope** (uniform):
  ```json
  { "error": { "code": "INSUFFICIENT_STOCK", "message": "…", "details": {} } }
  ```
  Codes are stable string constants in `lib/errors.ts`; never leak stack traces
  or SQL.
- **Rate limiting**: per-user token buckets on `/api/v1/ai/*`,
  `/api/v1/sync/*`, `/api/v1/reports/export` (Upstash Redis; limits in env).
- **Idempotency**: mutating sync endpoints require the client-generated
  `Idempotency-Key` (the outbox operation id) — replays return the original
  result (see `12-offline-sync-architecture.md`).

## 4. Service Module Map

| Service | Responsibilities (v1) |
|---|---|
| `authService` | session helpers, org resolution, invitations |
| `orgService` | org CRUD, members, roles, subscription checks |
| `farmService` | farms CRUD, boundary versions, settings, member scoping |
| `gisService` | plots geometry, map features, boundary validation & area calc, MVT tiles |
| `plotService` | plots, plot history, soil records |
| `cropService` | crop catalog, varieties, seasons, activities, inputs, harvests |
| `livestockService` | species/groups/batches, events, health, feed, sales, batch economics |
| `inventoryService` | items, locations, movements (single entry point — all stock changes) |
| `procurementService` | suppliers, requests → PO → receipt → invoice → payment workflow |
| `financeService` | financial accounts, expenses, revenues, payments, loans, owner transactions |
| `accountingService` | chart of accounts, journal entries + postings, reversals, trial balance |
| `allocationService` | cost allocation rules + validation |
| `laborService`, `equipmentService`, `irrigationService`, `storageService` | respective modules |
| `salesService`, `customerService`, `marketService` | sales docs, customers, market prices |
| `taskService` | tasks, completion → downstream record creation |
| `weatherService` | provider-agnostic forecast/observations/alerts + insight rules |
| `aiService` | question routing, farm-data retrieval, RAG, citations, safety filters |
| `reportService` | report definitions, rendering (PDF/CSV/XLSX), export jobs |
| `notificationService` | rules engine → notifications + preferences |
| `documentService` | signed upload/download URLs, metadata |
| `auditService` | explicit audit writes for business actions |
| `syncService` | outbox apply, idempotency, conflict resolution |
| `billingService` | plans, subscriptions, usage recording & limit checks |

## 5. Business Logic Placement

- **Pure functions** (`lib/domain/`): unit-tested math — polygon area &
  validation, profitability, FCR, mortality rate, moving-average cost,
  unit conversion. No I/O. Property-based tested (see `18`).
- **Database triggers**: invariants that must hold under any write path
  (stock non-negative, balanced journals, batch counts, immutability).
- **Services**: orchestration + authorization + transactional multi-step
  flows (e.g., "receive goods" = goods_receipt + movements + PO status).
- **Postgres views/RPCs**: aggregate reporting queries and heavy geospatial
  work.

## 6. External Adapter Contracts (TypeScript interfaces)

```ts
interface WeatherProvider {
  readonly name: string; readonly status: 'active' | 'pending';
  getForecast(farm: FarmLocationRef, days: number): Promise<ForecastDay[]>;
  getObservations(farm: FarmLocationRef, range: DateRange): Promise<WeatherObservation[]>;
  getAlerts?(farm: FarmLocationRef): Promise<WeatherAlert[]>;
}

interface SatelliteProvider {          // Phase 7+, pending by default
  readonly name: string; readonly status: 'active' | 'pending';
  getScenes(farmId: string, range: DateRange): Promise<SatelliteScene[]>;
  getNdviStats(sceneRef: string, plot: PlotGeometryRef): Promise<NdviStats | null>;
}

interface MarketDataProvider {         // pending by default; manual entry always allowed
  readonly name: string; readonly status: 'active' | 'pending';
  getPrices(product: string, market: string, range: DateRange): Promise<MarketPrice[]>;
}

interface AIProvider {
  readonly name: string;
  complete(req: ChatRequest): Promise<ChatResponse>;   // server-side only
  embed(texts: string[]): Promise<number[][]>;
}
```

Contract rules:
- A provider with `status: 'pending'` returns a typed
  `ProviderUnavailableError`; the UI renders a "not connected yet" state —
  **no mock data is ever returned as real**.
- Adapters are the only place vendor SDKs/API keys are imported; keys come from
  server env only.

## 7. Uploads & Downloads Flow

1. Client requests `POST /api/v1/documents/upload-url` (Zod-validated metadata).
2. Server checks role + quota, creates `documents` row (or pending row), returns
   signed upload URL scoped to `org/{orgId}/…`.
3. Client uploads directly to Supabase Storage.
4. On completion the pending row is finalized; virus/size checks per bucket
   policy. Downloads always via short-TTL signed URLs.

## 8. Versioning & Evolution

- `/api/v1/` prefix; breaking changes → `/api/v2/`, v1 sunset window.
- Postgres schema evolves via numbered Supabase migrations only (never console
  edits in production).
- Feature flags via `provider_sync_state`/env for gradual rollouts.

## Open Questions

RESOLVED (2026-09-25):

1. Mutations: Server Actions for form flows; Route Handlers for device/integration-facing endpoints (as recommended).
2. Python analytics service: called synchronously (REST) on demand; a job queue may be added later for batch workloads.
