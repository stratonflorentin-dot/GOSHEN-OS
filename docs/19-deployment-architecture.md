# 19 — Deployment Architecture

This document separates the **current deployment** from desired release
automation. Do not treat a target control as active until it is implemented and
verified.

## 1. Current Runtime

| Area | Current implementation |
|---|---|
| Web | Next.js App Router deployed to Vercel; GitHub `main` triggers production builds |
| Database | Neon-hosted PostgreSQL with PostGIS |
| Identity | Better Auth backed by the `auth` schema in PostgreSQL |
| Tenant queries | `DATABASE_URL_APP`, a non-owner `goshen_app` role; `withUser()` sets transaction-local `app.user_id` so RLS applies |
| Auth/migration connection | `DATABASE_URL`; server-only owner connection, never for normal tenant queries |
| Migrations | Numbered SQL under `db/migrations/`, applied with `npm run db:migrate` |
| CI | No complete GitHub Actions quality/deployment workflow is currently present |
| Preview/staging isolation | Must be configured and verified; do not assume every Vercel preview has an isolated Neon branch |

Required production invariant: `DATABASE_URL` and `DATABASE_URL_APP` point to
the same Neon database and branch. The app role must remain a non-owner so RLS
cannot be bypassed. Secret values are kept in managed environment settings and
must never be committed or logged.

## 2. Target Release Pipeline

Implement CI as a separate, reviewable change. The intended checks are:

1. Typecheck, lint, unit tests, and dependency/security scans.
2. Apply migrations to an isolated disposable PostgreSQL/Neon branch.
3. Run migration, RLS, service integration, and affected Playwright journey
   tests against that branch.
4. Deploy a preview and run smoke checks.
5. Promote to production only after the checks pass; apply database migrations
   before code that depends on them, with a verified rollback/forward-fix plan.

The repository does not yet meet this target pipeline. In particular, the
documented pgTAP and Playwright suites must exist before their gates are enabled.

## 3. Migrations

- Source: `db/migrations/*.sql`, ordered by filename.
- Runner: `scripts/migrate.ts`, invoked with `npm run db:migrate`.
- The runner records completed filenames in `public.schema_migrations` and
  provisions the least-privilege app role. Review its side effects and verify
  the selected database URL before using it against production.
- Production schema changes are migrations, not manual console edits.
- Destructive changes require a staged deprecation, verified backup, and
  forward-fix plan.

## 4. Configuration and Secrets

Server-only variables include `DATABASE_URL`, `DATABASE_URL_APP`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, mail-provider credentials, and any
configured external provider keys. `NEXT_PUBLIC_*` variables may be exposed to
the browser only when their values are designed to be public. Database URLs,
auth secrets, provider credentials, and owner-role credentials are never public.

Vercel and Neon hold production values. `.env.local` and `.env.production` are
local-only and must not be committed. See `.env.example` for variable names and
safe placeholders.

## 5. Runtime Topology and Integrations

- Vercel serves the Next.js application and its Node.js route handlers/actions.
- Neon provides managed PostgreSQL. PostGIS is used for farm and plot geometry.
- Better Auth uses the server-side owner connection for identity operations.
- Tenant services use the app-role connection with transaction-scoped user
  context and RLS.
- Object storage, realtime delivery, provider schedulers, and the optional
  Python analytics service are future integrations unless separately configured
  and verified. No Supabase runtime is part of the current deployment.

## 6. Release and Recovery

Vercel can redeploy a prior web build; database changes require a forward-fix
migration unless a tested recovery procedure is used. Keep schema changes
backward-compatible with the deployed app during rollout. Neon backup/PITR
retention and restore objectives must be verified against the active Neon plan
and configured project; this repository does not certify those settings.
