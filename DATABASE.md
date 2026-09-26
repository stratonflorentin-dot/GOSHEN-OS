# Database Model and Migration Notes

## Current stack

The application currently uses PostgreSQL through `postgres.js`; PostGIS is enabled by the foundation migration. Better Auth identities are stored in schema `auth`. Application/domain data is in schema `public`. Supabase is not the active data-access layer in this repository.

## Tenant model

- `auth.user`: authentication identity.
- `public.profiles`: application profile keyed to the auth user UUID.
- `public.organizations`: tenant/customer boundary.
- `public.organization_members`: active/invited/suspended user membership and organization role.
- `public.farms`: farm owned by an organization.
- `public.farm_members`: per-farm membership and role.
- `public.invitations`: organization-scoped invitation records.
- Domain tables in the crops/livestock, inventory/procurement, finance/accounting, and plots/operations migrations associate records with the relevant organization and/or farm.

The schema provides a foundation, not proof that every endpoint/policy implements the exact same authorization rule. Verify all tenant-owned tables and every read/write path.

## RLS execution model

`public.app_uid()` reads the transaction-local `app.user_id` setting. `withUser(userId, fn)` opens a transaction with the application role and sets that value before calling domain code. Production expects `DATABASE_URL_APP` to identify a non-owner role so RLS is enforced. The owner `DATABASE_URL` bypasses RLS and is reserved for trusted migrations/auth operations. Never use that owner URL for normal tenant queries.

Run `scripts/verify-rls.ts` against a disposable database after confirming its target. The critical acceptance tests are cross-organization reads/writes, unassigned farm access, role-specific finance access, and reference data reads.

## Auth schema alignment in this change

`db/migrations/0000_auth_schema.sql` originally created snake_case auth columns and declared `email_verified` as a timestamp. Better Auth expects a boolean and the original runtime did not map its field names to these columns. `lib/auth/auth.ts` now configures the Kysely Postgres.js dialect, explicitly maps Better Auth fields to existing snake_case columns, and uses `schemaName: "auth"`. `0008_auth_signup_alignment.sql` changes the verified flag to boolean and adds password/token expiry columns required for email/password accounts.

This migration is additive/data-preserving for current values: non-null old verification timestamps become `true`, null values become `false`. It has been applied with schema-only mode and verified against the Neon database configured in `.env.production`. Deploy the updated auth code, then verify the live registration flow.

## Migration process caveats

- SQL migrations live in `db/migrations/` and are applied in filename order by `scripts/migrate.ts`.
- Two files use the `0006` prefix; the `_original.sql` snapshot is excluded by the migration runner.
- `scripts/migrate.ts` also creates/alters the `goshen_app` role and writes a connection URL into `.env.local`; it can rotate the app role password. It is not schema-only.
- `scripts/run-auth-migration.ts` is retired with a guard message; use the ordered migration runner only.
- Never manually edit production schema outside a reviewed migration.

## Required checks before release

1. Confirm backup and database target without exposing credentials.
2. Confirm current migration ledger and whether auth tables exist in the expected schema.
3. Apply the ordered migration set using an approved deployment workflow, taking account of the role-rotation side effect.
4. Verify auth schema columns and Better Auth validation against the target.
5. Create a disposable test account, sign in, confirm session persistence, and delete the test account.
6. Run cross-tenant and per-role RLS checks with two isolated organizations.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [SECURITY.md](./SECURITY.md).
