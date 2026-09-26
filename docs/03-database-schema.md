# 03 — Complete Database Schema (PostgreSQL / PostGIS DDL)

This document is the complete target schema reference. The deployed schema is
evolved through numbered files in `db/migrations/` using
`npm run db:migrate`; review those files before changing production.
Conventions (see `04-data-dictionary.md`): UUID PKs; `timestamptz` timestamps
defaulting `now()`; `created_by uuid` where meaningful; `numeric(18,4)` money +
ISO currency; `geometry(...,4326)` spatial columns with GiST indexes; soft
delete (`deleted_at`) only where listed; RLS on every tenant table per
`05-security-model.md`.

```sql
-- =====================================================================
-- 0. EXTENSIONS & COMMON INFRASTRUCTURE
-- =====================================================================
create extension if not exists postgis;
create extension if not exists pgvector;
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- updated_at maintenance
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Common column macros are inlined per table below (Postgres has no DDL macros).

-- Enum-like domains kept as lookup tables (extensible per tenant/market),
-- with CHECK constraints for hard invariants.

-- =====================================================================
-- 1. IDENTITY & TENANCY
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth."user"(id) on delete cascade,
  full_name text not null default '',
  phone text,
  locale text not null default 'en' check (locale in ('en','sw')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  country char(2),                          -- ISO 3166-1 alpha-2, e.g. 'TZ'
  default_currency char(3) not null default 'TZS',
  timezone text not null default 'Africa/Dar_es_Salaam',
  status text not null default 'active' check (status in ('active','suspended','cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','accountant',
      'agronomist','veterinarian','inventory_manager','worker','viewer')),
  status text not null default 'active' check (status in ('active','invited','suspended')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.farm_members (
  farm_id uuid not null,                     -- FK added after farms (§2)
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,                        -- same role set; validated via FK-trigger later
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id),
  email text not null,
  role text not null,
  token text not null unique,
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level text not null default 'admin' check (level in ('admin','support')),
  created_at timestamptz not null default now()
);

create table public.roles (              -- reserved for granular model (Phase 12+)
  code text primary key,
  name text not null,
  scope text not null check (scope in ('organization','farm','platform'))
);
create table public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_key text not null,            -- e.g. 'inventory.adjust'
  allowed boolean not null default true,
  primary key (role_code, permission_key)
);

-- =====================================================================
-- 2. FARMS & GIS
-- =====================================================================
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  description text,
  farm_type text not null default 'mixed'
    check (farm_type in ('crop','livestock','mixed','aquaculture','agroforestry')),
  ownership_type text check (ownership_type in ('owned','leased','customary','shared','managed')),
  country char(2) not null default 'TZ',
  region text, district text, ward text, village text, address text,
  boundary geometry(Polygon,4326),          -- final boundary (latest approved)
  boundary_source text check (boundary_source in ('gps_walk','manual_draw','geojson_import','kml_import','survey')),
  area_m2 numeric(14,2) generated always as
    (case when boundary is null then null
     else ST_Area(boundary::geography) end) stored,
  centroid geography(Point,4326) generated always as
    (case when boundary is null then null else ST_Centroid(boundary)::geography end) stored,
  elevation_m numeric(8,2),
  currency char(3) not null default 'TZS',  -- operational currency; falls back to org
  timezone text not null default 'Africa/Dar_es_Salaam',
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index farms_org_idx on public.farms (organization_id) where status='active';
create index farms_boundary_gix on public.farms using gist (boundary);
alter table public.farm_members
  add constraint farm_members_farm_fk foreign key (farm_id) references public.farms(id) on delete cascade;
alter table public.farm_members
  add constraint farm_members_role_chk check (role in ('owner','admin','manager','accountant',
      'agronomist','veterinarian','inventory_manager','worker','viewer'));

create table public.farm_boundary_versions (     -- immutable history of boundary edits
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  boundary geometry(Polygon,4326) not null,
  source text not null,
  raw_gps_points jsonb,                     -- original trace for audit
  point_count int, accuracy_summary jsonb,  -- {median_accuracy_m, max_accuracy_m}
  area_m2 numeric(14,2) not null, perimeter_m numeric(14,2) not null,
  validation jsonb,                         -- validator results
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index fbv_farm_idx on public.farm_boundary_versions (farm_id, created_at desc);
create index fbv_gix on public.farm_boundary_versions using gist (boundary);

create table public.farm_settings (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,  -- layer prefs, units (acres/ha), defaults
  updated_at timestamptz not null default now()
);

create table public.plots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  code text not null,                       -- 'A01' (unique per farm)
  name text,
  level text not null default 'plot' check (level in ('block','plot','subplot')),
  parent_plot_id uuid references public.plots(id),
  boundary geometry(Polygon,4326),
  area_m2 numeric(14,2) generated always as
    (case when boundary is null then null else ST_Area(boundary::geography) end) stored,
  soil_summary jsonb,                       -- latest key soil values (denormalized cache)
  status text not null default 'active'
    check (status in ('active','fallow','reserved','retired')),
  current_crop_season_id uuid,              -- FK added after crop_seasons
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (farm_id, code)
);
create index plots_farm_idx on public.plots (farm_id) where deleted_at is null;
create index plots_boundary_gix on public.plots using gist (boundary);

create table public.plot_history (           -- rotation & lifecycle history (append-only)
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  crop_season_id uuid references public.crop_seasons(id),
  crop_id uuid references public.crops(id),
  year int not null,
  season_label text,                        -- '2026 Main Season'
  event text not null check (event in ('planted','harvested','fallow','amended','note')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.plot_soil_records (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_date date not null,
  ph numeric(4,2), nitrogen_ppm numeric(8,2), phosphorus_ppm numeric(8,2),
  potassium_ppm numeric(8,2), organic_matter_pct numeric(5,2),
  texture text, moisture_pct numeric(5,2),
  lab_report_url text,                      -- documents.id or storage path
  source text not null default 'lab_report' check (source in ('lab_report','field_test','sensor')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index psr_plot_idx on public.plot_soil_records (plot_id, record_date desc);

create table public.map_features (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  feature_type text not null check (feature_type in
    ('building','road','water_source','well','irrigation_line','storage','animal_housing',
     'greenhouse','tree_stand','field','drainage','fence','electric')),
  name text,
  geom geometry(Geometry,4326) not null,    -- point/line/polygon per type
  properties jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index map_features_farm_idx on public.map_features (farm_id, feature_type) where deleted_at is null;
create index map_features_gix on public.map_features using gist (geom);

-- =====================================================================
-- 3. CROPS
-- =====================================================================
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,                       -- '2026 Main Season'
  start_date date not null, end_date date,
  status text not null default 'planned' check (status in ('planned','active','closed')),
  created_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table public.crops (                  -- org-level catalog (seedable from global list)
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,                       -- 'Maize'
  crop_type text not null default 'cereal'
    check (crop_type in ('cereal','legume','vegetable','fruit','tuber','fiber','cash','forage','other')),
  default_unit text not null default 'kg',
  expected_duration_days int,
  global_ref text,                          -- links to platform global catalog when seeded
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.crop_varieties (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,                       -- 'H614'
  maturity_days int,
  notes text,
  created_at timestamptz not null default now(),
  unique (crop_id, name)
);

create table public.crop_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  plot_id uuid not null references public.plots(id),
  crop_id uuid not null references public.crops(id),
  variety_id uuid references public.crop_varieties(id),
  season_id uuid references public.seasons(id),
  code text,                                -- 'MAIZE-A01-2026'
  planting_date date not null,
  expected_harvest_date date,
  actual_harvest_date date,
  target_yield_kg numeric(12,2),
  seed_quantity numeric(12,3), seed_unit text default 'kg', seed_cost numeric(18,4),
  status text not null default 'planned'
    check (status in ('planned','planted','growing','harvesting','completed','failed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_harvest_date is null or expected_harvest_date >= planting_date)
);
create index crop_seasons_plot_idx on public.crop_seasons (plot_id, planting_date desc);
create index crop_seasons_org_idx on public.crop_seasons (organization_id, status);

create table public.crop_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  crop_season_id uuid not null references public.crop_seasons(id) on delete cascade,
  activity_type text not null check (activity_type in
    ('land_preparation','ploughing','planting','fertilization','weeding','spraying',
     'irrigation','pest_control','disease_observation','pruning','harvest','other')),
  activity_date date not null,
  performed_by uuid references public.workers(id),
  quantity numeric(12,3), unit text,        -- e.g. 50 kg fertilizer
  cost numeric(18,4) default 0,
  location geography(Point,4326),
  notes text,
  attachments jsonb not null default '[]'::jsonb,  -- [{documents.id, kind:'photo'}]
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index crop_activities_season_idx on public.crop_activities (crop_season_id, activity_date);
create index crop_activities_org_idx on public.crop_activities (organization_id, activity_date desc);

create table public.crop_inputs (            -- materials consumed by an activity
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.crop_activities(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id),
  input_name text not null,                 -- free text if not from stock
  quantity numeric(12,3) not null, unit text not null,
  unit_cost numeric(18,4), total_cost numeric(18,4),
  movement_id uuid references public.inventory_movements(id), -- stock linkage
  created_at timestamptz not null default now()
);

create table public.harvests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  crop_season_id uuid not null references public.crop_seasons(id) on delete cascade,
  harvest_date date not null,
  quantity numeric(12,3) not null, unit text not null default 'kg',
  quality_grade text, moisture_pct numeric(5,2),
  storage_facility_id uuid references public.storage_facilities(id),
  labor_cost numeric(18,4) default 0, other_cost numeric(18,4) default 0,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index harvests_season_idx on public.harvests (crop_season_id, harvest_date);
alter table public.plots
  add constraint plots_current_season_fk foreign key (current_crop_season_id)
  references public.crop_seasons(id);

-- =====================================================================
-- 4. LIVESTOCK
-- =====================================================================
create table public.livestock_species (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,                -- 'Cattle','Goats','Broilers','Fish'
  category text not null check (category in ('mammal','poultry','fish','other')),
  default_unit text not null default 'head'
);

create table public.livestock_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  species_id uuid not null references public.livestock_species(id),
  name text not null,                       -- 'Broilers', 'Dairy Cattle'
  purpose text not null default 'meat' check (purpose in ('meat','eggs','milk','breeding','other')),
  created_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table public.livestock_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  group_id uuid not null references public.livestock_groups(id),
  code text not null,                       -- 'BROILER-001'
  initial_count int not null check (initial_count > 0),
  current_count int not null default 0,     -- maintained by trigger from events
  arrival_date date not null,
  expected_exit_date date,
  avg_weight_kg numeric(8,3),               -- latest weighing (denormalized)
  status text not null default 'active'
    check (status in ('planned','active','completed','closed')),
  housing_map_feature_id uuid references public.map_features(id),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, code)
);
create index livestock_batches_org_idx on public.livestock_batches (organization_id, status);

create table public.livestock_events (       -- append-only count/movement events
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  event_type text not null check (event_type in
    ('arrival','death','sale','transfer_out','transfer_in','birth','cull','count_correction','weighing')),
  event_date date not null,
  quantity int not null,                    -- positive; direction inferred from type
  total_weight_kg numeric(12,3),
  cause_category text,                      -- mortality cause taxonomy (org-defined)
  cause_notes text,
  cost numeric(18,4) default 0,             -- e.g. purchase cost on arrival
  revenue numeric(18,4) default 0,          -- e.g. sale proceeds (journal-linked)
  attachments jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index livestock_events_batch_idx on public.livestock_events (batch_id, event_date);

create table public.livestock_health (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  event_date date not null,
  record_type text not null check (record_type in
    ('vaccination','medication','disease_observation','vet_visit','symptom','treatment')),
  product_name text, dosage text,           -- recorded as administered; system never prescribes
  administered_by text, veterinarian_name text,
  withdrawal_days int,
  symptoms text, diagnosis_notes text,       -- informational; not a diagnosis by the system
  inventory_item_id uuid references public.inventory_items(id), -- medicine from stock
  cost numeric(18,4) default 0,
  attachments jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.livestock_feed (         -- feed consumption per batch
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  feed_date date not null,
  feed_type text not null,                  -- 'starter','grower','finisher','hay','custom'
  inventory_item_id uuid references public.inventory_items(id),
  quantity_kg numeric(12,3) not null,
  unit_cost numeric(18,4), total_cost numeric(18,4),
  movement_id uuid references public.inventory_movements(id),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.livestock_sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  event_id uuid not null references public.livestock_events(id), -- the 'sale' event
  customer_id uuid references public.customers(id),
  sale_date date not null,
  quantity int not null, avg_weight_kg numeric(8,3),
  unit_price numeric(18,4), total_revenue numeric(18,4),
  sale_id uuid references public.sales(id), -- full sales doc linkage
  created_at timestamptz not null default now()
);

-- Batch current_count maintenance trigger (also validates non-negative)
create or replace function public.maintain_batch_count() returns trigger
language plpgsql as $$
declare v_delta int; v_new int;
begin
  v_delta := case new.event_type
    when 'arrival' then new.quantity when 'transfer_in' then new.quantity
    when 'birth' then new.quantity
    else -new.quantity end;                  -- death, sale, transfer_out, cull
  if new.event_type = 'count_correction' then
    v_delta := new.quantity - (select coalesce(sum(case e.event_type
        when 'arrival' then e.quantity when 'transfer_in' then e.quantity when 'birth' then e.quantity
        else -e.quantity end),0) from public.livestock_events e
      where e.batch_id = new.batch_id and e.id <> new.id and e.event_type <> 'count_correction');
  end if;
  select current_count into v_new from public.livestock_batches where id = new.batch_id for update;
  v_new := v_new + v_delta;
  if v_new < 0 then raise exception 'Batch count cannot go negative (batch %)', new.batch_id; end if;
  update public.livestock_batches set current_count = v_new where id = new.batch_id;
  return new;
end $$;
create trigger livestock_events_count before insert on public.livestock_events
  for each row execute function public.maintain_batch_count();

-- =====================================================================
-- 5. INVENTORY & PROCUREMENT
-- =====================================================================
create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,   -- Seeds, Fertilizer, Chemicals, Feed, Medicine, Fuel, Tools, Spare parts, Packaging, Other
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null references public.inventory_categories(id),
  name text not null,
  sku text,
  base_unit text not null,                  -- kg, l, bag, piece, box, ton
  unit_conversions jsonb not null default '[]'::jsonb, -- [{from:'bag',to:'kg',factor:50}]
  unit_cost_avg numeric(18,4) default 0,    -- moving average cost (trigger-maintained)
  min_stock numeric(12,3) default 0,        -- low-stock alert threshold (base unit)
  current_stock numeric(14,3) not null default 0, -- cached; movements are source of truth
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index inventory_items_org_idx on public.inventory_items (organization_id) where is_active;

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  name text not null,                       -- 'Main Store'
  location_type text not null default 'store'
    check (location_type in ('store','warehouse','cold_room','silo','field','vehicle')),
  map_feature_id uuid references public.map_features(id),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.inventory_movements (    -- append-only ledger
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id),
  location_id uuid not null references public.inventory_locations(id),
  counter_location_id uuid references public.inventory_locations(id), -- transfers
  movement_type text not null check (movement_type in
    ('opening','purchase','transfer_in','transfer_out','consumption','adjustment','loss','sale')),
  quantity numeric(14,3) not null check (quantity > 0), -- sign applied by type trigger
  unit_cost numeric(18,4),
  total_cost numeric(18,4),
  balance_after numeric(14,3),              -- cached running balance per item
  reference_type text, reference_id uuid,   -- goods_receipt|crop_input|livestock_feed|sale|task
  reason text,                              -- required for adjustment/loss
  movement_date date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index inv_mov_item_idx on public.inventory_movements (item_id, movement_date, created_at);
create index inv_mov_org_idx on public.inventory_movements (organization_id, movement_date desc);
create index inv_mov_ref_idx on public.inventory_movements (reference_type, reference_id);

-- stock balance trigger: update cached stock, forbid negative, recompute avg cost on inbound
create or replace function public.apply_movement() returns trigger
language plpgsql as $$
declare v_signed numeric; v_stock numeric; v_new_stock numeric;
begin
  v_signed := case new.movement_type
    when 'opening' then new.quantity when 'purchase' then new.quantity
    when 'transfer_in' then new.quantity
    else -new.quantity end;
  select current_stock into v_stock from public.inventory_items where id = new.item_id for update;
  v_new_stock := v_stock + v_signed;
  if v_new_stock < 0 then raise exception 'Insufficient stock for item %', new.item_id; end if;
  update public.inventory_items set current_stock = v_new_stock where id = new.item_id;
  if new.movement_type in ('opening','purchase') and new.unit_cost is not null then
    update public.inventory_items set
      unit_cost_avg = round(((v_stock * unit_cost_avg) + (new.quantity * new.unit_cost))
                    / nullif(v_stock + new.quantity,0), 4)
    where id = new.item_id;
  end if;
  new.balance_after := v_new_stock;
  return new;
end $$;
create trigger inventory_movements_apply before insert on public.inventory_movements
  for each row execute function public.apply_movement();
-- append-only
create trigger inventory_movements_immutable before update or delete on public.inventory_movements
  for each row execute function public.forbid_mutation();

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, contact_person text, phone text, email text,
  address text, tax_id text, payment_terms text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  item_id uuid references public.inventory_items(id),
  item_name text not null, quantity numeric(14,3) not null, unit text not null,
  estimated_cost numeric(18,4), justification text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','converted','cancelled')),
  approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  po_number text not null,
  supplier_id uuid not null references public.suppliers(id),
  request_id uuid references public.purchase_requests(id),
  order_date date not null, expected_delivery date,
  currency char(3) not null, fx_rate numeric(14,6) default 1,
  subtotal numeric(18,4), tax numeric(18,4), total numeric(18,4),
  status text not null default 'open'
    check (status in ('draft','open','partially_received','received','closed','cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, po_number)
);
create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid references public.inventory_items(id),
  description text not null, quantity numeric(14,3) not null, unit text not null,
  unit_price numeric(18,4), line_total numeric(18,4),
  received_quantity numeric(14,3) not null default 0
);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  po_id uuid not null references public.purchase_orders(id),
  receipt_date date not null,
  location_id uuid not null references public.inventory_locations(id),
  received_by uuid not null references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);
create table public.goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.goods_receipts(id) on delete cascade,
  po_item_id uuid not null references public.purchase_order_items(id),
  quantity numeric(14,3) not null check (quantity > 0),
  movement_id uuid references public.inventory_movements(id) -- stock-in ledger entry
);

create table public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  po_id uuid references public.purchase_orders(id),
  invoice_number text not null,
  invoice_date date not null, due_date date,
  currency char(3) not null, fx_rate numeric(14,6) default 1,
  subtotal numeric(18,4), tax numeric(18,4), total numeric(18,4),
  amount_paid numeric(18,4) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid','void')),
  document_id uuid references public.documents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_id, invoice_number)
);

-- =====================================================================
-- 6. FINANCE & ACCOUNTING
-- =====================================================================
create table public.accounts (               -- chart of accounts
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,                       -- '1000'
  name text not null,                       -- 'Cash — Mobile Money'
  account_type text not null check (account_type in
    ('asset','liability','equity','revenue','expense')),
  subtype text,                             -- 'cash','bank','mobile_money','inventory','receivable','payable','loan','owner_equity','cogs','labor',...
  parent_id uuid references public.accounts(id),
  is_system boolean not null default false, -- seeded template accounts not deletable
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.financial_accounts (     -- real-world money accounts
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  account_kind text not null check (account_kind in ('cash','bank','mobile_money')),
  gl_account_id uuid not null references public.accounts(id),
  institution text, account_number_masked text,  -- never store full account numbers
  currency char(3) not null default 'TZS',
  opening_balance numeric(18,4) not null default 0,
  current_balance numeric(18,4) not null default 0, -- trigger-maintained from payments
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.journal_entries (        -- append-only when posted
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_number text not null,
  entry_date date not null,
  entry_type text not null check (entry_type in
    ('purchase','sale','payment','receipt','payroll','reversal','adjustment','opening','transfer')),
  reference_type text, reference_id uuid,   -- source doc (expense|revenue|payment|...)
  memo text,
  currency char(3) not null, fx_rate numeric(14,6) default 1,
  status text not null default 'draft' check (status in ('draft','posted','void')),
  reversal_of_id uuid references public.journal_entries(id),
  posted_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, entry_number)
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  debit numeric(18,4) not null default 0 check (debit >= 0),
  credit numeric(18,4) not null default 0 check (credit >= 0),
  line_memo text,
  check (debit = 0 or credit = 0)           -- one side only
);
-- balanced-entry + immutability triggers
create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$ begin
  raise exception '% is append-only', TG_TABLE_NAME; end $$;

create or replace function public.assert_balanced_entry() returns trigger
language plpgsql as $$
declare v_dr numeric; v_cr numeric; v_status text;
begin
  select status into v_status from public.journal_entries where id = new.journal_entry_id;
  if v_status = 'posted' then
    select coalesce(sum(debit),0), coalesce(sum(credit),0) into v_dr, v_cr
      from public.journal_lines where journal_entry_id = new.journal_entry_id;
    if v_dr <> v_cr then raise exception 'Journal entry not balanced: % <> %', v_dr, v_cr; end if;
  end if;
  return new;
end $$;
create constraint trigger journal_lines_balance after insert or update on public.journal_lines
  deferrable initially deferred for each row execute function public.assert_balanced_entry();
create trigger journal_lines_immutable before update or delete on public.journal_lines
  for each row execute function public.forbid_mutation();
create trigger journal_entries_immutable before update or delete on public.journal_entries
  for each row when (old.status = 'posted') execute function public.forbid_mutation();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  expense_date date not null,
  category text not null,                   -- operational taxonomy
  description text not null,
  amount numeric(18,4) not null, currency char(3) not null, fx_rate numeric(14,6) default 1,
  amount_base numeric(18,4) generated always as (amount * fx_rate) stored,
  payment_method text check (payment_method in ('cash','bank','mobile_money','credit','other')),
  financial_account_id uuid references public.financial_accounts(id),
  supplier_id uuid references public.suppliers(id),
  journal_entry_id uuid references public.journal_entries(id),
  document_id uuid references public.documents(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_org_idx on public.expenses (organization_id, expense_date desc);

create table public.revenues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  revenue_date date not null,
  source_type text not null check (source_type in ('crop_sale','livestock_sale','other_sale','grant','other')),
  description text,
  amount numeric(18,4) not null, currency char(3) not null, fx_rate numeric(14,6) default 1,
  amount_base numeric(18,4) generated always as (amount * fx_rate) stored,
  financial_account_id uuid references public.financial_accounts(id),
  sale_id uuid references public.sales(id),
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.cost_allocations (       -- links costs to profitability targets
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check (source_type in
    ('expense','journal_line','labor_record','inventory_consumption','equipment_usage','other')),
  source_id uuid not null,
  target_type text not null check (target_type in
    ('farm','plot','crop_season','livestock_batch','activity','equipment','department')),
  target_id uuid not null,
  amount numeric(18,4) not null check (amount > 0),
  currency char(3) not null,
  allocation_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index cost_alloc_target_idx on public.cost_allocations (target_type, target_id);
create index cost_alloc_source_idx on public.cost_allocations (source_type, source_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_date date not null,
  direction text not null check (direction in ('out','in')),
  method text not null check (method in ('cash','bank','mobile_money','other')),
  financial_account_id uuid references public.financial_accounts(id),
  amount numeric(18,4) not null, currency char(3) not null, fx_rate numeric(14,6) default 1,
  -- exactly one target (relaxed check for 'other'):
  supplier_invoice_id uuid references public.supplier_invoices(id),
  sale_id uuid references public.sales(id),
  loan_id uuid references public.loans(id),
  journal_entry_id uuid references public.journal_entries(id),
  reference text,                            -- transaction ref (mobile money code)
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lender text not null, principal numeric(18,4) not null, currency char(3) not null,
  interest_rate numeric(6,3), start_date date not null, due_date date,
  status text not null default 'active' check (status in ('active','repaid','defaulted','written_off')),
  notes text, created_at timestamptz not null default now()
);

create table public.owner_transactions (     -- owner contributions & withdrawals (equity)
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tx_date date not null,
  direction text not null check (direction in ('contribution','withdrawal')),
  amount numeric(18,4) not null, currency char(3) not null,
  financial_account_id uuid references public.financial_accounts(id),
  notes text, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 7. LABOR, EQUIPMENT, IRRIGATION, STORAGE
-- =====================================================================
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  full_name text not null,
  worker_type text not null check (worker_type in ('employee','casual','contractor')),
  phone text, national_id_masked text,
  default_rate numeric(18,4), rate_unit text check (rate_unit in ('hour','day','piece','month')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workers_org_idx on public.workers (organization_id) where is_active;

create table public.labor_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  worker_id uuid not null references public.workers(id),
  work_date date not null,
  task_description text not null,
  hours numeric(8,2), pieces numeric(12,3),
  rate numeric(18,4), total_cost numeric(18,4) not null,
  crop_season_id uuid references public.crop_seasons(id),
  plot_id uuid references public.plots(id),
  activity_id uuid references public.crop_activities(id),
  batch_id uuid references public.livestock_batches(id),
  equipment_id uuid references public.equipment(id),
  task_id uuid references public.tasks(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index labor_org_date_idx on public.labor_records (organization_id, work_date desc);
create index labor_season_idx on public.labor_records (crop_season_id);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  name text not null,
  equipment_type text not null,             -- tractor, vehicle, pump, generator, sprayer, plough, harvester, other
  acquisition_date date, purchase_cost numeric(18,4),
  status text not null default 'operational'
    check (status in ('operational','under_maintenance','broken','retired')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.equipment_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  usage_date date not null,
  hours numeric(8,2), fuel_liters numeric(10,3),
  operator_id uuid references public.workers(id),
  plot_id uuid references public.plots(id),
  activity_id uuid references public.crop_activities(id),
  estimated_cost numeric(18,4) default 0,   -- fuel+maintenance share, allocated
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  maintenance_date date not null,
  maintenance_type text not null check (maintenance_type in ('routine','repair','inspection')),
  description text, cost numeric(18,4) default 0,
  expense_id uuid references public.expenses(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.water_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('well','borehole','river','dam','tank','rain_harvest','municipal')),
  geom geography(Point,4326), capacity numeric(12,3), unit text default 'l',
  map_feature_id uuid references public.map_features(id),
  created_at timestamptz not null default now()
);
create table public.irrigation_zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  water_source_id uuid references public.water_sources(id),
  name text not null, method text check (method in ('drip','sprinkler','furrow','flood','manual')),
  plots uuid[] default '{}',                 -- or join table in Phase 6 if many-to-many grows
  created_at timestamptz not null default now()
);
create table public.irrigation_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  zone_id uuid references public.irrigation_zones(id),
  plot_id uuid references public.plots(id),
  irrigation_date date not null,
  duration_minutes int, water_quantity numeric(12,3), unit text default 'l',
  energy_cost numeric(18,4) default 0,       -- fuel/electricity
  activity_id uuid references public.crop_activities(id),
  notes text, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.storage_facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  facility_type text not null check (facility_type in ('warehouse','store','cold_room','silo','shed','other')),
  capacity numeric(12,3), unit text,
  map_feature_id uuid references public.map_features(id),
  created_at timestamptz not null default now()
);
create table public.storage_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.storage_facilities(id) on delete cascade,
  record_date date not null,
  product text not null,                    -- or crop/harvest FK in Phase 11 refinement
  quantity_in numeric(12,3) default 0, quantity_out numeric(12,3) default 0,
  loss_quantity numeric(12,3) default 0, spoilage_quantity numeric(12,3) default 0,
  unit text not null, reason text,
  harvest_id uuid references public.harvests(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 8. SALES, CUSTOMERS, MARKET DATA
-- =====================================================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, phone text, email text, address text,
  customer_type text check (customer_type in ('individual','business','cooperative','broker')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  sale_number text not null,
  customer_id uuid references public.customers(id),
  sale_date date not null,
  currency char(3) not null, fx_rate numeric(14,6) default 1,
  subtotal numeric(18,4), discount numeric(18,4) default 0, tax numeric(18,4) default 0,
  total numeric(18,4) not null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','delivered','cancelled')),
  revenue_id uuid references public.revenues(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sale_number)
);
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_type text not null check (product_type in ('harvest','livestock','inventory_item','other')),
  harvest_id uuid references public.harvests(id),
  batch_id uuid references public.livestock_batches(id),
  item_id uuid references public.inventory_items(id),
  description text not null,
  quantity numeric(14,3) not null, unit text not null,
  unit_price numeric(18,4) not null, line_total numeric(18,4) not null,
  movement_id uuid references public.inventory_movements(id) -- stock-out when inventory-backed
);

create table public.market_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product text not null,                    -- 'Maize'
  market text not null,                     -- 'Dar es Salaam'
  price_date date not null,
  price numeric(18,4) not null, unit text not null,  -- 'TSh/kg'
  currency char(3) not null,
  source text not null check (source in ('manual','api','import')), -- never fabricated
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, product, market, price_date, unit, source)
);

-- =====================================================================
-- 9. TASKS, DOCUMENTS, NOTIFICATIONS
-- =====================================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  title text not null,
  description text,
  plot_id uuid references public.plots(id),
  crop_season_id uuid references public.crop_seasons(id),
  batch_id uuid references public.livestock_batches(id),
  assigned_to uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  due_date date, priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','done','cancelled')),
  completion jsonb,                          -- {time_spent, materials:[...], photos:[...], notes}
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks (assigned_to, status) where status in ('open','in_progress');
create index tasks_farm_idx on public.tasks (farm_id, due_date);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  name text not null,
  doc_type text not null check (doc_type in
    ('invoice','receipt','soil_report','vet_report','purchase_doc','contract','land_doc','certificate','photo','other')),
  storage_path text not null,               -- 'org/{org_id}/...' private bucket
  mime_type text, size_bytes bigint,
  entity_type text, entity_id uuid,         -- link to any business record
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index documents_org_idx on public.documents (organization_id, created_at desc);
create index documents_entity_idx on public.documents (entity_type, entity_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in
    ('low_inventory','weather_alert','overdue_task','mortality','payment_due','stock_expiry',
     'upcoming_harvest','maintenance','production_anomaly','system')),
  title text not null, body text,
  entity_type text, entity_id uuid,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc) where read_at is null;

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  channel text not null check (channel in ('in_app','email','sms','push')),
  enabled boolean not null default true,
  primary key (user_id, category, channel)
);

-- =====================================================================
-- 10. AUDIT & SYNC
-- =====================================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references public.profiles(id),
  actor_scope text not null default 'organization' check (actor_scope in ('organization','platform','system')),
  action text not null,                     -- 'livestock_events.update'
  entity_type text not null, entity_id uuid,
  before jsonb, after jsonb, reason text,
  ip inet, user_agent text,
  created_at timestamptz not null default now()
);
create index audit_org_idx on public.audit_logs (organization_id, created_at desc);
create index audit_entity_idx on public.audit_logs (entity_type, entity_id);
-- append-only:
revoke update, delete on public.audit_logs from authenticated, anon;

create table public.sync_operations (        -- offline outbox sync tracking
  id uuid primary key default gen_random_uuid(),      -- client idempotency key
  organization_id uuid not null references public.organizations(id) on delete cascade,
  device_id text not null,
  user_id uuid not null references public.profiles(id),
  entity_type text not null, payload jsonb not null,
  client_created_at timestamptz not null,
  server_applied_at timestamptz,            -- null = pending
  status text not null default 'pending'
    check (status in ('pending','applied','failed','duplicate')),
  error text,
  created_at timestamptz not null default now(),
  unique (id)
);

-- =====================================================================
-- 11. WEATHER, SATELLITE, PROVIDERS
-- =====================================================================
create table public.weather_observations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  observed_at timestamptz not null,
  provider text not null,                   -- adapter name
  temperature_c numeric(5,2), rainfall_mm numeric(7,2), humidity_pct numeric(5,2),
  wind_speed_kmh numeric(6,2), conditions text,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (farm_id, provider, observed_at)
);
create index weather_obs_farm_idx on public.weather_observations (farm_id, observed_at desc);

create table public.weather_forecasts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  forecast_date date not null,
  provider text not null,
  issued_at timestamptz not null default now(),
  temp_min_c numeric(5,2), temp_max_c numeric(5,2),
  rainfall_mm numeric(7,2), rainfall_probability_pct numeric(5,2),
  humidity_pct numeric(5,2), wind_speed_kmh numeric(6,2), conditions text,
  raw jsonb,
  unique (farm_id, provider, forecast_date, issued_at)
);
create index weather_fc_farm_idx on public.weather_forecasts (farm_id, forecast_date);

create table public.weather_alerts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_date date not null,
  alert_type text not null,                 -- heavy_rain, drought_risk, frost, wind
  severity text not null check (severity in ('info','warning','critical')),
  message text not null,
  provider text,
  acknowledged_at timestamptz, acknowledged_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.provider_sync_state (    -- adapter bookkeeping (weather/satellite/market)
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,                   -- 'weather.openweathermap','satellite.sentinel',...
  status text not null default 'pending' check (status in ('pending','active','error','disabled')),
  last_sync_at timestamptz, last_error text,
  config jsonb not null default '{}'::jsonb, -- non-secret provider config
  unique (organization_id, provider)
);

create table public.satellite_scenes (       -- reserved (Phase 7+, adapter pending)
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  capture_date date not null,
  provider text not null,
  scene_ref text not null,                  -- provider scene id / URL
  ndvi_stats jsonb,                         -- {min,max,mean} — only when truly computed
  geometry geometry(Geometry,4326),
  created_at timestamptz not null default now(),
  unique (farm_id, provider, scene_ref)
);

-- =====================================================================
-- 12. AI / KNOWLEDGE (RAG)
-- =====================================================================
create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- 'Ministry of Agriculture (Tanzania)'
  publisher_type text not null check (publisher_type in
    ('government','research_institution','university','fao','ngo','peer_reviewed','other')),
  url text, country char(2), language text not null default 'en',
  trust_level text not null default 'official' check (trust_level in ('official','recognized','reference')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  title text not null,
  publication_date date,
  url text, document_ref text,
  crops text[] default '{}', species text[] default '{}',
  country char(2), region text, topics text[] default '{}',
  content_hash text not null,
  ingested_at timestamptz not null default now(),
  unique (source_id, content_hash)
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),                   -- embedding model pinned in ai provider config
  topics text[] default '{}',
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table public.ai_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id),
  user_id uuid not null references public.profiles(id),
  question text not null,
  context_snapshot jsonb,                   -- which services/functions were invoked
  created_at timestamptz not null default now()
);
create table public.ai_responses (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null unique references public.ai_queries(id) on delete cascade,
  answer text not null,
  confidence text not null check (confidence in ('high','moderate','low','insufficient_evidence')),
  uncertainty_notes text,
  model text not null, prompt_tokens int, completion_tokens int,
  created_at timestamptz not null default now()
);
create table public.ai_citations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.ai_responses(id) on delete cascade,
  citation_kind text not null check (citation_kind in ('knowledge_chunk','farm_record','farm_aggregate')),
  knowledge_chunk_id uuid references public.knowledge_chunks(id),
  entity_type text, entity_id uuid, description text,
  snippet text,                             -- exact evidence text used
  url text
);

-- =====================================================================
-- 13. SUBSCRIPTIONS & SAAS
-- =====================================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                -- 'trial','starter','professional','business','enterprise'
  name text not null,
  limits jsonb not null default '{}'::jsonb -- {farms, hectares, users, storage_mb, ai_requests_month, analytics:bool}
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','cancelled','expired')),
  trial_ends_at timestamptz, current_period_start timestamptz, current_period_end timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null,                     -- 'farms','hectares','users','storage_mb','ai_requests'
  period date not null,                     -- month bucket
  value numeric(14,2) not null default 0,
  unique (organization_id, metric, period)
);

-- =====================================================================
-- 14. RLS ENABLEMENT (policies generated per 05-security-model.md §4;
--     scripts/gen-rls.ts emits per-table policy SQL from docs/06 matrix)
-- =====================================================================
-- Every tenant table: ENABLE + FORCE ROW LEVEL SECURITY with the canonical
-- select/insert/update policy pattern. Ledger/audit tables additionally:
revoke update, delete on public.journal_entries from authenticated;
revoke update, delete on public.journal_lines from authenticated;
revoke update, delete on public.inventory_movements from authenticated;
revoke update, delete on public.livestock_events from authenticated;
```

## Verification Notes

- All money arithmetic uses `numeric`, never `float`.
- `apply_movement` and `maintain_batch_count` use `FOR UPDATE` row locks to
  prevent concurrent-balance races.
- `balance_after`, `current_stock`, `current_count`, `current_balance` are
  **caches**; views `inventory_balances`, `batch_economics`,
  `plot_profitability` (Phase 5) recompute from ledgers as source of truth.
- See `04-data-dictionary.md` for column semantics and units.
