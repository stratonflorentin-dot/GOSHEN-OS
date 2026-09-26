-- =====================================================================
-- 0006_plots_operations.sql — Phase 6
--   §10 Plot management (closes the Phase-2 gap: `plots` never existed)
--   §22 Labor      §23 Equipment    §24 Irrigation    §25 Soil
--   §31 Storage (view over inventory)   §32 Tasks    §33 Documents
--   §19 Production records
--   + deferred foreign keys left dangling by 0003/0005
-- Neon / Lakebase Postgres edition.
-- =====================================================================

-- =====================================================================
-- §10  PLOTS  (blocks / plots / subplots)
-- =====================================================================
create table public.plots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  parent_plot_id uuid references public.plots(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 160),
  code text not null check (code ~ '^[A-Za-z0-9_-]{1,40}$'),
  plot_type text not null default 'plot' check (plot_type in ('block','plot','subplot')),
  geometry geometry(Polygon,4326),
  boundary_source text check (boundary_source in ('gps_walk','manual_draw','geojson_import','kml_import','survey','derived')),
  area_m2 numeric(14,2) generated always as
    (case when geometry is null then null else ST_Area(geometry::geography) end) stored,
  perimeter_m numeric(14,2) generated always as
    (case when geometry is null then null else ST_Perimeter(geometry::geography) end) stored,
  centroid geography(Point,4326) generated always as
    (case when geometry is null then null else ST_Centroid(geometry)::geography end) stored,
  land_use text not null default 'cropland' check (land_use in (
    'cropland','pasture','orchard','greenhouse','aquaculture','fallow',
    'infrastructure','water','forest','other'
  )),
  irrigation_type text check (irrigation_type in (
    'rainfed','drip','sprinkler','furrow','flood','pivot','manual','hose','other'
  )),
  soil_texture text check (soil_texture is null or soil_texture in (
    'sand','loamy_sand','sandy_loam','loam','silt_loam','silt','silt_clay',
    'clay_loam','sandy_clay_loam','silty_clay_loam','sandy_clay','silty_clay','clay','rock'
  )),
  slope_percent numeric(5,2) check (slope_percent is null or slope_percent >= 0),
  elevation_m numeric(8,2),
  ownership_type text check (ownership_type in ('owned','leased','customary','shared','managed')),
  status text not null default 'active' check (status in ('active','fallow','retired','archived')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, code)
);
create trigger plots_touch before update on public.plots
  for each row execute function public.touch_updated_at();
create trigger plots_created_by before insert on public.plots
  for each row execute function public.set_created_by();
create index plots_farm_idx on public.plots (farm_id, status, code);
create index plots_org_idx on public.plots (organization_id);
create index plots_geometry_gix on public.plots using gist (geometry);
create index plots_parent_idx on public.plots (parent_plot_id);

-- Immutable boundary history (mirrors farm_boundary_versions)
create table public.plot_boundary_versions (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  geometry geometry(Polygon,4326) not null,
  source text not null check (source in ('gps_walk','manual_draw','geojson_import','kml_import','survey','derived')),
  raw_gps_points jsonb,
  point_count int,
  accuracy_summary jsonb,
  area_m2 numeric(14,2) not null,
  perimeter_m numeric(14,2) not null,
  validation jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger pbv_created_by before insert on public.plot_boundary_versions
  for each row execute function public.set_created_by();
create trigger pbv_immutable before update or delete on public.plot_boundary_versions
  for each row execute function public.forbid_mutation();
create index pbv_plot_idx on public.plot_boundary_versions (plot_id, created_at desc);
create index pbv_gix on public.plot_boundary_versions using gist (geometry);

-- =====================================================================
-- Deferred foreign keys from 0003 / 0005 (now that plots exist)
-- =====================================================================
alter table public.crop_seasons
  add constraint crop_seasons_plot_fk
  foreign key (plot_id) references public.plots(id) on delete set null;

alter table public.harvests
  add constraint harvests_storage_fk
  foreign key (storage_location_id) references public.inventory_locations(id) on delete set null;

alter table public.journal_lines
  add constraint journal_lines_plot_fk
  foreign key (plot_id) references public.plots(id) on delete set null,
  add constraint journal_lines_crop_season_fk
  foreign key (crop_season_id) references public.crop_seasons(id) on delete set null,
  add constraint journal_lines_livestock_batch_fk
  foreign key (livestock_batch_id) references public.livestock_batches(id) on delete set null,
  add constraint journal_lines_cost_center_fk
  foreign key (cost_center_id) references public.cost_centers(id) on delete set null;

-- =====================================================================
-- §33  DOCUMENTS  (created before soil_records so the lab-report FK is
--      a real constraint rather than a deferred one)
-- =====================================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  crop_season_id uuid references public.crop_seasons(id) on delete set null,
  livestock_batch_id uuid references public.livestock_batches(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 200),
  document_type text not null default 'other' check (document_type in (
    'invoice','receipt','soil_report','veterinary_report','purchase_document',
    'contract','land_document','certificate','permit','insurance',
    'photo','map','report','other'
  )),
  storage_bucket text not null default 'documents',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  document_date date,
  expiry_date date,
  issuing_authority text,
  reference_number text,
  visibility text not null default 'organization'
    check (visibility in ('organization','farm','private')),
  tags text[],
  description text,
  uploaded_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, storage_bucket, storage_path)
);
create trigger documents_touch before update on public.documents
  for each row execute function public.touch_updated_at();
