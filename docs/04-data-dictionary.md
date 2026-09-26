# 04 — Data Dictionary

Conventions and semantics for every table in `03-database-schema.md`. This
document defines shared column meanings, units, and invariants; per-column
details not repeated here are self-evident from the DDL and inline comments.

## 1. Universal Conventions

| Convention | Rule |
|---|---|
| Primary keys | `uuid` (time-ordered UUIDv7-style where generated in app) |
| Tenant columns | `organization_id uuid NOT NULL` on every tenant table; `farm_id` added on farm-scoped tables |
| Timestamps | `created_at timestamptz NOT NULL DEFAULT now()`; `updated_at` maintained by `touch_updated_at()` trigger |
| Attribution | `created_by uuid REFERENCES profiles(id)` — the acting user, set from transaction-local `app.user_id` via `public.app_uid()` |
| Soft delete | `deleted_at timestamptz NULL` **only** on: `plots, map_features, crop_activities, documents, inventory_items, workers, customers, suppliers, equipment, farms(status=archived)`. Ledger tables never soft-delete |
| Money | `numeric(18,4)`; `currency char(3)` ISO-4217; `fx_rate numeric(14,6)` stores the rate used at transaction time; `amount_base = amount × fx_rate` where cross-currency |
| Areas | Stored in `m²` (`area_m2`); UI converts to hectares/acres per org settings. Computed as `ST_Area(geom::geography)` (ellipsoidal, not planar) |
| Distance | meters; Duration: minutes (events) / days (dates); Weight: kg; Volume: liters; Count: integer units (head, birds, pieces) |
| Quantities | `numeric(12..14, 3)`; units always stored alongside — never assume kg |
| Identifiers | Human codes unique per scope: `plots (farm_id, code)`, `livestock_batches (farm_id, code)`, `purchase_orders (organization_id, po_number)`, `sales (organization_id, sale_number)` |

## 2. Status Lifecycles

| Table.field | Lifecycle |
|---|---|
| `organizations.status` | `active → suspended → cancelled` (platform action, audited) |
| `farms.status` | `active ⇄ archived` (archive hides from lists, data intact) |
| `plots.status` | `active ⇄ fallow ⇄ reserved` → `retired` (terminal) |
| `crop_seasons.status` | `planned → planted → growing → harvesting → completed` \| `failed` |
| `livestock_batches.status` | `planned → active → completed → closed` |
| `purchase_requests.status` | `pending → approved → converted` \| `rejected` \| `cancelled` |
| `purchase_orders.status` | `draft → open → partially_received → received → closed` \| `cancelled` |
| `supplier_invoices.status` | `unpaid → partial → paid` \| `void` (void = reversal entry, never delete) |
| `sales.payment_status` | `unpaid → partial → paid` |
| `journal_entries.status` | `draft → posted` \| `void` (void requires reversal entry) |
| `tasks.status` | `open → in_progress → done` \| `cancelled` |
| `subscriptions.status` | `trialing → active → past_due → cancelled/expired` |

## 3. Ledger & Movement Semantics (critical)

### `inventory_movements`
Append-only. `quantity` is always **positive**; the sign is derived from
`movement_type`: positive for `opening, purchase, transfer_in`; negative for
`transfer_out, consumption, adjustment, loss, sale`. `adjustment` and `loss`
require `reason`. `unit_cost` required for inbound types; weighted-average cost
(`inventory_items.unit_cost_avg`) is recomputed on inbound. `balance_after` is
a per-item cache; the audit view recomputes from the ledger to detect drift.

### `livestock_events`
Append-only. `quantity` positive; direction from `event_type`: positive
`arrival, transfer_in, birth`; negative `death, sale, transfer_out, cull`;
`count_correction` reconciles to a physical count and stores the delta
computation rationale in `notes`. `maintain_batch_count()` trigger maintains
`livestock_batches.current_count` and rejects negative counts. Mortality
analysis uses `cause_category` (org-defined taxonomy, e.g. `heat_stress`,
`disease`, `predation`, `unknown`) — never invented by the system.

### `journal_entries` / `journal_lines`
Double-entry: posted entries must balance (`Σdebit = Σcredit`, deferred
constraint trigger). Posted entries and their lines are immutable (trigger +
revoked grants). Corrections are new entries with `entry_type='reversal'` and
`reversal_of_id` pointing at the original; the reversal must mirror the
original's lines negated. `reference_type/reference_id` links to the business
document (expense, revenue, payment) that caused the entry.

