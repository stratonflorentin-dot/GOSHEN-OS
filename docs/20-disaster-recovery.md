# 20 — Disaster Recovery Plan

## 1. Objectives

| Metric | Target (v1) | Notes |
|---|---|---|
| RPO (data loss window) | ≤ 5 min for Postgres (PITR); ≤ 24 h for Storage objects | Supabase PITR; storage versioning/mirroring |
| RTO (service restoration) | ≤ 4 h | restore or failover + app redeploy |
| Backup retention | 30 days PITR + weekly logical dumps ≥ 90 days (financial data ≥ 7 years via dumps + audit ledger) | |

## 2. Backup Strategy

- **Database**: Supabase PITR (WAL) + weekly `pg_dump` logical backups stored
  in a separate cloud account/bucket (cross-account, immutable/WORM retention).
  Monthly restore *drill* into a scratch project; measure and record RTO.
- **Storage**: versioning enabled on buckets; nightly sync of `documents`/
  `photos` metadata (rows) + periodic object inventory checksums; large binary
  mirroring via scheduled job (Phase 13 hardening).
- **Code/Infra**: Git (GitHub) is the source of truth; infra config in repo;
  secrets in managed vaults with documented re-provisioning steps.

## 3. Failure Scenarios & Runbooks

| Scenario | Detection | Response |
|---|---|---|
| Bad migration in prod | deploy smoke fail / error spike | halt pipeline; forward-fix migration; restore PITR checkpoint if data damage |
| Accidental tenant data deletion | support report / audit log anomaly | PITR to scratch project → surgical row export → restore into prod (audited, with org consent) |
| Supabase regional outage | monitoring alerts | status page update; PITR restore into new project (runbook `DR-01`); repoint env vars; RTO target 4 h |
| Storage loss | checksum job | restore objects from mirror/WORM backups |
| Secret compromise | audit/gitleaks/notifications | rotate all provider keys (runbook `DR-02`), revoke sessions (`auth` admin), force re-login, review audit logs |
| ransomware/logic bomb | anomaly detection | isolate (disable signups, revoke keys), restore from WORM dumps, forensic review of audit logs |

## 4. Data Export (customer-facing)

- Org owners can export their full tenant dataset (CSV/JSON per module +
  documents manifest) — supports customer exit rights and acts as a
  user-initiated backup.
- Export is rate-limited, audited, and delivered via signed URL.

## 5. Recovery Procedure Summary (DR-01)

1. Declare incident, note timestamp (defines PITR target).
2. Create replacement Supabase project; run `supabase db push` (all migrations).
3. Restore PITR/logical dump into it.
4. Verify: row counts vs. last known metrics, pgTAP RLS suite, app smoke tests.
5. Repoint secrets (URL/keys), redeploy web tier, enable Realtime/Storage.
6. Post-incident review; update this plan.

## 6. Backup Verification

- Automated weekly job: restore latest dump into scratch, run consistency
  checks (ledger recomputation vs caches, FK integrity, RLS suite), publish
  report to admin notifications.
- No backup is considered valid until it has been restored at least once.