create trigger documents_created_by before insert on public.documents
  for each row execute function public.set_created_by();
create index documents_org_idx on public.documents (organization_id, document_type, created_at desc)
  where deleted_at is null;
create index documents_farm_idx on public.documents (farm_id) where deleted_at is null;
create index documents_plot_idx on public.documents (plot_id) where deleted_at is null;
create index documents_crop_idx on public.documents (crop_season_id) where deleted_at is null;
create index documents_livestock_idx on public.documents (livestock_batch_id) where deleted_at is null;
create index documents_expiry_idx on public.documents (organization_id, expiry_date)
  where expiry_date is not null and deleted_at is null;

-- =====================================================================
-- §22  LABOR  — workers + labor_records
-- =====================================================================
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null, -- link to a platform login
  full_name text not null check (length(btrim(full_name)) between 1 and 160),
  code text check (code is null or code ~ '^[A-Za-z0-9_-]{1,40}$'),
  worker_type text not null default 'casual'
    check (worker_type in ('employee','casual','contractor','family','volunteer')),
  phone text,
  email text,
  national_id text,
  gender text check (gender in ('male','female','other','undisclosed')),
  date_of_birth date,
  address text,
  village text,
  role_title text,
  skills text[],
  default_rate_type text not null default 'daily'
    check (default_rate_type in ('hourly','daily','piece','monthly')),
  default_rate numeric(14,2) check (default_rate is null or default_rate >= 0),
  currency char(3) not null default 'TZS',
  payment_method text check (payment_method in ('cash','mobile_money','bank_transfer','cheque','other')),
  mobile_money_number text,
  bank_account text,
  hire_date date,
  end_date date,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create trigger workers_touch before update on public.workers
  for each row execute function public.touch_updated_at();
create trigger workers_created_by before insert on public.workers
  for each row execute function public.set_created_by();
create index workers_org_idx on public.workers (organization_id, is_active, full_name);
create index workers_farm_idx on public.workers (farm_id);

