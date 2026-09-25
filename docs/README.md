# GOSHEN OS — Agricultural Operating System

A multi-tenant SaaS platform for managing agricultural businesses: GIS, crops,
livestock, inventory, finance, accounting, weather, analytics, AI intelligence,
and offline field operations — one platform, thousands of farms.

**Bagamoyo Farm is the first tenant's first farm — never a hardcoded feature.**

## Documentation Index (Architecture Review Package)

| # | Artifact | Document |
|---|----------|----------|
| 1 | System architecture | [01-system-architecture.md](./01-system-architecture.md) |
| 2 | Database ERD | [02-database-erd.md](./02-database-erd.md) |
| 3 | Database schema (PostgreSQL/PostGIS DDL) | [03-database-schema.md](./03-database-schema.md) |
| 4 | Data dictionary | [04-data-dictionary.md](./04-data-dictionary.md) |
| 5 | Multi-tenant security model | [05-security-model.md](./05-security-model.md) |
| 6 | Role & permission matrix | [06-role-permission-matrix.md](./06-role-permission-matrix.md) |
| 7 | API architecture | [07-api-architecture.md](./07-api-architecture.md) |
| 8 | Folder structure | [08-folder-structure.md](./08-folder-structure.md) |
| 9 | Wireframe specification | [09-wireframes.md](./09-wireframes.md) |
| 10 | User journeys | [10-user-journeys.md](./10-user-journeys.md) |
| 11–13 | GIS / GPS boundary capture / 3D architecture | [11-gis-gps-3d-architecture.md](./11-gis-gps-3d-architecture.md) |
| 14 | Offline synchronization architecture | [12-offline-sync-architecture.md](./12-offline-sync-architecture.md) |
| 15–16 | Finance & inventory architecture | [13-finance-inventory-architecture.md](./13-finance-inventory-architecture.md) |
| 17–18 | Crop & livestock architecture | [14-crop-livestock-architecture.md](./14-crop-livestock-architecture.md) |
| 19 | Weather integration architecture | [15-weather-architecture.md](./15-weather-architecture.md) |
| 20 | AI / RAG architecture | [16-ai-rag-architecture.md](./16-ai-rag-architecture.md) |
| 21 | Reporting architecture | [17-reporting-architecture.md](./17-reporting-architecture.md) |
| 22 | Testing strategy | [18-testing-strategy.md](./18-testing-strategy.md) |
| 23 | Deployment architecture | [19-deployment-architecture.md](./19-deployment-architecture.md) |
| 24 | Disaster recovery plan | [20-disaster-recovery.md](./20-disaster-recovery.md) |
| 25 | Development roadmap | [21-roadmap.md](./21-roadmap.md) |
| 26 | Definition of done | [22-definition-of-done.md](./22-definition-of-done.md) |

## Technology Stack (locked)

- **Frontend:** Next.js (App Router) + React + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui + Radix UI primitives
- **Forms:** React Hook Form + Zod (Zod schemas shared client/server)
- **Maps:** MapLibre GL JS + Turf.js — **satellite basemap primary**, streets toggle; 2D is the source-of-truth UX, PostGIS is the spatial source of truth
- **3D:** **High-quality CesiumJS scene** (Cesium ion terrain + satellite imagery) in Phase 8 behind a `Scene3DProvider` adapter; MapLibre fill-extrusion fallback when tokens are absent
- **Database:** PostgreSQL 15+ with PostGIS 3.4 and pgvector
- **Backend:** Supabase (Auth, Postgres + RLS, Storage, Realtime, Edge Functions)
- **Charts:** Apache ECharts
- **Offline:** PWA + Workbox service worker + IndexedDB (Dexie) outbox queue
- **State:** Server state via TanStack Query keyed per module; minimal global client state (auth/session, online status, sync queue). No global store for server data.
- **Analytics (Python, Phase 7+):** FastAPI service for statistics/geospatial processing, called **synchronously (REST)** by the Next.js service layer
- **CI/CD:** GitHub Actions → Vercel (web) + Supabase migrations
- **Testing:** Vitest + Testing Library, Playwright, pgTAP (RLS), property-based tests for calculations

## Locked Decisions (2026-09-25)

1. **Tenancy:** single shared PostgreSQL database with Row Level Security.
2. **Auth:** email-only at launch; phone OTP deferred (schema reserved).
3. **Maps & 3D:** MapLibre with satellite basemap primary; high-quality CesiumJS
   (terrain + satellite imagery) for 3D. The owner's reference repo
   `stratonflorentin-dot/Calvary-connect` (user-owned) may be consulted and its
   map/3D integration patterns adapted.
4. **Mutations:** Server Actions for form flows; Route Handlers for
   device/integration-facing endpoints.
5. **Python analytics:** synchronous REST calls on demand; job queue optional later.

## Review Instructions

All five open architecture questions were resolved on 2026-09-25 (see each
document's "Open Questions → RESOLVED" section). The package is approved for
implementation: Phase 1 per [21-roadmap.md](./21-roadmap.md) may begin.
