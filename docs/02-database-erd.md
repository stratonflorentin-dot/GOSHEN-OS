# 02 — Database ERD

PostgreSQL 15 + PostGIS 3.4 + pgvector. All tenant tables carry
`organization_id`; farm-scoped tables also carry `farm_id`. UUID v7-style PKs
(time-ordered, index-friendly). This ERD shows core relationships; the complete
column-level definition is in `03-database-schema.md`.

## 1. Tenancy & Identity

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "1:1"
    PROFILES ||--o{ ORGANIZATION_MEMBERS : "joins"
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "has"
    ORGANIZATIONS ||--o{ FARMS : "owns"
    FARMS ||--o{ FARM_MEMBERS : "scopes"
    PROFILES ||--o{ FARM_MEMBERS : "joins"
    ORGANIZATIONS ||--|| SUBSCRIPTIONS : "subscribes"
    PLANS ||--o{ SUBSCRIPTIONS : "plan"
    ORGANIZATIONS ||--o{ USAGE_RECORDS : "usage"

    ORGANIZATIONS {
        uuid id PK
        text name
        text slug UK
        char3 default_currency
        text country
        text status
    }
    FARMS {
        uuid id PK
        uuid organization_id FK
        text name
        text farm_type
        text ownership_type
        text country, region, district, ward, village
        geometry boundary "polygon 4326"
        numeric area_m2 "ST_Area(geography)"
        geography centroid
    }
```

## 2. GIS / Land

```mermaid
erDiagram
    FARMS ||--o{ MAP_FEATURES : "layers"
    FARMS ||--o{ PLOTS : "contains"
    PLOTS ||--o{ PLOTS : "parent (block>subplot)"
    PLOTS ||--o{ PLOT_HISTORY : "rotation"
    PLOTS ||--o{ PLOT_SOIL_RECORDS : "soil"
    FARMS ||--o{ FARM_BOUNDARY_VERSIONS : "history"

    PLOTS {
        uuid id PK
        uuid farm_id FK
        text code "A01"
        text name
        geometry boundary "polygon 4326"
        numeric area_m2
        text status
        uuid parent_plot_id FK
    }
    MAP_FEATURES {
        uuid id PK
        uuid farm_id FK
        text feature_type "building|road|water_source|well|irrigation|storage|animal_housing|greenhouse|drainage|fence|electric|tree|field"
        geometry geom "4326"
        jsonb properties
    }
```

## 3. Crops (operations → finance)

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ CROPS : "catalog"
    CROPS ||--o{ CROP_VARIETIES : "varieties"
    FARMS ||--o{ SEASONS : "has"
    PLOTS ||--o{ CROP_SEASONS : "planted"
    CROPS ||--o{ CROP_SEASONS : "what"
    CROP_VARIETIES ||--o{ CROP_SEASONS : "variety"
    CROP_SEASONS ||--o{ CROP_ACTIVITIES : "activities"
    CROP_ACTIVITIES ||--o{ CROP_INPUTS : "materials used"
    INVENTORY_ITEMS ||--o{ CROP_INPUTS : "from stock"
    CROP_SEASONS ||--o{ HARVESTS : "yields"
    CROP_SEASONS ||--o{ COST_ALLOCATIONS : "costs"
    WORKERS ||--o{ CROP_ACTIVITIES : "performed by"

    CROP_SEASONS {
        uuid id PK
        uuid plot_id FK
        uuid crop_id FK
        uuid season_id FK
        date planting_date
        date expected_harvest_date
        numeric target_yield_kg
        numeric seed_quantity, seed_cost
        text status
    }
    CROP_ACTIVITIES {
        uuid id PK
        uuid crop_season_id FK
        text activity_type "land_prep|ploughing|planting|fertilization|weeding|spraying|irrigation|pest_control|disease_observation|pruning|harvest"
        date activity_date
        uuid worker_id FK
        numeric cost
        geography location
        jsonb attachments
        text notes
    }
```

## 4. Livestock

```mermaid
erDiagram
    LIVESTOCK_SPECIES ||--o{ LIVESTOCK_GROUPS : "typed by"
    FARMS ||--o{ LIVESTOCK_GROUPS : "hosts"
    LIVESTOCK_GROUPS ||--o{ LIVESTOCK_BATCHES : "runs batches"
    LIVESTOCK_BATCHES ||--o{ LIVESTOCK_EVENTS : "count events"
    LIVESTOCK_BATCHES ||--o{ LIVESTOCK_HEALTH : "health events"
    LIVESTOCK_BATCHES ||--o{ LIVESTOCK_FEED : "feed consumption"
    LIVESTOCK_BATCHES ||--o{ LIVESTOCK_SALES : "sales"
    INVENTORY_ITEMS ||--o{ LIVESTOCK_FEED : "feed items"

    LIVESTOCK_BATCHES {
        uuid id PK
        text code "BROILER-001"
        int initial_count
        date arrival_date
        int current_count "trigger-maintained"
        numeric avg_weight_kg
        text status
    }
    LIVESTOCK_EVENTS {
        uuid id PK
        text event_type "arrival|death|sale|transfer|birth|cull|weighing"
        int quantity
        numeric total_weight_kg
        text cause_category
        text notes
    }
```

## 5. Inventory & Procurement

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ INVENTORY_CATEGORIES : "categories"
    ORGANIZATIONS ||--o{ INVENTORY_ITEMS : "items"
    INVENTORY_CATEGORIES ||--o{ INVENTORY_ITEMS : "classified"
    FARMS ||--o{ INVENTORY_LOCATIONS : "stores"
    INVENTORY_ITEMS ||--o{ INVENTORY_MOVEMENTS : "ledger"
    INVENTORY_LOCATIONS ||--o{ INVENTORY_MOVEMENTS : "at location"
    SUPPLIERS ||--o{ PURCHASE_REQUESTS : "requested from"
    SUPPLIERS ||--o{ PURCHASE_ORDERS : "ordered from"
    PURCHASE_REQUESTS ||--o{ PURCHASE_ORDERS : "approved to"
    PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : "received"
    GOODS_RECEIPTS ||--o{ INVENTORY_MOVEMENTS : "stock in"
    PURCHASE_ORDERS ||--o{ SUPPLIER_INVOICES : "invoiced"
    SUPPLIER_INVOICES ||--o{ PAYMENTS : "settled"

    INVENTORY_MOVEMENTS {
        uuid id PK
        uuid item_id FK
        text movement_type "opening|purchase|transfer_in|transfer_out|consumption|adjustment|loss|sale"
        numeric quantity "signed by type"
        numeric unit_cost
        uuid organization_id FK
    }
```

## 6. Finance & Accounting

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ ACCOUNTS : "chart of accounts"
    ORGANIZATIONS ||--o{ FINANCIAL_ACCOUNTS : "cash|bank|mobile_money"
    JOURNAL_ENTRIES ||--o{ JOURNAL_LINES : "balanced lines"
    ACCOUNTS ||--o{ JOURNAL_LINES : "posted to"
    ORGANIZATIONS ||--o{ EXPENSES : "expenses"
    ORGANIZATIONS ||--o{ REVENUES : "revenues"
    EXPENSES ||--o{ COST_ALLOCATIONS : "allocates"
    PLOTS ||--o{ COST_ALLOCATIONS : "to plot"
    CROP_SEASONS ||--o{ COST_ALLOCATIONS : "to season"
    LIVESTOCK_BATCHES ||--o{ COST_ALLOCATIONS : "to batch"
    EQUIPMENT ||--o{ COST_ALLOCATIONS : "to equipment"
    REVENUES ||--o{ SALES : "from sales"
    CUSTOMERS ||--o{ SALES : "buys"
    SALES ||--o{ SALE_ITEMS : "lines"
    SALES ||--o{ PAYMENTS : "receipts"

    JOURNAL_ENTRIES {
        uuid id PK
        date entry_date
        text entry_type "purchase|sale|payment|reversal|adjustment|opening"
        uuid reversal_of_id FK "self"
        text status "draft|posted"
    }
    COST_ALLOCATIONS {
        uuid id PK
        uuid source_expense_id FK
        text target_type "farm|plot|crop_season|livestock_batch|activity|equipment|department"
        uuid target_id
        numeric amount
    }
```

## 7. Operations Support (labor, equipment, irrigation, weather, tasks…)

```mermaid
erDiagram
    FARMS ||--o{ WORKERS : "employs"
    WORKERS ||--o{ LABOR_RECORDS : "works"
    CROP_SEASONS ||--o{ LABOR_RECORDS : "on crop"
    FARMS ||--o{ EQUIPMENT : "owns"
    EQUIPMENT ||--o{ EQUIPMENT_USAGE : "hours/fuel"
    EQUIPMENT ||--o{ MAINTENANCE_RECORDS : "serviced"
    FARMS ||--o{ WATER_SOURCES : "wells|tanks|rivers"
    WATER_SOURCES ||--o{ IRRIGATION_ZONES : "feeds"
    IRRIGATION_ZONES ||--o{ IRRIGATION_RECORDS : "events"
    FARMS ||--o{ WEATHER_FORECASTS : "per farm"
    FARMS ||--o{ WEATHER_OBSERVATIONS : "history"
    FARMS ||--o{ TASKS : "field tasks"
    PROFILES ||--o{ TASKS : "assigned"
    ORGANIZATIONS ||--o{ DOCUMENTS : "files"
    ORGANIZATIONS ||--o{ NOTIFICATIONS : "alerts"
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "audit trail"
    ORGANIZATIONS ||--o{ SYNC_OPERATIONS : "device sync"
    FARMS ||--o{ STORAGE_FACILITIES : "stores"
    STORAGE_FACILITIES ||--o{ STORAGE_RECORDS : "stock in/out/loss"
    ORGANIZATIONS ||--o{ MARKET_PRICES : "market info"
    CUSTOMERS ||--o{ SALES : "see §6"
```

## 8. AI / Knowledge (RAG)

```mermaid
erDiagram
    KNOWLEDGE_SOURCES ||--o{ KNOWLEDGE_DOCUMENTS : "publishes"
    KNOWLEDGE_DOCUMENTS ||--o{ KNOWLEDGE_CHUNKS : "chunked + embedded"
    PROFILES ||--o{ AI_QUERIES : "asks"
    AI_QUERIES ||--|| AI_RESPONSES : "answered by"
    AI_RESPONSES ||--o{ AI_CITATIONS : "cites"
    AI_RESPONSES ||--o{ KNOWLEDGE_CHUNKS : "retrieved evidence"
    AI_CITATIONS ||--o{ AUDIT-able farm entities : "farm-data evidence refs"
```

## 9. Full Table Inventory

Identity: `profiles, organizations, organization_members, farm_members, invitations, platform_admins, roles, role_permissions`
Farms/GIS: `farms, farm_boundaries_versions, farm_settings, plots, plot_history, plot_soil_records, map_features`
Crops: `seasons, crops, crop_varieties, crop_seasons, crop_activities, crop_inputs, harvests`
Livestock: `livestock_species, livestock_groups, livestock_batches, livestock_events, livestock_health, livestock_feed, livestock_sales`
Inventory/Procurement: `inventory_categories, inventory_items, inventory_locations, inventory_movements, suppliers, purchase_requests, purchase_order_items, purchase_orders, goods_receipt_items, goods_receipts, supplier_invoices`
Finance: `accounts, financial_accounts, journal_entries, journal_lines, payments, expenses, revenues, cost_allocations`
Ops: `workers, labor_records, equipment, equipment_usage, maintenance_records, water_sources, irrigation_zones, irrigation_records, soil_records (plot_soil_records), storage_facilities, storage_records`
Market/Sales: `customers, sales, sale_items, market_prices`
Platform/Field: `documents, tasks, task_updates, notifications, notification_preferences, audit_logs, sync_operations`
Weather/External: `weather_observations, weather_forecasts, weather_alerts, satellite_scenes (pending), provider_sync_state`
AI: `knowledge_sources, knowledge_documents, knowledge_chunks, ai_queries, ai_responses, ai_citations`
SaaS: `plans, subscriptions, usage_records`