### `cost_allocations`
The profitability bridge. A cost source (`expense`, `labor_record`,
inventory consumption, `equipment_usage`) is allocated, fully or partially, to
exactly one target (`farm | plot | crop_season | livestock_batch | activity |
equipment | department`). Allocation must not exceed the source amount
(enforced by a Phase 5 trigger). Read model: `plot_profitability`,
`batch_economics`, `crop_profitability` views (Phase 5).

## 4. Derived / Cached Columns (source of truth)

| Cache | Source of truth |
|---|---|
| `farms.area_m2`, `plots.area_m2` | generated from `boundary` geometry |
| `inventory_items.current_stock`, `unit_cost_avg` | `inventory_movements` ledger |
| `livestock_batches.current_count`, `avg_weight_kg` | `livestock_events` (weighing events) |
| `financial_accounts.current_balance` | `payments` + opening balance |
| `purchase_order_items.received_quantity` | `goods_receipt_items` |
| `supplier_invoices.amount_paid` / `status` | `payments` (supplier_invoice_id) |
| `sales.payment_status` | `payments` (sale_id) |
| `plots.current_crop_season_id` | latest non-completed `crop_seasons` row (trigger, Phase 3) |

Nightly consistency jobs (Phase 13) compare caches vs. ledger recomputation and
alert on drift — never silently "fix" by editing ledgers.

## 5. Attachments & Photos

`jsonb attachments` columns store `[{document_id, kind, captured_at}]`.
Documents live in the private `documents` bucket under `org/{org_id}/…`;
photos under `org/{org_id}/photos/…`. Full documents rows are created by the
service layer after a successful storage upload (signed-URL flow; browser never
holds service credentials).

## 6. GPS / Geometry Data

- `farm_boundary_versions.raw_gps_points`: the untouched trace —
  `[{lat, lng, accuracy_m, recorded_at}]`. Kept for audit and re-validation;
  never displayed as authoritative.
- `farms.boundary` / `plots.boundary`: cleaned, validated polygons (WKB,
  4326). Validation results (point count, self-intersection check, accuracy
  median/max) in `farm_boundary_versions.validation`.
- `crop_activities.location`: optional GPS point where the activity happened.
- Coordinate order is always (lat, lng) in JSON, (lng, lat) in GeoJSON/WKB —
  conversion is centralized in `lib/geo/`.

## 7. AI Tables Semantics

- `ai_queries.context_snapshot`: records *which* farm-data functions were
  called and their parameterization — the "why" behind an answer.
- `ai_responses.confidence`: `high | moderate | low | insufficient_evidence`.
  When `insufficient_evidence`, `answer` must state what data is missing.
- `ai_citations`: every claim-bearing answer cites either
  `knowledge_chunk` (approved external source) or `farm_record` /
  `farm_aggregate` (the tenant's own data). Uncited specialized advice is a
  defect (see `16-ai-rag-architecture.md` §Safety).

## 8. Seed / Reference Data

- `livestock_species`: Cattle, Goats, Sheep, Chickens (Layers), Broilers, Pigs, Fish, Other.
- `inventory_categories`: Seeds, Fertilizer, Chemicals, Feed, Medicine, Fuel, Tools, Spare parts, Packaging, Other.
- `accounts`: org-level chart of accounts seeded from a template (assets, liabilities, equity, revenue, expenses with cash/bank/mobile_money/receivable/payable/loan subtypes) — tenant-editable, system rows not deletable.
- `crops`: NOT seeded globally per tenant except as an optional platform catalog (`global_ref`); orgs create their own.

## 9. Index Strategy Summary

- B-tree: every FK; `(organization_id, …)` composites for list views; date
  columns used in range filters.
- GiST: all geometry columns; GIN: `jsonb` searched fields, `text[]` topic
  arrays.
- IVFFlat: `knowledge_chunks.embedding`.
- Partial indexes: active rows (`where deleted_at is null` /
  `where status = 'active'`) on hot tables.

## 10. Multi-Currency

Default currency per org (`TZS` initially). Transactions store original
`currency` + `fx_rate` (rate captured at entry time, editable only before
posting). Aggregates convert via `amount_base`. No silent conversion — UI
always shows original currency with converted value in parentheses.