create table public.labor_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  crop_season_id uuid references public.crop_seasons(id) on delete set null,
  livestock_batch_id uuid references public.livestock_batches(id) on delete set null,
  crop_activity_id uuid references public.crop_activities(id) on delete set null,
  task_id uuid,  -- FK added after tasks
  worker_id uuid not null references public.workers(id) on delete restrict,
  work_date date not null,
  task_description text not null check (length(btrim(task_description)) between 1 and 400),
  rate_type text not null default 'daily'
    check (rate_type in ('hourly','daily','piece','monthly')),
  hours_worked numeric(6,2) check (hours_worked is null or (hours_worked >= 0 and hours_worked <= 24)),
  days_worked numeric(6,2) check (days_worked is null or (days_worked >= 0 and days_worked <= 31)),
  quantity numeric(14,3) check (quantity is null or quantity >= 0),
  unit text,
  rate numeric(14,2) not null default 0 check (rate >= 0),
  currency char(3) not null default 'TZS',
  total_cost numeric(14,2) generated always as (
    case rate_type
      when 'hourly'  then coalesce(hours_worked, 0) * rate
      when 'daily'   then coalesce(days_worked, 0) * rate
      when 'piece'   then coalesce(quantity, 0) * rate
      when 'monthly' then rate
    end
  ) stored,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','partial','paid')),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  paid_date date,
  expense_id uuid references public.expenses(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger labor_records_touch before update on public.labor_records
  for each row execute function public.touch_updated_at();
create trigger labor_records_created_by before insert on public.labor_records
  for each row execute function public.set_created_by();
create index labor_records_org_idx on public.labor_records (organization_id, work_date desc);
create index labor_records_farm_idx on public.labor_records (farm_id, work_date desc);
create index labor_records_worker_idx on public.labor_records (worker_id, work_date desc);
create index labor_records_plot_idx on public.labor_records (plot_id);
create index labor_records_crop_idx on public.labor_records (crop_season_id);
create index labor_records_livestock_idx on public.labor_records (livestock_batch_id);
create index labor_records_paystatus_idx on public.labor_records (organization_id, payment_status);

-- =====================================================================
-- §23  EQUIPMENT
-- =====================================================================
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 160),
  code text not null check (code ~ '^[A-Za-z0-9_-]{1,40}$'),
  category text not null default 'other' check (category in (
    'tractor','vehicle','truck','pump','generator','sprayer','plough','harrow',
    'planter','harvester','thresher','trailer','irrigation_kit','implement',
    'processing_machine','tool','other'
  )),
  make text, model text, serial_number text,
  year_manufactured int check (year_manufactured is null or year_manufactured between 1900 and 2200),
  ownership_type text not null default 'owned'
    check (ownership_type in ('owned','leased','rented','shared')),
  purchase_date date,
  purchase_cost numeric(14,2) check (purchase_cost is null or purchase_cost >= 0),
  currency char(3) not null default 'TZS',
  current_value numeric(14,2) check (current_value is null or current_value >= 0),
  fuel_type text check (fuel_type in ('diesel','petrol','electric','solar','manual','none')),
  fuel_capacity numeric(12,3),
  meter_type text not null default 'hours' check (meter_type in ('hours','kilometers','none')),
  current_meter numeric(12,2) not null default 0 check (current_meter >= 0),
  capacity_note text,
  status text not null default 'operational'
    check (status in ('operational','maintenance','breakdown','idle','retired','sold')),
  asset_id uuid references public.assets(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create trigger equipment_touch before update on public.equipment
  for each row execute function public.touch_updated_at();
create trigger equipment_created_by before insert on public.equipment
  for each row execute function public.set_created_by();
create index equipment_org_idx on public.equipment (organization_id, status, category);
create index equipment_farm_idx on public.equipment (farm_id);

create table public.equipment_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  plot_id uuid references public.plots(id) on delete set null,
  crop_season_id uuid references public.crop_seasons(id) on delete set null,
  livestock_batch_id uuid references public.livestock_batches(id) on delete set null,
  crop_activity_id uuid references public.crop_activities(id) on delete set null,
  task_id uuid,  -- FK added after tasks
  operator_worker_id uuid references public.workers(id) on delete set null,
  usage_date date not null,
  start_meter numeric(12,2),
  end_meter numeric(12,2),
  hours_used numeric(8,2) check (hours_used is null or hours_used >= 0),
  distance_km numeric(10,2) check (distance_km is null or distance_km >= 0),
  fuel_consumed numeric(12,3) check (fuel_consumed is null or fuel_consumed >= 0),
  fuel_unit text default 'liter',
  fuel_cost numeric(14,2) not null default 0 check (fuel_cost >= 0),
  operator_cost numeric(14,2) not null default 0 check (operator_cost >= 0),
  other_cost numeric(14,2) not null default 0 check (other_cost >= 0),
  currency char(3) not null default 'TZS',
  total_cost numeric(14,2) generated always as
    (fuel_cost + operator_cost + other_cost) stored,
  expense_id uuid references public.expenses(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_meter is null or start_meter is null or end_meter >= start_meter)
);
create trigger equipment_usage_touch before update on public.equipment_usage
  for each row execute function public.touch_updated_at();
create trigger equipment_usage_created_by before insert on public.equipment_usage
  for each row execute function public.set_created_by();
