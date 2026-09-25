# 17 — Reporting Architecture

## 1. Report Catalog

| Report | Contents | Source |
|---|---|---|
| Farm report | Overview: size, plots, active crops/livestock, season summary, financial snapshot | farm + profitability views |
| Crop report | Per season/plot: activities timeline, inputs, costs, yield, revenue, profit | cropSeasonSummary + profitability |
| Livestock report | Per batch: counts, mortality + causes, feed, health events, sales, economics | batch_economics |
| Financial report | Income/expenses by category & period, cash movement, receivables/payables | finance views |
| Accounting reports | Trial balance, general ledger, account statements | journal tables |
| Inventory report | Stock on hand, valuation, movements, losses, turnover | inventory_balances |
| Production report | Harvest totals by crop/plot/season, storage in/out, losses | harvests + storage_records |
| Profitability report | By farm/plot/crop/season/batch: margins, per-hectare & per-kg metrics | profitability views |
| Weather report | Forecast/observation history, alerts, insight log | weather tables |
| Management report | Cross-module executive summary (dashboard data + trends + AI highlights) | aggregates |

## 2. Generation Pipeline

```
reportService.render(reportId, params{farmId?, seasonId?, dateRange, format})
  → params validated (Zod) + role check (report-type-specific, per docs/06)
  → data assembly: SQL views/RPCs (same queries as UI — single source)
  → format renderer:
      PDF:  server-side HTML template → headless render (React + print CSS)
      CSV:  streaming rows (large datasets never fully buffered)
      XLSX: workbook library (SheetJS/ExcelJS) with typed sheets
  → stored in private bucket org/{orgId}/reports/ (TTL cleanup)
  → delivered via short-TTL signed URL; generation audited
```

- Rate-limited and queued for heavy reports (> 30 s → async job + notification
  on completion).
- Consistency contract: **export totals must equal UI totals** (both read the
  same views; Playwright cross-checks a fixture farm).

## 3. Design Standards

- Branded, print-ready PDFs: org name, farm, period, generated-at, page
  numbers, currency formatting (locale-aware).
- Multi-currency: original currency lines + base-currency summary.
- All reports parameterized (date range, farm, season) with saved presets.

## 4. Scheduling (Phase 11+)

- Monthly/seasonal auto-reports per farm → notification + documents module
  entry. Enabled per org preference.
