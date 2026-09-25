# 10 — User Journeys

End-to-end journeys that E2E tests (docs/18 §4) replay automatically.

## Journey 1 — First Customer, First Farm (the §71 spine)

**Actor**: New farmer, phone only, no technical knowledge.

1. **Register** → verify email → Organization setup ("Tesha Family
   Agriculture", TZ, TZS) → trial starts.
2. **Create farm** "Bagamoyo Farm": type=mixed, Region Coast → District
   Bagamoyo → Ward/Village (cascade), save.
3. **Open map** → chooses *Walk the farm boundary* → grants location
   permission → walks; HUD shows accuracy (amber at 12 m), distance 1.4 km,
   18 points → Finish → validation passes (no self-intersection, median
   accuracy 8 m) → **Result: 12.3 acres / 4.98 ha / 49,783 m²** → Save.
   (Boundary versioned; raw trace retained.)
4. **Create plots**: draws Plot A01/A02/A03 on the map (vertex editor),
   assigns areas; system shows per-plot hectares.
5. **Plan crops**: Maize (H614) on A01 for "2026 Main Season", planting
   12 Jan 2026, expected harvest 20 May, target 4,000 kg.
6. **Record activities**: ploughing (labor, cost), planting (seed from
   inventory), fertilization — uses 2 bags NPK from stock.
7. **Purchase fertilizer**: request → approved → PO to supplier → receipt
   (inventory ↑) → invoice → payment (cash ↓). Fertilizer visible in
   inventory.
8. **Apply fertilizer to Plot A01**: activity + crop_input → inventory
   movement (consumption at moving-average cost) → **cost allocated to
   Plot A01 / Maize 2026** (visible in plot panel and profitability).
9. **Record labor**: casual workers, weeding 3 days × rate → flows into
   season cost.
10. **Harvest**: 4,100 kg recorded → storage → **Sell**: customer, price
    TSh/kg → sale doc → revenue + journal.
11. **See results**: Plot A01 panel — cost TSh X, revenue TSh Y, **profit
    Z**; Profitability page: cost/ha, yield/ha, margin % — matching manual
    calculation exactly.
12. **Weather**: 7-day forecast visible (provider connected); heavy-rain
    insight suggests reviewing irrigation + spray timing (evidence-linked).
13. **Ask AI**: "Why did Plot A01 make less profit this season?" → answer
    built from actual records, citations to own data (+ knowledge base where
    agronomic), confidence shown, suggested investigations listed.
14. **Reports**: generate Farm report + Profitability report PDF — figures
    match UI.
15. **Second farm**: creates "Morogoro Farm" under the same org — both farms
    fully isolated (farm-scoped views, no data bleed).

## Journey 2 — Broiler Batch (livestock spine)

1. Livestock → Groups: "Broilers" (meat) → **Batch BROILER-001**: 500 birds,
   arrival 1 Sep, cost of chicks recorded (expense → batch allocation).
2. Daily: feed consumption records (starter 15 bags, grower 22, finisher 18 —
   from inventory, cost at avg), medicine + vaccination events (products,
   cost), weighing events (avg weight curve).
3. Mortality: 12 birds over cycle with cause categories (heat_stress 7,
   disease 3, unknown 2) — current count auto-maintained (488), negative
   impossible.
4. **Sales**: sell 480 birds @ TSh X/kg → sale doc → revenue.
5. **Batch economics panel** (auto): feed by phase, total cost, cost/bird,
   cost/kg, revenue, profit/bird, margin, FCR, mortality rate — all
   reconciling to ledgers.

## Journey 3 — Field Worker Day (mobile + offline)

1. Worker (role=worker) opens app on phone: sees only assigned tasks + farm
   map — **no financial data anywhere**.
2. Task "Apply fertilizer to Plot A03" → opens task → marks in progress →
   records materials used (2 bags urea) + photo + time → complete.
   → On server: activity created, stock consumed, allocation + labor recorded.
3. **Connectivity drops** mid-morning: banner shows Offline; worker records
   a disease observation on batch BROILER-001 (photo, symptoms) and another
   task completion → SyncChips show "Pending".
4. Evening, connectivity returns → auto-sync → statuses become Synced;
   one item fails (stock already consumed elsewhere) → worker sees plain-
   language reason and resolves by reducing quantity → synced.

## Journey 4 — Accountant Month-End

1. Accountant reviews transactions, records missing expenses/receipts,
   matches supplier invoices to payments.
2. Posts journal entries; one expense was mis-posted → **reversal entry**
   (original immutable) + corrected entry.
3. Trial balance = 0. Generates Financial + Profitability reports → exports
   XLSX — totals match on-screen figures.
4. Cannot see farm operation detail beyond financial links (role scoping).

## Journey 5 — Multi-Tenant Isolation (always-on regression)

1. John registers → creates "John Agricultural Enterprises" → "John's Farm".
2. John searches/lists farms, plots, customers, reports: **zero trace of
   Tesha's data**; direct URLs to Tesha record ids → 403.
3. pgTAP equivalent asserts the same at the database layer (docs/18 §3).

## Journey 6 — Platform Admin

1. Super admin opens /admin (separate guard): tenants, subscriptions, usage,
   provider statuses, sync failure monitor, audit explorer.
2. Suspends a trial-expired org (audited); **cannot edit tenant financial
   records** (read-only by policy).
