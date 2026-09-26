# GOSHEN OS Repository and Live Audit

## Follow-up: documented architecture alignment (2026-09-26)

The `docs/` package is being treated as the intended product and architecture
specification. The deployed application is **not yet fully aligned** with it.
The latest production fix is commit `83411dc`: onboarding now loads, the
organization RPC was verified in a rolled-back production transaction, and
the migration uses `CREATE OR REPLACE` so the existing function does not cause
SQLSTATE 42723 on reapplication. The production site responds successfully on
`/`, `/onboarding`, `/manifest.webmanifest`, and `/favicon.ico`.

Current targeted checks: TypeScript passes; 8 unit tests pass; the Webpack
production build passes. These checks do not certify all modules or the full
acceptance journeys in `docs/18-testing-strategy.md` and
`docs/22-definition-of-done.md`.

Architecture gaps found against the docs include:

- **Backend specification conflict:** `docs/README.md`, `docs/03-database-schema.md`,
  and deployment/recovery documents specify Supabase, while
  `docs/nemo-prompt.md` specifies Neon + Better Auth and the deployed app uses
  Neon-compatible PostgreSQL + Better Auth. Resolve this contradiction before
  changing production infrastructure.
- **GIS stack:** the documented 2D standard is MapLibre; the active farm map is
  now MapLibre. A 3D satellite toggle uses a pitched camera and Esri imagery;
  it is not a terrain-enabled Cesium globe. The browser-only boundary and
  geofence flows still need phone/GPS acceptance testing.
- **Provider integrity:** the docs require integrations to say `PENDING` when
  unavailable, but `services/weatherService.ts` registers generated mock
  forecasts by default. The UI must label this clearly or use an unavailable
  state.
- **Layering and module coverage:** the docs require thin App Router pages and
  business logic in module services. The present app has partial vertical
  slices and does not implement all the documented modules or acceptance
  journeys.
- **Quality gates:** no complete Playwright journey suite, pgTAP suite, CI
  workflow, or verified 360 px device matrix is present; passing the current
  focused unit/build checks is not equivalent to the documented DoD.

The full `docs/` package should remain the product target, with architecture
conflicts resolved before incompatible backend or map rewrites.

**Audit date:** 2026-09-26
**Repository:** `stratonflorentin-dot/GOSHEN-OS`
**Live URL:** https://goshen-os-five.vercel.app/

## Scope and evidence

This is a repository review, live page inspection, and targeted database verification. Live signup, signin, session persistence, and logout pass against the public Vercel URL. The production app-role URL was aligned to the owner database and verified as non-owner with RLS enabled. Organization onboarding now renders; production home, onboarding, manifest, and favicon return HTTP 200. The organization RPC was tested against production in a transaction that was rolled back. Tenant-isolation checks pass for the tested two-tenant cases on the configured development database; full table/role coverage remains. GeoJSON parsing was checked against PostGIS. Eight unit tests pass. No complete desktop/tablet/mobile browser matrix exists, so responsive behavior and phone workflows are not certified.

## What exists

- Next.js App Router application with React, TypeScript, Tailwind, and a small shared UI component set.
- Account-first product landing page at `/`; authenticated users are directed to `/dashboard`
- Secondary anonymous local-first workspace at `/workspace`, with records stored in browser `localStorage` and a downloadable backup.
- Separate database-backed app routes for dashboard, farms, onboarding, plots, crops, livestock, inventory, finance, analytics, weather, maps, and a 3D map view.
- Better Auth email/password routes and API handler, PostgreSQL accessed through `postgres.js`, and PostGIS migrations.
- Organization, membership, farm, profile, invitation, role, and permission tables; organization/farm ownership columns and RLS policies across domain migrations.
- IndexedDB, a GPS recorder, background sync code, a service worker, and a PWA manifest.
- Provider interfaces for weather and 3D/map rendering. Mock weather is the configured fallback when `WEATHER_PROVIDER` is absent.

## Feature disposition

| Area | Decision | Evidence / next action |
| --- | --- | --- |
| Existing local workspace and backup | Keep as secondary trial | Available at `/workspace`; explain clearly that it is device-only and is not synced to a farm account. |
| Better Auth with PostgreSQL | Refactor | Kysely Postgres.js dialect and explicit schema/field mappings are deployed. The current Better Auth user table is `auth.user`. |
| Authentication schema | Refactor | Migration 0008 and explicit Better Auth field mappings align the current `auth` schema; migration 0009 aligns the profile foreign key. Both migrations were applied in schema-only mode to the configured production database. |
| Organization and farm schema/RLS | Keep, then verify | PostgreSQL migrations define tenant policies. The focused two-tenant RLS verification now passes against configured development; the complete policy matrix and assigned-farm role matrix still need coverage. |
| MapLibre | Current 2D/oblique satellite map | All farm-map routes use MapLibre; `3D satellite` is an oblique camera mode over Esri imagery. Verify tile availability, mobile controls, and geometry behavior on devices. |
| 3D/Cesium | Planned high-quality terrain globe | Cesium terrain is not currently active; do not present the oblique MapLibre camera as a terrain model. |
| Weather | Keep provider interface; fix presentation | Mock provider returns generated values and is selected by default. Make mock status unmistakable in UI and production configuration; do not present mock forecasts as observations. |
| Offline and PWA | Refactor | IndexedDB/service worker/sync code exists, but sync requests target GPS and other API endpoints that were not found in the current app routes. Test queue replay, tenant/session scoping, cache invalidation, and service-worker update behavior. |
| Test infrastructure | Continue | Vitest and eight focused unit tests pass; meaningful database/RLS/workflow coverage is still needed. |

