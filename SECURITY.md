# Security Model

## Identity and sessions

Better Auth handles email/password identity and sessions through `/api/auth/*`. Protected application pages use a lightweight cookie gate in `proxy.ts` and must also verify the session on the server before reading or changing data. A cookie's presence alone is not authorization.

The signup patch configures Better Auth's supported Kysely dialect for the existing Postgres.js client, targets the `auth` schema, maps current column names, and avoids returning detailed server/database errors to the registration form. Email verification is disabled at present; choose and document the production email-verification/recovery policy before commercial launch.

## Tenant data

- Normal domain requests must use the least-privilege `DATABASE_URL_APP` connection.
- Every user-scoped transaction sets `app.user_id` before accessing RLS-protected tables.
- Owner credentials bypass RLS. Keep them server-only and use only for migrations or trusted platform tasks.
- RLS is the enforcement layer. Do not rely on hidden UI, query filters in the browser, or user-provided organization/farm IDs.
- Validate organization membership, farm assignment, role, and record ownership in policies and in high-risk server actions.

## Offline and browser storage

The anonymous root workspace stores operational records in browser `localStorage`. Treat the device as an untrusted shared environment and explain the lack of cloud sync. IndexedDB/service-worker caches must be scoped to the signed-in user/tenant and cleared or isolated on sign-out and account switch. Only public/static content should be cached by default.

## Errors, logs, and secrets

- User-facing forms should return safe, actionable messages; database/provider internals belong in server logs.
- Never log passwords, session tokens, auth cookies, API keys, invitation tokens, or full database URLs.
- Required secrets are set through local ignored env files or deployment secret storage, never committed. `.env.production` is untracked in the current workspace and must stay untracked.
- Review server actions and API routes for input validation, tenant authorization, rate limits, CSRF/origin behavior, and safe errors.

## Release gates

Before production rollout, test signup/login/logout/session expiration/reset on disposable accounts, test cross-tenant and role restrictions with separate organizations, inspect service-worker cache behavior, verify migration target/backup, and review dependency/security advisories. Basic Vitest coverage now runs, but the database and end-to-end release gates are not automated yet.
