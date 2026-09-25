# 09 — Wireframe Specification

Textual wireframes (Figma-ready spec) for all 36 core screens, plus the design
system. **The map is a first-class surface throughout.** Roles referenced use
docs/06. Progressive disclosure: summary first, detail on demand.

## Design System (tokens)

- **Colors**: primary green `#1B7A43` (agronomy, actions), earth accent
  `#8C6A3F` (soil/livestock), semantic: success/warning/danger/info standard
  ramp; neutral grays 50–950. Dark mode via CSS variables (Tailwind tokens).
- **Typography**: Inter (UI) + tabular numerals for money/areas; scale
  12/14/16/18/22/28; minimum touch target 44 px.
- **Spacing**: 4 px grid; cards 16 px padding, radius 12; tables zebra-free
  with hairline dividers.
- **Components**: Card, StatCard (label + big value + delta), DataTable
  (server-paginated, sticky header, column pinning), MapContainer, LayerChip,
  StatusBadge (crop growth/season/PO/payment states), MoneyText (currency
  aware), EmptyState (explains + primary action), SyncChip (offline statuses),
  ConfirmDialog, FormSection (progressive disclosure groups), PhotoCapture,
  GPSAccuracyBadge, CitationCard (AI).
- **Accessibility**: AA contrast, visible focus, keyboard map for tables/maps.
- **i18n**: every label a translation key (en/sw); numbers/currency locale-aware.

## Screens

### 1. Login
Centered card, logo, email+password, "Forgot password", locale switch (EN/Sw),
link to register. Error inline; no hint which field failed on unknown user.

### 2. Registration
Name, email, phone (optional), password (strength meter), terms. Creates
account → routes to Organization setup.

### 3. Organization setup
Org name (live slug preview), country (default TZ), default currency,
timezone. Explains: "An organization is your agricultural business — you can
manage several farms under it." Creates org + trial subscription → Farm
creation wizard.

### 4. Farm creation (wizard, 2 steps)
Step 1: name, description, type (crop/livestock/mixed), ownership, country,
Region/District/Ward/Village (Tanzania administrative cascade — data-driven,
not hardcoded), optional address.
Step 2: **Map opens centered on typed location** (geocode) — choose boundary
method: *Walk the boundary* (primary, big button) / *Draw on map* / *Import
GeoJSON/KML*. Skip → create farm without boundary (map addable later).

### 5. Farm boundary capture (GPS walk)
Full-screen map + bottom HUD. HUD: large START RECORDING button; while
recording: GPS accuracy badge (green/amber/red), live coordinates, distance,
time, point count; live path polyline. Controls row: Pause · Undo last ·
Restart · Finish. Finish → validation sheet: issues list (self-intersection,
poor accuracy, too few points) with Fix guidance; area result in **acres,
hectares, m²**; Confirm & Save → manual vertex editor option. (Spec details:
docs/11 §2.)

### 6. Farm dashboard
Header: farm switcher, season filter, date range. StatCards: Total area (ha/ac),
active crop seasons, livestock (heads/birds), inventory value, revenue (period),
expenses, profit, outstanding payments. Charts row: revenue vs expenses trend,
yield by crop, mortality trend. Map card: farm overview with plots colored by
crop status → click navigates to plot. Alerts strip: weather alerts, low
inventory, overdue tasks. Worker role sees operational cards only (no money).

### 7. Farm map (GIS workspace)
Full-bleed MapLibre. Left: collapsible layer panel (checkboxes per layer chip).
Top: basemap toggle (satellite primary / streets), search plot. Click plot → right info
panel (see 8). Map legend. Buttons: Add feature (buildings, water…), Edit
geometry (manager+). Status colors: growing=green, planned=blue, harvest
ready=amber, fallow=gray.

### 8. Plot details (panel + page)
Header: "PLOT A01" + status badge. Key figures: area (ha/acres), current crop,
season, planting date, expected harvest, total cost, revenue, profit, health,
weather risk. Tabs: **Overview** (above) · **History** (rotation timeline:
2024 Maize → 2025 Beans → 2026 Maize with outcomes) · **Activities** (list,
filterable) · **Soil** (records + lab report links) · **Documents**.

### 9. Plot history
Timeline per plot: seasons as cards (crop, variety, dates, yield, margin),
rotation notes; soil amendments flagged; "Plan next season" action (pre-fills
crop season form).

### 10. Crop planning
Season context selector. List of planned crop seasons (table: plot, crop,
variety, planting, expected harvest, target yield, status). "Plan crop season"
drawer: plot picker (map hover highlights), crop+variety (autocomplete),
dates (duration auto-suggest), target yield, seed quantity+cost. Validation:
overlap on plot detection.

### 11. Crop activity (record)
Quick form (mobile-first): activity type (big icon grid: ploughing, planting,
fertilization, weeding, spraying, irrigation, pest, disease, pruning, harvest),
date (today default), worker, quantity+unit, cost, photos, GPS capture button,
notes. If type uses materials → link inventory item + qty (creates movement on
save). Offline: save queues locally with SyncChip.

### 12. Harvest
Per season: harvest events (date, qty, unit, quality, moisture, storage dest),
season total vs target progress bar, labor cost on harvest, "Sell this harvest"
shortcut.

### 13. Livestock dashboard
Species cards (cattle/goats/broilers/layers/pigs/fish): total heads, active
batches, 30-day mortality, feed on hand. Batch table: code, species, arrival,
current count, mortality %, age, status. Alerts: mortality spikes, low feed.

