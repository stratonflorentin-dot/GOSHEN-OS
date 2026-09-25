# 05 — Multi-Tenant Security Model

## 1. Threat Model Summary

Primary risks: cross-tenant data leakage (the catastrophic failure), privilege
escalation within an org, secret exposure, tampering with financial history, and
fabricated external/AI data. Controls are layered: **RLS is the final
authority**; service-layer checks exist for UX and error messages, never as the
only barrier.

## 2. Identity & Membership Model

- Supabase `auth.users` is the identity provider (email + password at launch;
  phone OTP and Google OAuth reserved in schema).
- `public.profiles` (1:1 with `auth.users`) holds display data and locale.
- `public.organization_members (organization_id, user_id, role, status)` —
  org-level membership and role. `status ∈ {active, invited, suspended}`.
- `public.farm_members (farm_id, user_id, role)` — optional farm-scoped role;
  if absent, the org role applies to all farms of the org.
- Invitations (`public.invitations`) carry a single-use token, expiry, and
  intended role; accepting creates the membership row.

## 3. Authorization Helper Functions (Supabase/Postgres)

All helpers are `SECURITY DEFINER`, `STABLE`, `search_path = public`, owned by
`postgres`, and expose **only membership booleans/roles — never raw data**:

```sql
public.user_org_ids()            RETURNS SETOF uuid        -- orgs where status='active'
public.org_role(p_org uuid)      RETURNS text              -- NULL if not a member
public.is_org_member(p_org uuid) RETURNS boolean
public.has_org_role(p_org uuid, p_roles text[]) RETURNS boolean
public.farm_org(p_farm uuid)     RETURNS uuid              -- org owning farm
public.farm_role(p_farm uuid)    RETURNS text              -- farm-scoped role if any, else org role
public.is_farm_member(p_farm uuid) RETURNS boolean
public.has_farm_role(p_farm uuid, p_roles text[]) RETURNS boolean
public.is_platform_admin()       RETURNS boolean           -- reads public.platform_admins
```

Role hierarchy (highest first) and implicit inheritance:

`owner > admin > manager > accountant/agronomist/veterinarian/inventory_manager > worker > viewer`

- `owner`/`admin` include all `manager` abilities; `manager` includes all
  `worker` abilities; `viewer` is read-only.
- **Write floor**: writes require at least the module's role (see
  `06-role-permission-matrix.md`); workers can create operational records
  (activities, observations, task completions) but cannot edit others' records
  or any financial record.

## 4. RLS Policy Pattern

Every tenant table enables RLS with **no default-public policies**. The
canonical policy set per table `t` (with org column `organization_id`, optional
farm column `farm_id`):

```sql
ALTER TABLE t ENABLE ROW LEVEL SECURITY;
ALTER TABLE t FORCE ROW LEVEL SECURITY;   -- applies to table owner too (except definer helpers)

-- SELECT: any active member of the org (or farm member) can read
CREATE POLICY t_select ON t FOR SELECT
  USING (is_org_member(organization_id)
         AND (farm_id IS NULL OR is_farm_member(farm_id) OR has_farm_role(farm_id,'viewer','worker','manager','admin','owner')));

-- INSERT: role per module; organization_id forced to caller's org
CREATE POLICY t_insert ON t FOR INSERT
  WITH CHECK (organization_id = ANY (SELECT user_org_ids())
              AND has_org_role(organization_id, <module write roles>));

-- UPDATE: role check + tenant check on both sides (prevents moving rows across orgs)
CREATE POLICY t_update ON t FOR UPDATE
  USING (is_org_member(organization_id) AND has_org_role(organization_id, <roles>))
  WITH CHECK (organization_id = ANY (SELECT user_org_ids()));

-- DELETE: denied by default (no policy) for financial/ledger tables;
-- allowed only for drafts where appropriate.
```

Additional enforcement:

- **Tenant stamping**: `BEFORE INSERT` trigger `set_organization_context()` sets
  `created_by = auth.uid()`; `BEFORE UPDATE` maintains `updated_at`.