create index equipment_usage_org_idx on public.equipment_usage (organization_id, usage_date desc);
create index equipment_usage_eq_idx on public.equipment_usage (equipment_id, usage_date desc);
create index equipment_usage_farm_idx on public.equipment_usage (farm_id, usage_date desc);
create index equipment_usage_plot_idx on public.equipment_usage (plot_id);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  maintenance_type text not null default 'scheduled' check (maintenance_type in (
    'scheduled','repair','inspection','tyre','oil_change','overhaul','calibration','other'
  )),
  maintenance_date date not null,
  description text not null check (length(btrim(description)) between 1 and 600),
  performed_by text,
  vendor_name text,
  meter_reading numeric(12,2),
  parts_cost numeric(14,2) not null default 0 check (parts_cost >= 0),
  labor_cost numeric(14,2) not null default 0 check (labor_cost >= 0),
  other_cost numeric(14,2) not null default 0 check (other_cost >= 0),
  currency char(3) not null default 'TZS',
  total_cost numeric(14,2) generated always as
    (parts_cost + labor_cost + other_cost) stored,
  downtime_hours numeric(8,2) check (downtime_hours is null or downtime_hours >= 0),
  next_service_date date,
  next_service_meter numeric(12,2),
  status text not null default 'completed'
    check (status in ('pending','in_progress','completed','cancelled')),
  expense_id uuid references public.expenses(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger maintenance_records_touch before update on public.maintenance_records
  for each row execute function public.touch_updated_at();
create trigger maintenance_records_created_by before insert on public.maintenance_records
  for each row execute function public.set_created_by();
create index maintenance_eq_idx on public.maintenance_records (equipment_id, maintenance_date desc);
create index maintenance_org_idx on public.maintenance_records (organization_id, maintenance_date desc);
create index maintenance_next_idx on public.maintenance_records (organization_id, next_service_date)
  where next_service_date is not null;

-- =====================================================================
-- §24  IRRIGATION  — water sources, zones, events
-- =====================================================================
create table public.water_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  code text not null check (code ~ '^[A-Za-z0-9_-]{1,40}$'),
  source_type text not null check (source_type in (
    'borehole','well','spring','river','stream','dam','reservoir','lake','pond',
    'canal','municipal','rainwater_harvest','tank','other'
  )),
  geometry geometry(Point,4326),
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  depth_m numeric(8,2) check (depth_m is null or depth_m >= 0),
  capacity_m3 numeric(14,3) check (capacity_m3 is null or capacity_m3 >= 0),
  yield_lpm numeric(12,2) check (yield_lpm is null or yield_lpm >= 0),
  pump_equipment_id uuid references public.equipment(id) on delete set null,
  water_quality text check (water_quality in ('good','acceptable','saline','brackish','unknown')),
  reliability text check (reliability in ('reliable','seasonal','intermittent','unknown')),
  permit_number text,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, code)
);
create trigger water_sources_touch before update on public.water_sources
  for each row execute function public.touch_updated_at();
create trigger water_sources_created_by before insert on public.water_sources
  for each row execute function public.set_created_by();
create index water_sources_farm_idx on public.water_sources (farm_id, is_active);
create index water_sources_geometry_gix on public.water_sources using gist (geometry);

create table public.irrigation_zones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  water_source_id uuid references public.water_sources(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 160),
  code text not null check (code ~ '^[A-Za-z0-9_-]{1,40}$'),
  geometry geometry(Polygon,4326),
  area_m2 numeric(14,2) generated always as
    (case when geometry is null then null else ST_Area(geometry::geography) end) stored,
  irrigation_type text not null default 'drip' check (irrigation_type in (
    'drip','sprinkler','furrow','flood','pivot','manual','hose','other'
  )),
  emitter_rate_lph numeric(10,2) check (emitter_rate_lph is null or emitter_rate_lph >= 0),
  design_flow_m3h numeric(12,3),
  status text not null default 'active' check (status in ('active','inactive','maintenance')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, code)
);
create trigger irrigation_zones_touch before update on public.irrigation_zones
  for each row execute function public.touch_updated_at();
create trigger irrigation_zones_created_by before insert on public.irrigation_zones
  for each row execute function public.set_created_by();
create index irrigation_zones_farm_idx on public.irrigation_zones (farm_id, status);
create index irrigation_zones_source_idx on public.irrigation_zones (water_source_id);
create index irrigation_zones_geometry_gix on public.irrigation_zones using gist (geometry);