## Functional, partial, mocked, missing, and broken

### Functional by source inspection

- The public root presents account creation/sign-in and directs authenticated users to `/dashboard`; `/workspace` retains the local-only workspace.
- Auth pages call Better Auth email/password APIs; the auth catch-all route forwards GET/POST requests.
- Database-backed route handlers/pages call server-side session helpers, and app pages are gated by a session-cookie check in `proxy.ts`.
- The migration set creates PostGIS geography/geometry-backed farm and plot structures and declares tenant RLS policies.
- Phone geolocation collection and offline storage primitives exist in library code.

### Broken or high-confidence defects

- **Resolved in production:** the earlier profile/RPC server failures came from mismatched database configuration and organization creation not supplying a required slug. Production app-role configuration is aligned; migration 0010 now generates a unique slug and uses `CREATE OR REPLACE`. Organization creation was verified in a production transaction and rolled back afterward.
- The initial signup origin and Better Auth schema/model mismatches were corrected. The canonical production hostname is trusted, auth models explicitly target `auth.*`, and IDs use UUID generation. Live signup/signin/session/logout requests now pass.
- A local production build connected to the configured production database passed signup, session read, dashboard/profile creation, signout, signin, and session read; the disposable account was deleted. That is separate from and does not verify Vercel's runtime database connection.
- **Signup success UX was wrong:** email verification is disabled, but signup sent the user to a page instructing them to check email. It now routes to `/dashboard` and catches network exceptions in the working tree.
- **Signup surfaced backend messages:** detailed auth/database errors could be shown in the browser. The updated signup maps known input errors and returns a safe generic message for other failures.
- Vitest is installed and eight focused unit tests pass. They do not replace database/RLS or end-to-end coverage.
- The service-worker sync client calls `/api/gps/traces` and other synchronization endpoints that are absent from the inspected App Router routes. These queue types cannot be assumed to sync.
- Farm and plot boundary writes called a two-argument `ST_GeomFromGeoJSON` signature not supported by the configured PostGIS installation. Those writes now parse with the supported function and set SRID 4326 explicitly.

### Partial / not verified end-to-end

- Full account-to-farm onboarding remains unverified end-to-end. The organization setup page loads, and the organization RPC passed a rolled-back production transaction; a user-created farm and boundary lifecycle still needs a real acceptance run.
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
- `DATABASE_URL_APP` is mandatory in production by `lib/db`; it must target the same database and branch as `DATABASE_URL`, using a non-owner role. Development can fall back to the owner URL and logs that RLS is bypassed. Keep that fallback development-only.
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

- The public home page now prioritizes cloud account access; `/workspace` retains the device-only workspace and clearly labels its storage boundary.
- Live signup/signin/session/logout API requests pass. Dashboard onboarding remains blocked by the production database mismatch above.
- Desktop/tablet/mobile workflows were not exhaustively exercised in this audit. A phone-oriented bottom-navigation and field workflow must be verified at narrow viewport sizes with real GPS permissions and offline transitions.

## Integrations and environment variables

Variables referenced by source: `DATABASE_URL`, `DATABASE_URL_APP`, `BETTER_AUTH_SECRET`, `NEXTAUTH_SECRET`, `BETTER_AUTH_URL`, `VERCEL_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `WEATHER_PROVIDER`, `OPENWEATHER_API_KEY`, `CESIUM_ION_TOKEN`, and `CESIUM_TERRAIN_TOKEN`. Migration scripts also reference `DATABASE_URL_UNPOOLED` and `GOSHEN_APP_DB_PASSWORD`.

`.env.example` describes required and optional values without secrets. Production `DATABASE_URL_APP` must use the same database and branch as `DATABASE_URL`, with a non-owner role. Mock weather must be visibly labeled if used.

## Tooling and verification results

- `npm run typecheck`: passed after signup/auth changes.
- `npx next build --webpack`: passed; route compilation and static generation completed.
- `npm run build` (default Turbopack): blocked on this Windows workspace because the installed Next SWC native binding is not a valid Win32 application; the Webpack build succeeded as a verification alternative.
- `npm run test:unit`: passed (2 files, 8 tests).
- `npm run lint`: no lint script is configured. ESLint config and rule coverage need a separate review.
- Live production `/`, `/onboarding`, `/manifest.webmanifest`, and `/favicon.ico` return HTTP 200. An authenticated onboarding page smoke check rendered successfully. Mobile/tablet viewport behavior was not exhaustively tested.

## Recommended order

1. Complete a disposable full onboarding journey: create organization, farm, and GPS boundary; verify persistence and dashboard reads.
2. Add auth, validation, geometry, calculations, RLS isolation, and Playwright journey coverage.
3. Reconcile local workspace data with authenticated organization/farm onboarding; choose explicit import/sync/backup semantics.
4. Audit every tenant table, policy, server action, API, and database role; run Organization A/B isolation checks on a disposable database.
5. Complete a single farm/plot/crop/activity/inventory/expense/harvest/sale vertical workflow, then livestock/feed/health/sale.
6. Fix or disable offline sync paths with no server endpoint; test tenant-scoped cache and sync conflict handling.
7. Verify mobile GPS boundary capture and tablet/desktop flows on actual viewport sizes and devices.
8. Add production integration health/status surfaces, environment docs, export workflows, operational monitoring, and a repeatable deployment checklist.

This report does not certify the complete tenant-policy matrix, responsive field workflows, live geofencing with phone GPS, all provider integrations, or the full commercial definition of done.