### 14. Livestock batch (BROILER BATCH 001)
Header: batch code, species, status, age days. KPI row: initial birds, current
birds, mortality (count + %), avg weight, FCR, feed consumed, total cost,
revenue, profit, cost/bird, profit/bird. Tabs: **Events** (timeline:
arrival/deaths/sales/weighings w/ causes) · **Feed** (by phase: starter/grower/
finisher kg + cost) · **Health** (vaccinations, medications, observations) ·
**Economics** (full cost breakdown table + chart) · **Sales**.

### 15. Livestock health
Per batch health log + org-wide health calendar. Record forms: vaccination/
medication (product, date, administered by, cost, stock link), observation
(symptoms, photos), vet visit. AI/advisory elements route to knowledge-based
guidance with citations — **no dosage generation** (docs/16 §6).

### 16. Feed management
Feed inventory view (types, stock kg, avg cost), consumption by batch/phase
chart, consumption per bird metrics, low-stock alerts, record consumption
(shortcut to batch feed form).

### 17. Inventory
Items table: name, category, unit, stock (color vs min), avg cost, value,
location. Filters: category, low stock, farm. Item drawer: movements ledger
(paginated), adjustments (reason required), edit min stock. Categories,
locations managers. Valuation summary cards.

### 18. Procurement
Pipeline board: Requests (pending/approved) → POs (open/partial/received) →
Invoices (unpaid/partial/paid). PO detail: items, receipt progress bars,
3-way match status, linked payments. Create flows per stage; approvals
audited with approver displayed.

### 19. Finance
Accounts cards (Cash, Bank, M-Pesa, …) with balances. Transactions table
(paginated; income/expense chips, original currency + base). Buttons: Record
expense, Record revenue, Transfer, Owner contribution/withdrawal. Loans card.
Receivables/payables aging summary.

### 20. Accounting
Chart of accounts (tree), Journal entries list (status chips), New journal
entry (balanced-line editor with live debit=credit indicator), Entry detail
(immutable view + "Reverse" action with reason), Trial balance report view.

### 21. Profitability
Selectors: group by (farm/plot/crop/season/batch) × period. Table: entity,
revenue, cost, margin, margin %, cost/ha, yield/ha, profit/ha, cost/kg.
Comparison mode (A vs B). Drill-down to source allocations. Export buttons.

### 22. Labor
Workers list (type chips: employee/casual/contractor, active toggle).
Labor records table (date, worker, task, hours/pieces, rate, cost, plot/crop
link). Record form (mobile-quick: worker, today, task, hours, rate auto).
Summary: labor cost by activity/season.

### 23. Equipment
Cards per equipment (type, status badge, hours this month, last maintenance).
Detail: usage log, fuel, maintenance history, cost allocation action.

### 24. Irrigation
Water sources (map pins + list), zones (method, plots), irrigation events
(date, zone/plot, duration, water qty, energy cost). Simple coverage view.

### 25. Soil
Per plot soil records (date, pH, N, P, K, OM, texture), lab report upload
(document link), trend sparkline per nutrient. Empty state: "No soil tests —
upload a lab report" (no fabricated values, ever).

### 26. Weather
Farm weather: current + today/tomorrow/7-day cards, freshness stamp +
provider label. Alerts list (acknowledge). Insights feed (evidence-linked,
docs/15 §4). Historical rainfall chart (only if observation data exists).

### 27. Satellite (pending state)
Module renders "Satellite imagery is not connected yet" + adapter status;
when connected: scene list (date, provider), NDVI overlay toggle on map,
per-plot NDVI stats. No fake imagery.

### 28. AI assistant (assistant/)
Chat surface. Answer card: markdown answer, confidence badge, uncertainty
notes, **Evidence panel** (citation cards: source title, publisher, date,
link / farm data refs with values), "Suggested next investigations". Input
with suggested questions chips ("Which plot made the most profit?"). History
sidebar. Refusals render missing-data checklist.

### 29. Reports
Catalog grid (10 report types) → parameter panel (farm, season, date range,
format PDF/CSV/XLSX) → preview → generate (async + notification for heavy
jobs). Generated reports list with download links.

### 30. Tasks
Board (open/in progress/done) + list. Task card: title, plot/batch link,
assignee avatar, due date (overdue red), priority flag. Create: title, assign,
plot, due, priority. Completion sheet (mobile-first): time spent, materials
used (inventory link), photos, notes → creates activity/labor/consumption
records on submit (docs/14, DoD addendum).

### 31. Notifications
Feed grouped by day; category icons; severity colors; mark read; preferences
page (per category × channel matrix, docs/03 §9).

### 32. Team (user management)
Members table (name, org role, farm roles, status, last active). Invite
dialog (email + role). Pending invitations. Role explanations inline
(links to permission summary).

### 33. Organization settings
Profile (name, currency, timezone, locale), Fiscal settings (year start),
Inventory defaults (units), Danger zone (transfer ownership, close org —
guarded + audited).

### 34. Subscription
Current plan card (usage meters: farms, hectares, users, storage, AI
requests vs limits), plan comparison (no prices hardcoded — config-driven),
billing history placeholder, usage details.

### 35. System administration (platform admins, separate guard/layout)
Tenants table (orgs, status, plan, usage), Users search, Subscriptions,
System health (provider statuses, sync failure rates, error dashboard),
Integration registry (weather/satellite/market/AI adapter states), Audit
event explorer. Tenant financials **read-only** (docs/05 §6).

### 36. Offline synchronization (sync center)
Status summary (pending/syncing/synced/failed counts), per-device queue
list with record details, retry/resolve actions, failure reasons in plain
language, "data as of" stamps on cached views (docs/12 §2, §6).

## Figma Workflow

These specs translate 1:1 to Figma frames (360 px mobile + 1440 px desktop for
each numbered screen). Wireframes are built per phase, reviewed before that
phase's UI build; high-fidelity pass applies the tokens above.
