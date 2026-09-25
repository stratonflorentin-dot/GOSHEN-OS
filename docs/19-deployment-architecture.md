# 19 — Deployment Architecture

## 1. Environments

| Env | Web | Database | Notes |
|---|---|---|---|
| Local | `next dev` | Supabase CLI (Docker) | migrations + seed applied locally |
| Preview | Vercel preview per PR | Supabase **branching** (per-PR DB) | RLS test suite runs against it |
| Staging | Vercel (staging project) | Supabase staging project | demo data incl. Bagamoyo Farm tenant |
| Production | Vercel production | Supabase production project | PITR enabled; migrations gated |

## 2. Pipeline (GitHub Actions)

**ci.yml** — on every PR:
1. `lint` (ESLint + `tsc --noEmit`)
2. `test:unit` (Vitest + fast-check property tests)
3. `db:test` — start Supabase CLI, apply all migrations, run pgTAP RLS suites
   (`tests/rls/`) and integration tests; **fail = block merge**
4. `test:e2e` (Playwright) — on PRs touching `app/` or `services/`
5. Secret scan (`gitleaks`) + dependency audit

**deploy.yml** — on merge to `main`:
1. All CI gates green
2. `supabase db push` to staging → smoke tests → (manual approval env gate) →
   production push with migration lock
3. Vercel deploy (automatic via Git integration)
4. Post-deploy smoke: health endpoint, auth flow, RLS spot-check, provider
   status dashboard

## 3. Migrations

- Numbered SQL files in `supabase/migrations/` (generated from reviewed docs
  like `03-database-schema.md`).
- Never edit production schema by hand; every change is a migration reviewed
  in a PR with its pgTAP impact analysis.
- Destructive migrations require a two-PR protocol (deprecate → drop) and a
  pre-migration backup checkpoint.

## 4. Secrets & Configuration

- Vercel env vars (server-only): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public),
  `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER_API_KEY`, `WEATHER_API_KEY`,
  `MAP_TILES_TOKEN`, `UPSTASH_REDIS_URL/TOKEN`.
- Supabase project secrets for Edge Functions.
- Client-exposed values limited to `NEXT_PUBLIC_*` (URL + anon key only).
- Rotation runbook in `20-disaster-recovery.md`.

## 5. Runtime Topology

- **Vercel**: Next.js app (Edge/Node runtimes per route), ISR for read-heavy
  reference pages, image optimization, WAF rules.
- **Supabase**: Postgres + PostGIS (compute sized per tenant growth), Auth,
  Storage (private buckets), Realtime, Edge Functions; scheduled functions for
  weather pulls, notification rules, usage metering, cache-drift checks.
- **Optional Python analytics** (Phase 7+): container service (Fly.io/Railway
  or Supabase Edge runtime equivalent), private network, called by Next server
  tier only.

## 6. Scaling Notes

- Connection pooling (Supavisor) for serverless fan-out.
- Read scaling: replicas for reporting if needed (Phase 13 decision point).
- Storage lifecycle rules for generated reports (auto-expire after N days).

## 7. Release & Rollback

- Atomic DB migrations (avoid long locks; `create index concurrently` where
  applicable).
- Vercel instant rollback for the web tier; DB rollbacks via forward-fix
  migrations (never `down` migrations in prod).
- Feature flags decouple deploy from release.