- **Cross-org references**: FK columns (e.g., `plots.farm_id`,
  `inventory_movements.item_id`) are validated by triggers to resolve to rows in
  the *same* organization — preventing ID-guessing joins across tenants.
- **Soft delete** (`deleted_at timestamptz`) only where listed in
  `03-database-schema.md`; RLS SELECT policies exclude soft-deleted rows.

## 5. Financial Immutability

- `journal_entries`, `journal_lines`, `payments` (posted), `audit_logs`,
  `inventory_movements`: `REVOKE UPDATE, DELETE` from `authenticated` and
  `anon`; enforced additionally by `BEFORE UPDATE/DELETE` triggers that raise
  exceptions.
- Corrections: `journal_entries.reversal_of_id` self-FK; a reversal entry
  references the original and must balance to its negation.
- Draft financial documents (unposted journals) may be edited by
  `accountant`/`admin` only.

## 6. Platform Super Admin

- Separate table `public.platform_admins (user_id, level)` — **not** derivable
  from org membership; membership grants no platform access.
- Super admins do not query tenant tables via RLS. All platform admin
  functionality runs through server-only Route Handlers using the service-role
  client, each wrapped in `requirePlatformAdmin()` + an audit write
  (`audit_logs.actor_scope = 'platform'`).
- Tenant financial records are **read-only** for platform admins by policy;
  no UI exposes modification.

## 7. Storage Security

- Private buckets only: `documents` (per-org path prefix `org/{org_id}/…`),
  `photos` (field evidence), `reports` (generated exports).
- Bucket RLS mirrors table policies: path prefix must start with an org the
  caller belongs to (`storage.objects` policies using `is_org_member` parsed
  from the path).
- Signed URLs (short TTL) for downloads; nothing public.

## 8. Application-Tier Security

- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER_API_KEY`,
  `WEATHER_API_KEY`, map/terrain tokens) exist **only** as Vercel/Supabase
  server env vars. Never imported into client bundles; enforced by lint rule
  banning `serviceRole` imports outside `server/`.
- Zod validation at every boundary (forms, API routes, RPC params).
- Rate limiting: Upstash Redis (or Vercel WAF) on auth endpoints, AI routes,
  and export generation.
- Session management: Supabase Auth defaults (JWT ~1 h, refresh rotation);
  `requireAuth()` middleware on protected routes; security headers (CSP,
  HSTS, X-Frame-Options) configured in `next.config.ts`.
- Edge Functions validate the caller's JWT and org membership server-side.

## 9. Audit Logging (append-only)

`audit_logs(id, organization_id, actor_id, actor_scope, action, entity_type,
entity_id, before jsonb, after jsonb, reason, ip, user_agent, created_at)`.

- Written by DB triggers on sensitive tables (livestock counts, inventory,
  finance, memberships, settings) **and** by explicit service calls for
  business actions.
- Example: worker changes broiler count 500 → 470 ⇒ row captures
  action=`livestock_events.update`, before/after, reason=`Mortality update`.
- Append-only: no UPDATE/DELETE grants; retention ≥ 7 years for financial
  entities.

## 10. Data Privacy

- No cross-org querying is possible under RLS; sharing is an explicit future
  feature (grant-based, e.g., cooperative roll-ups) and out of scope for v1.
- Farm coordinates, financials, documents, and customer data never appear in
  logs, analytics events, or error reports (redaction middleware).
- AI layer receives farm context only for the caller's own org, verified
  server-side before retrieval (see `16-ai-rag-architecture.md`).

## 11. Verification

- pgTAP suite `tests/rls/` runs per migration in CI: for each tenant table, a
  user from org A must get 0 rows from org B, and cross-org writes must fail.
  See `18-testing-strategy.md` §RLS.
- Security checklist gate before production: secrets scan, dependency audit,
  CSP review, RLS coverage lint (every table with `organization_id` has ≥
  SELECT+INSERT policies), penetration checklist.

## Open Questions

RESOLVED (2026-09-25):

1. Auth: email-only at launch; phone OTP deferred (schema reserved).
2. `farm_members` schema ships in Phase 1; farm-scoped UI enforcement ramps from Phase 3.
