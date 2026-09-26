# GOSHEN OS Repository and Live Audit

**Audit date:** 2026-09-26
**Repository:** `stratonflorentin-dot/GOSHEN-OS`
**Live URL:** https://goshen-os-five.vercel.app/

## Scope and evidence

This is a repository review plus read-only inspection of the live home and registration pages. The production home describes a device-local workspace; before the fix, `/register` displayed “Could not create your account.” After pushing the fix, the live registration HTML reflects the updated form (including the 72-character password limit). No real account was submitted, so database-backed signup/session creation still needs an end-to-end check with a disposable test account. The local project typecheck and production Webpack build were run. The build command using default Turbopack is blocked by an invalid local Windows native binding. Vitest and seven focused unit tests pass. No automated desktop/tablet/mobile browser matrix or tenant-isolation end-to-end suite exists, so those behaviors are not certified by this audit.

## What exists

- Next.js App Router application with React, TypeScript, Tailwind, and a small shared UI component set.
- Anonymous local-first workspace at `/`, with records stored in browser `localStorage` and a downloadable backup.
- Separate database-backed app routes for dashboard, farms, onboarding, plots, crops, livestock, inventory, finance, analytics, weather, maps, and a 3D map view.
- Better Auth email/password routes and API handler, PostgreSQL accessed through `postgres.js`, and PostGIS migrations.
- Organization, membership, farm, profile, invitation, role, and permission tables; organization/farm ownership columns and RLS policies across domain migrations.
- IndexedDB, a GPS recorder, background sync code, a service worker, and a PWA manifest.
- Provider interfaces for weather and 3D/map rendering. Mock weather is the configured fallback when `WEATHER_PROVIDER` is absent.

## Feature disposition

| Area | Decision | Evidence / next action |
| --- | --- | --- |
| Existing local workspace and backup | Keep | Useful no-account entry point; explain clearly that it is device-only and is not synced to a farm account. |
| Better Auth with PostgreSQL | Refactor | The raw `postgres.js` tagged client was passed directly as a Better Auth database. The sign-up failure and database errors are consistent with that unsupported adapter shape. A Kysely Postgres.js dialect and explicit schema/field mappings are now in the working tree. |
| Authentication schema | Refactor | The handwritten auth migration used snake_case columns, while Better Auth defaults to different field names; `email_verified` was also a timestamp instead of a boolean. Signup alignment migration and explicit mappings are now in the working tree. Production application of that migration remains unverified. |
| Organization and farm schema/RLS | Keep, then verify | PostgreSQL migrations define the tenant model and many RLS policies. Run the existing RLS verification against a disposable/test database and review every sensitive table and policy before commercial use. |
| MapLibre and Leaflet | Refactor later | Both stacks are dependencies; MapLibre is used for the 3D scene while Leaflet/React Leaflet remains. Choose one primary stack after comparing feature coverage and map pages. |
| 3D/Cesium | Keep fallback; document status | The MapLibre extrusion path exists. Cesium token-dependent support is disabled/falls back; do not present it as an active Cesium integration. |
| Weather | Keep provider interface; fix presentation | Mock provider returns generated values and is selected by default. Make mock status unmistakable in UI and production configuration; do not present mock forecasts as observations. |
| Offline and PWA | Refactor | IndexedDB/service worker/sync code exists, but sync requests target GPS and other API endpoints that were not found in the current app routes. Test queue replay, tenant/session scoping, cache invalidation, and service-worker update behavior. |
| Test infrastructure | Refactor | Vitest and seven focused auth-validation/GIS calculation tests now pass; meaningful database/RLS/workflow coverage is still needed. |

## Functional, partial, mocked, missing, and broken

### Functional by source inspection

- The root workspace renders without login and stores records locally.
- Auth pages call Better Auth email/password APIs; the auth catch-all route forwards GET/POST requests.
- Database-backed route handlers/pages call server-side session helpers, and app pages are gated by a session-cookie check in `proxy.ts`.
- The migration set creates PostGIS geography/geometry-backed farm and plot structures and declares tenant RLS policies.
- Phone geolocation collection and offline storage primitives exist in library code.

### Broken or high-confidence defects

- **Signup failed in production at audit time:** `/register` displayed a generic creation failure. In source, Better Auth received the raw `postgres.js` SQL-tag client rather than its Kysely dialect. The auth table names/types also did not match the existing schema. Migration 0008 has now been applied via schema-only migration mode to the Neon database configured in `.env.production`, and its auth columns/ledger were verified. The updated app code still needs to be deployed before the live registration route uses the fix.
- **Signup success UX was wrong:** email verification is disabled, but signup sent the user to a page instructing them to check email. It now routes to `/dashboard` and catches network exceptions in the working tree.
- **Signup surfaced backend messages:** detailed auth/database errors could be shown in the browser. The updated signup maps known input errors and returns a safe generic message for other failures.
- The initial `npm run test:unit` failed because Vitest was missing; Vitest and seven focused tests have now been added and pass. They do not replace database/RLS or end-to-end coverage.
- The service-worker sync client calls `/api/gps/traces` and other synchronization endpoints that are absent from the inspected App Router routes. These queue types cannot be assumed to sync.

### Partial / not verified end-to-end

