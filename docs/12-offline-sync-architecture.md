# 12 — Offline Synchronization Architecture

Field connectivity in rural Tanzania is unreliable, so the **field workflow is
offline-first**. Principle: *never silently lose field data*.

## 1. Offline Scope (v1)

| Capability | Offline behavior |
|---|---|
| GPS boundary recording | Fully offline; trace buffered locally; validated on sync |
| View plots / farm map | Cached tiles + cached plot GeoJSON (last-synced) |
| View tasks | Cached assigned tasks |
| Record crop/livestock activities & observations | Queued locally |
| Complete tasks (time, materials, photos, notes) | Queued locally |
| Record inventory consumption (task materials) | Queued (server re-validates stock) |
| Photos | Stored locally, uploaded on sync |
| ❌ Finance, procurement, sales, reports, AI | Online-only in v1 (financial integrity requires server transactionality) |

## 2. Client Components

- **PWA**: manifest + service worker (Workbox): app-shell precache, runtime
  caching (stale-while-revalidate for reference data; cache-first for map tiles
  with quota LRU; network-only for API mutations).
- **IndexedDB (Dexie)**: 
  - `outbox`: `{id (idempotency key = UUID), entity_type, payload, status:
    pending|syncing|synced|failed, attempts, error, client_created_at,
    device_id, depends_on?[]}`.
  - `cache`: last-synced reads (plots, tasks, item names) + photos (blobs).
- **UI status** (`features/sync-indicator/`): online/offline badge; per-record
  status chips (Pending / Syncing / Synced / Failed with retry + error reason).

## 3. Write Path

```
User action (offline or online)
  → service validates shape client-side (shared Zod)
  → append to outbox (status: pending) + optimistic UI update
  → if online: flush immediately; else: wait
Flush: POST /api/v1/sync/batch
  body: { operations: [{ id, entity_type, payload, client_created_at, device_id }] }
  → server applies each in a transaction, in order, respecting depends_on
  → per-operation result: applied | duplicate (already applied id) | failed(reason)
  → client marks outbox rows accordingly; failures keep payload for retry/fix
```

- **Idempotency**: `sync_operations.id` is the client idempotency key; replays
  return `duplicate` — network retries are always safe.
- **Ordering**: `depends_on` chains (e.g., activity → its crop_input movement);
  server topologically applies; orphans held as `pending` with reason.
- **Payloads are entity-level** (e.g., `crop_activities.create`) — server-side
  services perform the full derived writes (movements, allocations), so the
  client never reimplements financial logic offline.

## 4. Conflict Policy

| Data | Policy |
|---|---|
| Append-only records (activities, observations, events, GPS traces) | No conflict — both survive (most field data) |
| Task completion | Server merges: completion record appended; status transitions validated (done-after-cancelled flagged for review) |
| Inventory consumption | Server re-validates stock at apply time; insufficient stock → `failed` with reason, user resolves (reduce quantity / substitute) |
| Counts that need current state (e.g., count_correction) | Server computes from ledger; if basis changed, returns current ledger snapshot for confirmation |
| Plot/boundary geometry | **Server wins** (manager edits beat stale device); device geometry kept in version history as alternative |
| Profile/settings | Last-write-wins per field |

## 5. Read Path (offline reads)

- On login/foreground (online): prefetch workspace bundle — assigned tasks,
  farm plots GeoJSON, item names/species lists, org users — into Dexie.
- Map tiles cached by Workbox with quota management (LRU eviction, cap ~200 MB).
- UI shows "data as of <timestamp>" when serving cache.

## 6. Failure Handling & Observability

- Retry with exponential backoff + jitter; max 5 automatic attempts →
  `failed` (user-actionable), never dropped.
- Failed syncs surface in the sync center and generate a notification to the
  user (and manager if unresolved > 24 h).
- `sync_operations` rows provide server-side monitoring: failure rate, lag,
  per-device stuck queues (dashboard in Phase 13 observability).
- App update with pending outbox: block destructive service-worker takeover
  until queue drained or user confirms (data preserved across updates via
  stable Dexie schema versioning).

## 7. Testing (see 18)

- Unit: queue ordering, idempotency, depends_on resolution.
- Integration: offline batch against a disposable PostgreSQL database initialized
  with the repository migrations, including conflict fixtures.
- E2E: Playwright offline context — record activity in airplane mode,
  reconnect, assert server state identical (gate item, brief §71).
