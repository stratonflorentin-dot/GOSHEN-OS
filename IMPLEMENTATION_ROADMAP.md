# GOSHEN OS Implementation Roadmap

The product brief defines a multi-tenant commercial platform. Deliver it as tested vertical slices; do not replace the whole codebase at once. Priorities below are based on the repository and live audit in [AUDIT_REPORT.md](./AUDIT_REPORT.md).

## Stage 0 — Signup and release safety

- [x] Replace unsupported raw Postgres.js auth adapter with Kysely dialect configuration.
- [x] Map Better Auth schema fields to existing snake_case columns and correct `email_verified` type through a migration.
- [x] Make successful signup use the authenticated dashboard and sanitize registration errors.
- [x] Apply migration 0008 to the Neon database configured in `.env.production` without rotating application-role credentials.
- [x] Push and confirm the updated registration page markup is visible on the live site.
- [ ] Verify account creation and session creation with a disposable live test account.
- [ ] Verify a disposable account can sign up, sign in, retain a session, and sign out on the live deployment.

## Stage 1 — Verification foundation

- [x] Add Vitest and focused auth-validation/GIS calculation unit tests.
- [ ] Add database/RLS, signup/session, and domain-workflow integration tests.
- [ ] Add lint script/config and CI checks for typecheck, unit tests, build, and migration checks.
- [ ] Resolve duplicate `0006` migration prefixes and document the actual migration ledger.
- [ ] Replace/deprecate the legacy auth migration script; avoid secret/role changes as an incidental effect of schema deployment.
- [ ] Add `.env.example` with descriptions, required/optional status, and no secret values.

## Stage 2 — One account-to-farm journey

- [ ] Define a clear anonymous trial versus cloud account boundary.
- [ ] Implement account signup/signin/password recovery/logout and session lifecycle.
- [ ] Build organization creation and first-farm onboarding; remove any assumptions tied to one demonstration farm.
- [ ] Offer an explicit, validated import path from local workspace backup to a cloud farm; do not silently mix local and server records.
- [ ] Test organization/farm creation and empty/loading/error states on mobile and desktop.

## Stage 3 — Tenant security

- [ ] Inventory every domain table and classify global reference versus organization/farm-owned data.
- [ ] Audit every RLS policy and owner/app role grant.
- [ ] Test Organization A/B isolation and worker/accountant/manager access boundaries on a disposable PostgreSQL database.
- [ ] Add audit events for sensitive membership, finance, and boundary changes.

## Stage 4 — Farm and GIS vertical slice

- [ ] Finish farm boundary capture on a smartphone: start/pause/resume/finish, accuracy/jump checks, closure/self-intersection validation, area/perimeter, and persisted PostGIS geometry.
- [ ] Add manual edit/import flows with failure-safe preview and validation.
- [ ] Verify map behavior offline/online and choose one primary map library after feature comparison.
- [ ] Build farm → plot → boundary → crop assignment and test geometry integrity.

## Stage 5 — Operational and financial chains

- [ ] Complete crop season → activity → input → inventory movement → expense → harvest → sale → revenue/profit.
- [ ] Complete livestock batch → feed/medicine → mortality/health events → inventory movement → sale/profit.
- [ ] Verify units, currencies, accounting dates, reversals, audit records, and role-based finance visibility.
- [ ] Add reproducible sample data only in a disposable development database.

## Stage 6 — Mobile field work and offline

- [ ] Align mobile navigation and quick-add with field tasks.
- [ ] Add endpoints for every supported queued operation or remove unsupported queue types.
- [ ] Add idempotency, retry/backoff, conflict resolution, user/tenant cache isolation, and sign-out cleanup.
- [ ] Exercise airplane mode → field capture → reconnect → sync across phone browsers.

## Stage 7 — Integrations, reporting, and commercial readiness

- [ ] Label mock weather and unavailable map/terrain services; confirm provider configuration and failure modes.
- [ ] Add data export for tenant-owned records and reports.
- [ ] Add observability, rate limits, backups/restore drills, accessibility review, and production support runbooks.
- [ ] Verify phone, tablet, and desktop workflows; measure large-table/map behavior with realistic data.
- [ ] Run the product-wide multi-tenant E2E acceptance suite from the project brief.

## Completion rule

A stage is complete only when its database changes, validation, permissions, UI states, mobile behavior, tests, and documentation have been verified. A successful build alone does not certify a domain workflow or commercial readiness.
