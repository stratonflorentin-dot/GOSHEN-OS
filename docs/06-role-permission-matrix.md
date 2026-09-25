# 06 — Role & Permission Matrix

Roles are defined at two scopes (see `05-security-model.md`):
**Organization roles** (`organization_members.role`) and optional
**farm-scoped roles** (`farm_members.role`, same role set).

Role inheritance (each role includes everything to its right):
`owner → admin → manager → {accountant, agronomist, veterinarian, inventory_manager} → worker → viewer`

Platform role `super_admin` is separate and platform-scoped only.

Legend: **C**=create, **R**=read, **U**=update, **D**=delete,
**A**=approve/administer, **–**=no access. "Own" = records created by that user.

## 1. Organization-Scoped Modules

| Module / Capability | owner | admin | manager | accountant | agronomist | veterinarian | inv. manager | worker | viewer | super_admin |
|---|---|---|---|---|---|---|---|---|---|---|
| Organization settings, delete org | A | U | – | – | – | – | – | – | – | – |
| Members: invite / roles | A | A | – | – | – | – | – | – | – | – |
| Subscription / billing | A | R | R | – | – | – | – | – | – | R* |
| Farms: create / archive | A | A | C/U | – | – | – | – | – | – | – |
| Chart of accounts | A | A | – | A | – | – | – | – | – | – |
| Journal entries (post) | A | U | – | C/U/A | – | – | – | – | – | – |
| Journal reversals | A | A | – | C | – | – | – | – | – | – |
| Payments / expenses / revenues | A | U | R | C/U | – | – | – | – | – | – |
| Cost allocations | A | U | C/U | C/U | – | – | – | – | – | – |
| Procurement: POs (approve) | A | A | C/U | C/U | – | – | C | – | – | – |
| Suppliers / customers | A | U | C/U | C/U | – | – | C/U | – | – | – |
| Inventory: items & locations | A | U | C/U | R | R | – | A | R | R | – |
| Inventory: movements | A | U | C/U | R | – | – | C/U | C** | – | – |
| Reports: financial | A | R | R | C/R | – | – | – | – | R | – |
| Reports: operational | A | R | C/R | R | C/R | C/R | C/R | R | R | – |
| Audit log | R | R | R | R | – | – | – | – | – | R |
| Platform administration | – | – | – | – | – | – | – | – | – | A |

\* super_admin sees subscription/usage metadata for platform operations; tenant
financial records remain read-only (see `05` §6).
\** workers may create consumption movements only for their assigned tasks
(record material usage), never corrections/purchases.

## 2. Farm-Scoped Modules

| Module / Capability | owner | admin | manager | accountant | agronomist | veterinarian | inv. manager | worker | viewer |
|---|---|---|---|---|---|---|---|---|---|
| Farm settings, boundary edit | A | A | U | – | – | – | – | – | – |
| Boundary GPS capture / manual draw | A | A | C/U | – | – | – | – | C (assign) | – |
| Map layers, feature editing (buildings, water, fences) | A | A | C/U | – | – | – | – | – | – |
| Plots: create/edit geometry & info | A | A | C/U | – | – | – | – | – | – |
| Plot history / soil records | R | R | C/U | R | C/U | R | – | R | R |
| Crop seasons: plan / edit | A | R | C/U | – | C/U | – | – | – | – |
| Crop activities | A | R | C/U | R | C/U | – | – | C (own) | – |
| Harvests | A | R | C/U | R | R | – | – | C (own) | – |
| Livestock groups/batches: create/edit | A | R | C/U | – | – | C/U | – | – | – |
| Livestock events (mortality, sales, weighing) | A | R | C/U | R | – | C/U | – | C (own) | – |
| Livestock health (vaccination/medication) | A | R | C/U | – | – | C/U | – | C (observation) | – |
| Equipment, irrigation, storage | A | R | C/U | R | R | – | – | C (usage/own) | – |
| Labor records | A | R | C/U | C/U | – | – | – | C (own) | – |
| Tasks: create/assign | A | A | C/U | – | C | C | C | – | – |
| Tasks: complete own | C (own) | C (own) | U | – | U | U | U | C/U (own) | – |
| Documents upload | C/U | C/U | C/U | C/U | C/U | C/U | C/U | C (photos) | R |
| Weather view / insights | R | R | R | R | R | R | R | R | R |
| Sales (record) | A | U | C/U | C/U | – | – | – | – | – |
| Market data entry | A | U | C/U | C/U | C/U | – | – | – | – |
| AI assistant | R | R | R | R | R | R | R | R | R |
| Notifications preferences | U | U | U | U | U | U | U | U | – |

## 3. Field Worker Contract (important)

Workers are the most constrained role by design:

- Can: view assigned tasks and their farm's plots on the map; record activities,
  observations, task completions, photos, GPS points (when assigned boundary
  capture), own labor entries, and consumption of materials against their tasks.
- Cannot: edit or delete others' records; see financial figures (revenue,
  profit, wages of others) in UI; manage inventory stock levels; approve
  anything.
- Field UI hides financial fields entirely for `worker` (progressive disclosure
  by role, not just by screen).

## 4. Permission Enforcement Points

1. **Postgres RLS** — final authority, per-module write roles encoded in
   policies (generates from this matrix; `scripts/gen-rls.ts` emits policy SQL
   reviewed in PRs).
2. **Service layer** — `requireRole(orgId, 'accountant')` guards inside
   services for friendly errors and business checks.
3. **UI** — route guards + component-level gating (cosmetic only; never relied
   upon).

## 5. Granular Permission Model (extensibility)

v1 ships the role matrix above. The schema reserves
`role_permissions(role, permission_key, allowed)` so that Phase 12+ can move to
fine-grained permission keys (e.g., `inventory.adjust`, `finance.post`,
`plots.geometry.edit`) without data migration — roles become bundles of keys.

## Open Questions

1. Should `veterinarian` see financial data? Current answer: no.
2. Should workers see other workers' labor entries? Current answer: no
   (privacy); only managers and above.
