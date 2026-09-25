# 14 — Crop & Livestock Architecture

## 1. Crop Architecture

### 1.1 Entities & Lifecycle
```
crops (catalog) ─ crop_varieties
plots ── seasons ──> crop_seasons (the plan: plot × crop × season × dates)
crop_seasons ──> crop_activities (land_prep … harvest)
                 ├─ crop_inputs (materials: from stock or free-text)
                 ├─ labor_records, equipment_usage (via activity ref)
                 └─ cost_allocations
crop_seasons ──> harvests ──> sales/sale_items (product_type='harvest')
plots ──> plot_history (rotation timeline, append-only)
```

- **Season status**: `planned → planted → growing → harvesting → completed | failed`.
  Completing a season closes it (read-only) and writes `plot_history`.
- **Rotation history**: `plot_history` + derived view gives the Plot A01
  timeline (2024 Maize → 2025 Beans → 2026 Maize) with per-season outcomes.
- **Activities** record: date, type, worker, quantity+unit, cost, GPS point,
  photos/attachments, notes. Inputs consumed from inventory at moving-average
  cost and allocated to the season/plot automatically.

### 1.2 Calculations (`lib/domain/profitability.ts`, pure)
- `seasonProfitability(season)`: revenue (harvest sales) − costs
  (inputs + labor + equipment + allocated direct costs) → gross margin, margin %,
  yield/ha, cost/ha, revenue/ha, profit/ha, cost/kg.
- Yield from `harvests` quantities (unit-normalized to kg via item/unit rules).
- Plot panel shows actuals-to-date for growing seasons (partial profitability,
  clearly labeled "to date").

## 2. Livestock Architecture

### 2.1 Entities & Lifecycle
```
livestock_species (Cattle, Goats, Broilers, Layers, Pigs, Fish, …)
livestock_groups (species × purpose: meat/eggs/milk/breeding)
livestock_batches (BROILER-001; initial/current counts; arrival date)
  ├─ livestock_events (arrival, death, sale, transfer, birth, cull, weighing, count_correction)
  ├─ livestock_health (vaccination, medication, observations, vet visits, symptoms, treatments)
  ├─ livestock_feed (feed type, quantity kg, cost, inventory link)
  └─ livestock_sales → sales/revenue
```
- Counts: trigger-maintained from events; **negative counts impossible**;
  physical counts use `count_correction` (audited, reason required).
- Weight: `weighing` events (avg and/or total) update `avg_weight_kg`; growth
  curve chart per batch.

### 2.2 Batch Economics (auto-computed from ledger, never hardcoded)
`batch_economics(batch)` — SQL view + pure-function mirror:
- Starting quantity, mortality (count + rate), current quantity.
- Feed consumed by phase (starter/grower/finisher) — kg and cost.
- Medicine, vaccination, labor, utilities (allocated), other costs.
- Total production cost; **cost per bird**; **cost per kg** (sold weight).
- Sales (birds, weight), revenue, gross profit, **profit per bird**, margin.
- **FCR** = feed consumed kg ÷ total live-weight gain kg (from weighing events).

### 2.3 Health & Safety Boundaries
- Health records are **records of what happened** (given/observed), including
  dosage fields for traceability.
- The system **never generates** treatment plans, dosages, or application
  rates. AI assistance on health topics routes to the knowledge base with
  citations and explicitly distinguishes informational guidance from
  professional veterinary diagnosis (see `16-ai-rag-architecture.md` §Safety).
- Mortality causes use an org-defined taxonomy (`cause_category`) with
  optional notes + photos; mortality dashboards surface trends ("deaths
  spiked 3 days after transfer") without asserting causes.