create table public.irrigation_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  zone_id uuid references public.irrigation_zones(id) on delete set null,
  water_source_id uuid references public.water_sources(id) on delete set null,
  crop_season_id uuid references public.crop_seasons(id) on delete set null,
  crop_activity_id uuid references public.crop_activities(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  task_id uuid,  -- FK added after tasks
  irrigation_date date not null,
  start_time time,
  end_time time,
  duration_minutes int check (duration_minutes is null or duration_minutes >= 0),
  water_volume_m3 numeric(12,3) check (water_volume_m3 is null or water_volume_m3 >= 0),
  method text not null default 'drip' check (method in (
    'drip','sprinkler','furrow','flood','pivot','manual','hose','other'
  )),
  energy_source text check (energy_source in ('gravity','diesel','petrol','electric','solar','manual','none')),
  fuel_consumed numeric(12,3) check (fuel_consumed is null or fuel_consumed >= 0),
  energy_cost numeric(14,2) not null default 0 check (energy_cost >= 0),
  labor_cost numeric(14,2) not null default 0 check (labor_cost >= 0),
  other_cost numeric(14,2) not null default 0 check (other_cost >= 0),
  currency char(3) not null default 'TZS',
  total_cost numeric(14,2) generated always as
    (energy_cost + labor_cost + other_cost) stored,
  soil_moisture_before_pct numeric(5,2),
  soil_moisture_after_pct numeric(5,2),
  expense_id uuid references public.expenses(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger irrigation_records_touch before update on public.irrigation_records
  for each row execute function public.touch_updated_at();
create trigger irrigation_records_created_by before insert on public.irrigation_records
  for each row execute function public.set_created_by();
create index irrigation_records_org_idx on public.irrigation_records (organization_id, irrigation_date desc);
create index irrigation_records_farm_idx on public.irrigation_records (farm_id, irrigation_date desc);
create index irrigation_records_plot_idx on public.irrigation_records (plot_id, irrigation_date desc);
create index irrigation_records_zone_idx on public.irrigation_records (zone_id, irrigation_date desc);
create index irrigation_records_crop_idx on public.irrigation_records (crop_season_id);

-- =====================================================================
-- §25  SOIL  — lab-backed soil records. No fabricated values: every
--      measurement column is nullable and lab provenance is recorded.
-- =====================================================================
create table public.soil_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  sample_code text,
  sample_date date not null,
  sample_depth_cm numeric(6,2) check (sample_depth_cm is null or sample_depth_cm >= 0),
  sampling_method text,
  lab_name text,
  lab_reference text,
  lab_report_document_id uuid references public.documents(id) on delete set null,
  -- chemistry (nullable: absence means "not measured", never "zero")
  ph numeric(4,2) check (ph is null or (ph >= 0 and ph <= 14)),
  organic_matter_pct numeric(6,3) check (organic_matter_pct is null or organic_matter_pct >= 0),
  organic_carbon_pct numeric(6,3),
  total_nitrogen_pct numeric(6,4),
  available_phosphorus_ppm numeric(10,2),
  exchangeable_potassium_ppm numeric(10,2),
  calcium_ppm numeric(10,2),
  magnesium_ppm numeric(10,2),
  sulfur_ppm numeric(10,2),
  cec_meq_100g numeric(8,2),
  electrical_conductivity_ds_m numeric(8,3),
  -- physical
  moisture_pct numeric(6,2) check (moisture_pct is null or (moisture_pct >= 0 and moisture_pct <= 100)),
  texture text check (texture is null or texture in (
    'sand','loamy_sand','sandy_loam','loam','silt_loam','silt','silt_clay',
    'clay_loam','sandy_clay_loam','silty_clay_loam','sandy_clay','silty_clay','clay','rock'
  )),
  bulk_density_g_cm3 numeric(6,3),
  water_holding_capacity_pct numeric(6,2),
  -- extra micronutrients / any lab panel kept verbatim
  micronutrients jsonb,
  raw_lab_payload jsonb,
  interpretation text,
  recommendations text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger soil_records_touch before update on public.soil_records
  for each row execute function public.touch_updated_at();
create trigger soil_records_created_by before insert on public.soil_records
  for each row execute function public.set_created_by();
create index soil_records_org_idx on public.soil_records (organization_id, sample_date desc);
create index soil_records_plot_idx on public.soil_records (plot_id, sample_date desc);
create index soil_records_farm_idx on public.soil_records (farm_id, sample_date desc);

-- =====================================================================
-- §32  TASKS
-- =====================================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  crop_season_id uuid references public.crop_seasons(id) on delete set null,
  livestock_batch_id uuid references public.livestock_batches(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text,
  task_type text not null default 'other' check (task_type in (
    'land_preparation','planting','fertilization','weeding','spraying','irrigation',
    'pest_control','pruning','harvest','post_harvest','livestock_feeding',
    'livestock_health','livestock_handling','maintenance','inspection',
    'construction','admin','purchase','other'
  )),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'pending'
    check (status in ('pending','assigned','in_progress','blocked','completed','cancelled')),
  assigned_to uuid references public.profiles(id) on delete set null,
  assigned_worker_id uuid references public.workers(id) on delete set null,
  due_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  estimated_hours numeric(8,2) check (estimated_hours is null or estimated_hours >= 0),
  actual_hours numeric(8,2) check (actual_hours is null or actual_hours >= 0),
  estimated_cost numeric(14,2) check (estimated_cost is null or estimated_cost >= 0),
  actual_cost numeric(14,2) check (actual_cost is null or actual_cost >= 0),
  currency char(3) not null default 'TZS',
  materials_used jsonb,
  completion_notes text,
  photos jsonb,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  recurrence_rule text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();
create trigger tasks_created_by before insert on public.tasks
  for each row execute function public.set_created_by();
create index tasks_org_idx on public.tasks (organization_id, status, due_date);
create index tasks_farm_idx on public.tasks (farm_id, status, due_date);
create index tasks_assignee_idx on public.tasks (assigned_to, status);
create index tasks_worker_idx on public.tasks (assigned_worker_id, status);
create index tasks_plot_idx on public.tasks (plot_id);
create index tasks_due_idx on public.tasks (organization_id, due_date)
  where status in ('pending','assigned','in_progress','blocked');
create index tasks_parent_idx on public.tasks (parent_task_id);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 4000),
  attachment_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- Deferred FKs now that tasks exists
alter table public.labor_records
  add constraint labor_records_task_fk
  foreign key (task_id) references public.tasks(id) on delete set null;
alter table public.equipment_usage
  add constraint equipment_usage_task_fk
  foreign key (task_id) references public.tasks(id) on delete set null;
alter table public.irrigation_records
  add constraint irrigation_records_task_fk
  foreign key (task_id) references public.tasks(id) on delete set null;

-- =====================================================================
-- §19  PRODUCTION RECORDS  (beyond crop harvests: milk, eggs, wool, honey…)
-- =====================================================================
create table public.production_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  crop_season_id uuid references public.crop_seasons(id) on delete set null,
  livestock_batch_id uuid references public.livestock_batches(id) on delete set null,
  harvest_id uuid references public.harvests(id) on delete set null,
  production_type text not null default 'other' check (production_type in (
    'crop_harvest','milk','eggs','wool','honey','fish','manure','hides','other'
  )),
  record_date date not null,
  product_name text not null check (length(btrim(product_name)) between 1 and 160),
  quantity numeric(14,3) not null check (quantity >= 0),
  unit text not null default 'kg',
  quality_grade text,
  unit_price numeric(14,2) check (unit_price is null or unit_price >= 0),
  currency char(3) not null default 'TZS',
  total_value numeric(14,2) generated always as
    (case when unit_price is null then null else quantity * unit_price end) stored,
  destination text not null default 'storage' check (destination in (
    'storage','sale','home_consumption','seed','animal_feed','processing','loss','other'
  )),
  storage_location_id uuid references public.inventory_locations(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger production_records_touch before update on public.production_records
  for each row execute function public.touch_updated_at();
create trigger production_records_created_by before insert on public.production_records
  for each row execute function public.set_created_by();
create index production_records_org_idx on public.production_records (organization_id, record_date desc);
create index production_records_farm_idx on public.production_records (farm_id, record_date desc);
create index production_records_crop_idx on public.production_records (crop_season_id);
create index production_records_livestock_idx on public.production_records (livestock_batch_id);
create index production_records_plot_idx on public.production_records (plot_id);

-- =====================================================================
-- §31  STORAGE  (warehouses / cold rooms / silos are inventory_locations
--      with a storage location_type; this view is the storage dashboard)
-- =====================================================================
create or replace view public.storage_overview as
select
  l.organization_id,
  l.farm_id,
  l.id            as location_id,
  l.name          as location_name,
  l.code          as location_code,
  l.location_type as storage_type,
  l.capacity,
  l.capacity_unit,
  l.gps_lat,
  l.gps_lng,
  coalesce(sum(b.quantity), 0)                    as total_quantity,
  count(distinct b.item_id)                       as distinct_items,
  count(*) filter (where b.quantity <= 0)         as empty_balances
from public.inventory_locations l
left join public.inventory_balances b on b.location_id = l.id
where l.location_type in ('warehouse','store','cold_room','silo')
  and l.is_active = true
group by l.organization_id, l.farm_id, l.id, l.name, l.code, l.location_type,
         l.capacity, l.capacity_unit, l.gps_lat, l.gps_lng;

-- Plot crop-rotation history (§10) — derived, never duplicated
create or replace view public.plot_rotation_history as
select
  cs.organization_id,
  cs.plot_id,
  p.farm_id,
  p.code         as plot_code,
  p.name         as plot_name,
  s.id           as season_id,
  s.name         as season_name,
  s.start_date,
  s.end_date,
  c.id           as crop_id,
  c.name         as crop_name,
  c.category     as crop_category,
  v.name         as variety_name,
  cs.area_m2,
  cs.target_yield_kg,
  coalesce(h.harvested_kg, 0) as harvested_kg,
  cs.status
from public.crop_seasons cs
join public.plots p on p.id = cs.plot_id
left join public.seasons s on s.id = cs.season_id
left join public.crops c on c.id = cs.crop_id
left join public.crop_varieties v on v.id = cs.variety_id
left join (
  select crop_season_id, sum(quantity) as harvested_kg
  from public.harvests
  group by crop_season_id
) h on h.crop_season_id = cs.id
where cs.plot_id is not null;

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- plots
alter table public.plots enable row level security;
create policy plots_select on public.plots for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy plots_insert on public.plots for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy plots_update on public.plots for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy plots_delete on public.plots for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- plot_boundary_versions
alter table public.plot_boundary_versions enable row level security;
create policy pbv_select on public.plot_boundary_versions for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy pbv_insert on public.plot_boundary_versions for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));

-- documents
alter table public.documents enable row level security;
create policy documents_select on public.documents for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy documents_insert on public.documents for insert
  with check (public.has_org_role(organization_id,
    array['owner','admin','manager','accountant','agronomist','veterinarian','inventory_manager']));
create policy documents_update on public.documents for update
  using (public.has_org_role(organization_id,
    array['owner','admin','manager','accountant','agronomist','veterinarian','inventory_manager']))
  with check (public.has_org_role(organization_id,
    array['owner','admin','manager','accountant','agronomist','veterinarian','inventory_manager']));
create policy documents_delete on public.documents for delete
  using (public.has_org_role(organization_id, array['owner','admin','manager']));

-- workers
alter table public.workers enable row level security;
create policy workers_select on public.workers for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy workers_insert on public.workers for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy workers_update on public.workers for update
  using (public.has_org_role(organization_id, array['owner','admin','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy workers_delete on public.workers for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- labor_records
alter table public.labor_records enable row level security;
create policy labor_records_select on public.labor_records for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy labor_records_insert on public.labor_records for insert
  with check (public.has_org_role(organization_id,
    array['owner','admin','manager','accountant','agronomist','worker']));
create policy labor_records_update on public.labor_records for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','accountant']));
create policy labor_records_delete on public.labor_records for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- equipment
alter table public.equipment enable row level security;
create policy equipment_select on public.equipment for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy equipment_insert on public.equipment for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy equipment_update on public.equipment for update
  using (public.has_org_role(organization_id, array['owner','admin','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy equipment_delete on public.equipment for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- equipment_usage
alter table public.equipment_usage enable row level security;
create policy equipment_usage_select on public.equipment_usage for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy equipment_usage_insert on public.equipment_usage for insert
  with check (public.has_org_role(organization_id,
    array['owner','admin','manager','accountant','agronomist','worker']));
create policy equipment_usage_update on public.equipment_usage for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','accountant']));
create policy equipment_usage_delete on public.equipment_usage for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- maintenance_records
alter table public.maintenance_records enable row level security;
create policy maintenance_select on public.maintenance_records for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy maintenance_insert on public.maintenance_records for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','accountant']));
create policy maintenance_update on public.maintenance_records for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','accountant']));
create policy maintenance_delete on public.maintenance_records for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- water_sources
alter table public.water_sources enable row level security;
create policy water_sources_select on public.water_sources for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy water_sources_insert on public.water_sources for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy water_sources_update on public.water_sources for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy water_sources_delete on public.water_sources for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- irrigation_zones
alter table public.irrigation_zones enable row level security;
create policy irrigation_zones_select on public.irrigation_zones for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy irrigation_zones_insert on public.irrigation_zones for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy irrigation_zones_update on public.irrigation_zones for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy irrigation_zones_delete on public.irrigation_zones for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- irrigation_records
alter table public.irrigation_records enable row level security;
create policy irrigation_records_select on public.irrigation_records for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy irrigation_records_insert on public.irrigation_records for insert
  with check (public.has_org_role(organization_id,
    array['owner','admin','manager','accountant','agronomist','worker']));
create policy irrigation_records_update on public.irrigation_records for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','accountant','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','accountant','agronomist']));
create policy irrigation_records_delete on public.irrigation_records for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- soil_records
alter table public.soil_records enable row level security;
create policy soil_records_select on public.soil_records for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy soil_records_insert on public.soil_records for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy soil_records_update on public.soil_records for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy soil_records_delete on public.soil_records for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- tasks
alter table public.tasks enable row level security;
create policy tasks_select on public.tasks for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy tasks_insert on public.tasks for insert
  with check (public.has_org_role(organization_id,
    array['owner','admin','manager','agronomist','veterinarian','accountant']));
create policy tasks_update on public.tasks for update
  using (public.is_org_member(organization_id) or public.is_platform_admin())
  with check (public.is_org_member(organization_id) or public.is_platform_admin());
create policy tasks_delete on public.tasks for delete
  using (public.has_org_role(organization_id, array['owner','admin','manager']));

-- task_comments
alter table public.task_comments enable row level security;
create policy task_comments_select on public.task_comments for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy task_comments_insert on public.task_comments for insert
  with check (public.is_org_member(organization_id));
create policy task_comments_delete on public.task_comments for delete
  using (public.has_org_role(organization_id, array['owner','admin','manager'])
         or author_id = public.app_uid());

-- production_records
alter table public.production_records enable row level security;
create policy production_records_select on public.production_records for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy production_records_insert on public.production_records for insert
  with check (public.has_org_role(organization_id,
    array['owner','admin','manager','agronomist','veterinarian','worker']));
create policy production_records_update on public.production_records for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','accountant','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','accountant','agronomist']));
create policy production_records_delete on public.production_records for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- =====================================================================
-- Reporting views used by dashboards (§39, §46)
-- =====================================================================
create or replace view public.labor_cost_by_plot as
select
  organization_id, farm_id, plot_id, crop_season_id,
  sum(total_cost)          as total_cost,
  sum(hours_worked)        as hours_worked,
  sum(days_worked)         as days_worked,
  count(*)                 as record_count,
  min(work_date)           as first_date,
  max(work_date)           as last_date
from public.labor_records
group by organization_id, farm_id, plot_id, crop_season_id;

create or replace view public.equipment_cost_by_plot as
select
  organization_id, farm_id, plot_id, crop_season_id,
  sum(total_cost)   as total_cost,
  sum(fuel_cost)    as fuel_cost,
  sum(hours_used)   as hours_used,
  count(*)          as record_count
from public.equipment_usage
group by organization_id, farm_id, plot_id, crop_season_id;

create or replace view public.irrigation_cost_by_plot as
select
  organization_id, farm_id, plot_id, crop_season_id,
  sum(total_cost)        as total_cost,
  sum(water_volume_m3)   as water_volume_m3,
  sum(duration_minutes)  as duration_minutes,
  count(*)               as record_count
from public.irrigation_records
group by organization_id, farm_id, plot_id, crop_season_id;
