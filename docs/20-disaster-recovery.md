# 20 — Disaster Recovery Plan

This is a recovery target and operating checklist, not evidence that backups,
retention, or restore drills are already configured. Neon plan settings and
Vercel secret configuration must be checked before relying on any RPO/RTO.

## 1. Recovery Objectives

| Metric | Target | Verification required |
|---|---|---|
| PostgreSQL RPO | Set from the active Neon plan and project settings | Confirm backup/PITR window in Neon Console |
| Application RTO | 4 hours target | Run a restore and Vercel redeployment drill |
| Logical dump retention | At least 90 days; financial records follow applicable retention policy | Confirm encrypted, separate-account backup storage and retention lock |

This repository does not claim that the above targets are currently met.

## 2. Backup Strategy

- **Database:** use Neon-managed restore/PITR where enabled. Add scheduled,
  encrypted `pg_dump` backups in a separate account for independent recovery.
  Verify both database and role/schema restore procedures. Record the active
  Neon retention settings in the operations runbook, not in source control.
- **Object storage:** no production object-storage provider is currently
  documented as configured. When added, require private objects, versioning,
  and an independently verified backup process.
- **Code and configuration:** GitHub is the code source of truth. Keep
  production secrets in managed environment settings and document how to
  recreate them without putting secret values in this repository.

## 3. Failure Scenarios and Response

| Scenario | Response |
|---|---|
| Bad production migration | Stop further deploys; inspect the migration ledger; issue a reviewed forward-fix. Restore only if data damage cannot be safely repaired. |
| Accidental tenant data deletion | Restore a backup to an isolated Neon branch/database; verify the affected rows and RLS; export only approved records; restore with an audit trail. |
| Neon service/database outage | Check Neon status and project health; follow provider recovery guidance; restore to a separate database only if required; update managed URLs and verify app-role RLS before reopening traffic. |
| Object-storage loss | Follow the configured provider’s restore runbook; verify object checksums and tenant paths. |
| Secret compromise | Rotate affected managed credentials, revoke sessions if required, redeploy, and review audit logs. Never paste values into tickets or commits. |
| Malicious or destructive writes | Restrict app credentials, preserve logs/backups, restore to an isolated target, and validate ledger invariants before recovery. |

## 4. Recovery Procedure

1. Declare the incident and record the recovery point needed.
2. Provision or select an isolated Neon database/branch and restore the chosen
   provider backup or logical dump.
3. Confirm schema state using `public.schema_migrations`; apply any reviewed
   migrations with `npm run db:migrate` only after verifying the target URL.
4. Recreate the non-owner `goshen_app` role and least-privilege grants. Set
   `DATABASE_URL` and `DATABASE_URL_APP` in managed settings to the same target.
5. Verify login/session, organization membership, RLS isolation, and critical
   workflows before switching production traffic.
6. Record results, update the runbook, and schedule a restore drill if any step
   failed.

## 5. Backup Verification Gate

A backup is not considered verified until it has been restored to an isolated
target and checked for row counts, foreign keys, tenant isolation, and financial
ledger consistency. Schedule and record these drills after backup automation is
implemented.