- Signup/signin/session persistence, password reset, account recovery, and organization onboarding.
- RLS coverage for all tables and the required Organization A/B and assigned-farm isolation scenarios.
- Farm boundary capture validation, polygon editing/import, and persistence through PostGIS.
- Inventory movement/cost allocation, finance totals, harvest/sale accounting, and the product-wide crop/livestock chains.
- Responsive field workflows, offline replay, GIS behavior, map provider fallbacks, and PWA install/update behavior.

### Mocked or unavailable

- Weather uses a deterministic mock provider when no real provider is selected/configured.
- Cesium terrain is unavailable without tokens and has a MapLibre extrusion fallback.
- The root workspace is explicitly local-only; data is not shown to be connected to the PostgreSQL-backed account workspace.
- No evidence was found in this audit for live satellite imagery, market-price integration, or a production AI/RAG service. UI presence alone should not be taken as proof of any such integration.

## Security and data risks

- Local browser records are device-specific and are not a server backup. Users can lose data with browser storage clearing or device loss.
- The service worker caches selected authenticated analytics GET routes. Review Cache Storage isolation, sign-out clearing, tenant/account switching, and stale data risks before enabling multi-tenant offline use.
- `DATABASE_URL_APP` is mandatory in production by `lib/db`; development can fall back to the owner URL and logs that RLS is bypassed. Keep that fallback development-only.
- Auth writes use the owner database client. Restrict the auth schema/table grants and keep that credential server-only.
- Review error responses for every server action/API for leakage of SQL/provider details; signup has been sanitized in the current patch, but this is not a system-wide error audit.
- `.env.production` is untracked in this workspace and was deliberately left untouched; never add it to Git. Audit only environment variable names in source, not secret values.

## Architecture and database issues

- The app currently has two product paths: anonymous browser-local records and a PostgreSQL-backed multi-tenant product. They do not yet form a single account-to-farm lifecycle.
- Supabase is not the current database implementation. The code uses PostgreSQL/Neon-style URLs, `postgres.js`, Better Auth, and PostGIS. Avoid adding Supabase dependencies until an explicit migration decision and compatibility plan exist.
- The package includes both Neon Auth and self-managed Better Auth-related packages. Usage and ownership need a dependency cleanup audit; remove only after confirming no imports or provider dependency.
- Two migration files share the `0006` prefix; the runner now skips the archived `_original.sql` snapshot. Migration 0008 was applied to the `.env.production` Neon database without altering application-role credentials and recorded in its ledger.
- The migration runner also provisions/rotates the `goshen_app` password and writes `.env.local`; understand those side effects before running it against production.
- Existing migration comments reference earlier architecture/phase plans. Refresh comments and docs after the auth adapter/schema have been deployed and verified.

## UX and mobile findings

- The anonymous home page is clear about device-only storage and offers a backup, but it is not equivalent to cloud-backed farm management.
- A live registration page was reachable and showed a creation error. The revised page provides a safe error state and directs successful signups into the authenticated dashboard.
- Desktop/tablet/mobile workflows were not exhaustively exercised in this audit. A phone-oriented bottom-navigation and field workflow must be verified at narrow viewport sizes with real GPS permissions and offline transitions.

## Integrations and environment variables

Variables referenced by source: `DATABASE_URL`, `DATABASE_URL_APP`, `BETTER_AUTH_SECRET`, `NEXTAUTH_SECRET`, `BETTER_AUTH_URL`, `VERCEL_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `WEATHER_PROVIDER`, `OPENWEATHER_API_KEY`, `CESIUM_ION_TOKEN`, and `CESIUM_TERRAIN_TOKEN`. Migration scripts also reference `DATABASE_URL_UNPOOLED` and `GOSHEN_APP_DB_PASSWORD`.

Add descriptions and production/development requirements to `.env.example`; verify deployment values in the host dashboard without copying values into the repository. Mock weather must be visibly labeled if used.

## Tooling and verification results

- `npm run typecheck`: passed after signup/auth changes.
- `npx next build --webpack`: passed; route compilation and static generation completed.
- `npm run build` (default Turbopack): blocked on this Windows workspace because the installed Next SWC native binding is not a valid Win32 application; the Webpack build succeeded as a verification alternative.
- `npm run test:unit`: passed (2 files, 7 tests).
- `npm run lint`: no lint script is configured. ESLint config and rule coverage need a separate review.
- Live production `/` and `/register` opened read-only before and after push; new registration markup is visible. No signup submission, user DB write, or mobile/tablet viewport run was performed.

## Recommended order

1. Deploy and apply the signup adapter/schema fix; verify registration, sign-in, session, and duplicate-email behavior on a non-production test account.
2. Install test infrastructure and add auth, validation, geometry, calculations, and RLS isolation tests.
3. Reconcile local-first root data with authenticated organization/farm onboarding; choose explicit import/sync/backup semantics.
4. Audit every tenant table, policy, server action, API, and database role; run Organization A/B isolation checks on a disposable database.
5. Complete a single farm/plot/crop/activity/inventory/expense/harvest/sale vertical workflow, then livestock/feed/health/sale.
6. Fix or disable offline sync paths with no server endpoint; test tenant-scoped cache and sync conflict handling.
7. Verify mobile GPS boundary capture and tablet/desktop flows on actual viewport sizes and devices.
8. Add production integration health/status surfaces, environment docs, export workflows, operational monitoring, and a repeatable deployment checklist.

This report describes the reviewed state and the local signup patch. It does not certify production signup, tenant isolation, or the full commercial definition of done.
