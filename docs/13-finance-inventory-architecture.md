# 13 — Finance & Inventory Architecture

## 1. Finance Architecture

### 1.1 Model: operational documents → double-entry ledger

```
Expense ──┐
Revenue ──┤  (service layer posts)   journal_entries + journal_lines (immutable when posted)
Payment ──┘
```

- **Chart of accounts** (`accounts`): seeded per org from a template —
  Assets (Cash, Bank, Mobile Money, Inventory, Receivables), Liabilities
  (Payables, Loans), Equity (Owner Contributions, Retained), Revenue (Crop,
  Livestock, Other), Expenses (Inputs, Labor, Fuel, Utilities, Maintenance,
  Other). Tenant-editable; system rows protected.
- **`financial_accounts`**: real-world money accounts (cash / bank /
  mobile money, e.g. M-Pesa, Tigo Pesa, Airtel Money). Balance maintained from
  `payments` + opening balance; reconciled against statements manually (v1).
- **Multi-currency**: original currency + `fx_rate` on every document;
  `amount_base` for aggregation; reports show original currency with base in
  parentheses.
- **Receivables/Payables**: derived views over `sales.payment_status`,
  `supplier_invoices.status`, and payment gaps — plus aging buckets (Phase 5).

### 1.2 Immutability & Correction
- Posted journals and payments: no UPDATE/DELETE (triggers + revoked grants).
- **Reversal entries**: new journal (`entry_type='reversal'`, `reversal_of_id`)
  mirroring negated lines; UI "Correct this transaction" creates a reversal +
  optionally a corrected replacement in one guided flow.
- Draft journals editable only by accountant/owner before posting.
- Every posting writes `audit_logs` (actor, doc ref, amount, reason optional).

### 1.3 Owner Transactions & Loans
`owner_transactions` records contributions/withdrawals (equity accounts).
`loans` tracks principal, interest, due dates; repayments are payments
(`loan_id`), posting interest/principal split (Phase 5 refinement).

### 1.4 Cost Allocation (the profitability bridge)
- `allocationService.allocate(source, targets[])` — allocate an expense,
  labor record, inventory consumption, or equipment usage to one or more
  targets (`plot`, `crop_season`, `livestock_batch`, `activity`, `equipment`,
  `farm`, `department`), amounts summing ≤ source amount (trigger-enforced).
- Default allocation rules per org (e.g., fertilizer purchase auto-targets the
  plot chosen at application; labor auto-targets the activity's season).
- Read models (SQL views, Phase 5): `plot_profitability`,
  `crop_profitability`, `batch_economics`, `farm_pnl` — revenue, cost, gross
  margin, margin %, cost/ha, revenue/ha, yield/ha, profit/ha, cost/kg.

## 2. Inventory Architecture

### 2.1 Ledger Design
- `inventory_movements` is the **only** way stock changes (append-only,
  trigger-maintained balances, no direct stock edits). All modules —
  procurement receipts, crop inputs, livestock feed, sales, tasks — call
  `inventoryService.recordMovement()`.
- Balance invariants (DB-enforced): stock never negative; `unit_cost_avg`
  = weighted moving average on inbound; adjustments/losses require `reason`
  and write audit rows.
- **Units**: base unit per item + declared conversions (`unit_conversions`
  jsonb: bag→kg factor). Conversion math in pure `lib/domain/inventory.ts`
  with property tests (invertibility, factor > 0).

### 2.2 The Economics Chain (product principle)
```
Purchase fertilizer
  → supplier_invoice + payment        (finance: cash↓ / payable↑, journal)
  → inventory_movement(purchase)      (stock↑, avg cost updated)
Application to Plot A01
  → crop_activity(fertilization) + crop_input
  → inventory_movement(consumption)   (stock↓ at avg cost)
  → cost_allocation(→ plot A01 → maize season 2026)
Harvest → Sale
  → revenue + journal + profitability(Season 2026, Plot A01, Maize)
```
Same for livestock: chicks in → batch; feed/medicine consumption from stock →
batch cost; sales → revenue; batch P&L.

### 2.3 Views & Alerts
- `inventory_balances` view (item, location, on-hand, avg cost, value) —
  recomputed from ledger; nightly drift check vs cached `current_stock`.
- Notifications: low stock (`min_stock`), expiry tracking (Phase 6 —
  `expiry_date` column activation), unusual consumption (rule engine, Phase 7).
- Valuation: stock value = qty × avg cost; consumed cost carried into
  allocations at **moving average at consumption time** (historical accuracy).

## 3. Procurement Workflow (state machine)

```
Request(pending) → approved → Purchase Order(draft→open)
  → Goods Receipt (full/partial; creates stock-in movements)
  → Supplier Invoice (3-way match: PO ↔ receipt ↔ invoice)
  → Payment(s) (partial allowed; invoice status auto-updates)
```
- Enforced transitions (service + status checks); approvals audited
  (who/when/amount).
- Partial receipts: `purchase_order_items.received_quantity` accumulates;
  PO auto-advances `partially_received → received → closed`.
- Price variance (invoice vs PO) flagged for accountant review.
