-- =====================================================================
-- 0003_crops_livestock.sql — Phase 3 (docs/03-database-schema.md §3–4, §14–15)
-- Neon / Lakebase Postgres edition.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Seasons
-- ---------------------------------------------------------------------
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  start_date date not null,
  end_date date not null,
  status text not null default 'planned' check (status in ('planned','active','completed','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create trigger seasons_touch before update on public.seasons
  for each row execute function public.touch_updated_at();
create trigger seasons_created_by before insert on public.seasons
  for each row execute function public.set_created_by();
create index seasons_org_idx on public.seasons (organization_id, start_date desc);

-- ---------------------------------------------------------------------
-- Crops & Varieties (reference data seeded in 0002)
-- ---------------------------------------------------------------------
create table public.crops (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  category text not null check (category in ('cereal','legume','vegetable','fruit','root','fiber','oilseed','forage','other')),
  default_unit text not null default 'kg',
  growing_days_min int,
  growing_days_max int,
  created_at timestamptz not null default now()
);

create table public.crop_varieties (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  maturity_days int,
  yield_potential_t_ha numeric(6,2),
  created_at timestamptz not null default now(),
  unique (crop_id, code)
);
create index crop_varieties_crop_idx on public.crop_varieties (crop_id);

-- ---------------------------------------------------------------------
-- Crop Seasons (a crop planted in a specific season on a farm)
-- ---------------------------------------------------------------------
create table public.crop_seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  plot_id uuid, -- FK added after plots
  season_id uuid not null references public.seasons(id) on delete restrict,
  crop_id uuid not null references public.crops(id) on delete restrict,
  variety_id uuid references public.crop_varieties(id) on delete set null,
  name text, -- e.g. "Maize Season 2026 Main - Plot A01"
  area_m2 numeric(14,2),
  planting_date date,
  expected_harvest_date date,
  actual_harvest_date date,
  target_yield_kg numeric(14,2),
  actual_yield_kg numeric(14,2),
  seed_quantity numeric(14,3),
  seed_unit text,
  seed_cost numeric(14,2),
  status text not null default 'planned' check (status in ('planned','planted','growing','harvested','failed','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger crop_seasons_touch before update on public.crop_seasons
  for each row execute function public.touch_updated_at();
create trigger crop_seasons_created_by before insert on public.crop_seasons
  for each row execute function public.set_created_by();
create index crop_seasons_farm_idx on public.crop_seasons (farm_id, season_id);
create index crop_seasons_plot_idx on public.crop_seasons (plot_id);
create index crop_seasons_crop_idx on public.crop_seasons (crop_id);

-- ---------------------------------------------------------------------
-- Crop Activities (field operations)
-- ---------------------------------------------------------------------
create table public.crop_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  crop_season_id uuid not null references public.crop_seasons(id) on delete cascade,
  activity_type text not null check (activity_type in (
    'land_preparation','ploughing','planting','fertilization','weeding',
    'spraying','irrigation','pest_control','disease_observation','pruning',
    'harvest','other'
  )),
  activity_date date not null,
  worker_id uuid references public.profiles(id),
  quantity numeric(14,3),
  unit text,
  cost numeric(14,2),
  notes text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  attachments jsonb default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger crop_activities_touch before update on public.crop_activities
  for each row execute function public.touch_updated_at();
create trigger crop_activities_created_by before insert on public.crop_activities
  for each row execute function public.set_created_by();
create index crop_activities_cs_idx on public.crop_activities (crop_season_id, activity_date);
create index crop_activities_type_idx on public.crop_activities (activity_type);

-- ---------------------------------------------------------------------
-- Crop Inputs (materials consumed by activities)
-- ---------------------------------------------------------------------
create table public.crop_inputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  crop_season_id uuid not null references public.crop_seasons(id) on delete cascade,
  activity_id uuid references public.crop_activities(id) on delete set null,
  inventory_item_id uuid, -- FK added after inventory_items
  input_name text not null,
  input_category text not null check (input_category in (
    'seed','fertilizer','pesticide','herbicide','fungicide','fuel','water','other'
  )),
  quantity numeric(14,3) not null,
  unit text not null,
  unit_cost numeric(14,2),
  total_cost numeric(14,2) generated always as (quantity * coalesce(unit_cost, 0)) stored,
  application_date date,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger crop_inputs_created_by before insert on public.crop_inputs
  for each row execute function public.set_created_by();
create index crop_inputs_cs_idx on public.crop_inputs (crop_season_id);
create index crop_inputs_item_idx on public.crop_inputs (inventory_item_id);

-- ---------------------------------------------------------------------
-- Harvests
-- ---------------------------------------------------------------------
create table public.harvests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  crop_season_id uuid not null references public.crop_seasons(id) on delete cascade,
  harvest_date date not null,
  quantity numeric(14,3) not null,
  unit text not null default 'kg',
  quality_grade text check (quality_grade in ('grade_a','grade_b','grade_c','reject')),
  moisture_content numeric(5,2),
  storage_location_id uuid, -- FK added after inventory_locations
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger harvests_touch before update on public.harvests
  for each row execute function public.touch_updated_at();
create trigger harvests_created_by before insert on public.harvests
  for each row execute function public.set_created_by();
create index harvests_cs_idx on public.harvests (crop_season_id, harvest_date);

-- ---------------------------------------------------------------------
-- Livestock Species (reference data seeded in 0002)
-- ---------------------------------------------------------------------
create table public.livestock_species (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  category text not null check (category in ('cattle','goats','sheep','poultry','pigs','fish','other')),
  default_unit text not null default 'head',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Livestock Groups (e.g., "Broilers", "Layers", "Dairy Cattle")
-- ---------------------------------------------------------------------
create table public.livestock_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  species_id uuid not null references public.livestock_species(id) on delete restrict,
  name text not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create trigger livestock_groups_touch before update on public.livestock_groups
  for each row execute function public.touch_updated_at();
create trigger livestock_groups_created_by before insert on public.livestock_groups
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- Livestock Batches (a cohort of animals)
-- ---------------------------------------------------------------------
create table public.livestock_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  group_id uuid not null references public.livestock_groups(id) on delete restrict,
  batch_code text not null, -- e.g. "BROILER-001"
  status text not null default 'active' check (status in ('active','completed','archived')),
  start_date date not null,
  end_date date,
  initial_quantity int not null check (initial_quantity > 0),
  current_quantity int not null check (current_quantity >= 0),
  mortality_count int not null default 0 check (mortality_count >= 0),
  unit text not null default 'head',
  avg_start_weight_kg numeric(8,3),
  avg_current_weight_kg numeric(8,3),
  target_weight_kg numeric(8,3),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, batch_code)
);
create trigger livestock_batches_touch before update on public.livestock_batches
  for each row execute function public.touch_updated_at();
create trigger livestock_batches_created_by before insert on public.livestock_batches
  for each row execute function public.set_created_by();
create index livestock_batches_farm_idx on public.livestock_batches (farm_id, status);
create index livestock_batches_group_idx on public.livestock_batches (group_id);

-- ---------------------------------------------------------------------
-- Livestock Events (mortality, movement, vaccination, treatment, weighing, sale)
-- ---------------------------------------------------------------------
create table public.livestock_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  event_type text not null check (event_type in (
    'mortality','movement_in','movement_out','vaccination','treatment',
    'weighing','feeding','sale','birth','other'
  )),
  event_date date not null,
  quantity int not null default 0,
  unit text,
  weight_kg numeric(8,3),
  cost numeric(14,2),
  product_name text, -- vaccine, medicine, feed name
  notes text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  attachments jsonb default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger livestock_events_created_by before insert on public.livestock_events
  for each row execute function public.set_created_by();
create index livestock_events_batch_idx on public.livestock_events (batch_id, event_date);
create index livestock_events_type_idx on public.livestock_events (event_type);

-- ---------------------------------------------------------------------
-- Livestock Health (detailed health records)
-- ---------------------------------------------------------------------
create table public.livestock_health (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  event_id uuid references public.livestock_events(id) on delete set null,
  record_date date not null,
  symptom text,
  diagnosis text,
  treatment text,
  medication text,
  dosage text,
  withdrawal_days int,
  vet_name text,
  vet_contact text,
  cost numeric(14,2),
  follow_up_date date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger livestock_health_created_by before insert on public.livestock_health
  for each row execute function public.set_created_by();
create index livestock_health_batch_idx on public.livestock_health (batch_id, record_date);

-- ---------------------------------------------------------------------
-- Livestock Feed (feed consumption records)
-- ---------------------------------------------------------------------
create table public.livestock_feed (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  event_id uuid references public.livestock_events(id) on delete set null,
  inventory_item_id uuid, -- FK added after inventory_items
  feed_name text not null,
  feed_type text check (feed_type in ('starter','grower','finisher','layer','breeder','concentrate','roughage','supplement','other')),
  quantity_kg numeric(14,3) not null,
  unit_cost numeric(14,2),
  total_cost numeric(14,2) generated always as (quantity_kg * coalesce(unit_cost, 0)) stored,
  feed_date date not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger livestock_feed_created_by before insert on public.livestock_feed
  for each row execute function public.set_created_by();
create index livestock_feed_batch_idx on public.livestock_feed (batch_id, feed_date);

-- ---------------------------------------------------------------------
-- Livestock Sales
-- ---------------------------------------------------------------------
create table public.livestock_sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.livestock_batches(id) on delete cascade,
  event_id uuid references public.livestock_events(id) on delete set null,
  sale_date date not null,
  quantity int not null check (quantity > 0),
  unit text not null default 'head',
  weight_kg numeric(8,3),
  unit_price numeric(14,2) not null,
  total_revenue numeric(14,2) generated always as (quantity * unit_price) stored,
  customer_name text,
  customer_contact text,
  payment_status text not null default 'pending' check (payment_status in ('pending','partial','paid')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger livestock_sales_created_by before insert on public.livestock_sales
  for each row execute function public.set_created_by();
create index livestock_sales_batch_idx on public.livestock_sales (batch_id, sale_date);

-- ---------------------------------------------------------------------
-- RLS Policies (canonical pattern: org-scoped via neon_auth.member)
-- ---------------------------------------------------------------------
alter table public.seasons enable row level security;
create policy seasons_select on public.seasons for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy seasons_insert on public.seasons for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy seasons_update on public.seasons for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy seasons_delete on public.seasons for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.crops enable row level security;
create policy crops_select on public.crops for select using (true); -- reference data

alter table public.crop_varieties enable row level security;
create policy crop_varieties_select on public.crop_varieties for select using (true);

alter table public.crop_seasons enable row level security;
create policy crop_seasons_select on public.crop_seasons for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy crop_seasons_insert on public.crop_seasons for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist','worker']));
create policy crop_seasons_update on public.crop_seasons for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy crop_seasons_delete on public.crop_seasons for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.crop_activities enable row level security;
create policy crop_activities_select on public.crop_activities for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy crop_activities_insert on public.crop_activities for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist','worker']));
create policy crop_activities_update on public.crop_activities for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy crop_activities_delete on public.crop_activities for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.crop_inputs enable row level security;
create policy crop_inputs_select on public.crop_inputs for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy crop_inputs_insert on public.crop_inputs for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist','worker','inventory_manager']));
create policy crop_inputs_update on public.crop_inputs for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist','inventory_manager']));
create policy crop_inputs_delete on public.crop_inputs for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.harvests enable row level security;
create policy harvests_select on public.harvests for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy harvests_insert on public.harvests for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist','worker']));
create policy harvests_update on public.harvests for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','agronomist']));
create policy harvests_delete on public.harvests for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.livestock_species enable row level security;
create policy livestock_species_select on public.livestock_species for select using (true);

alter table public.livestock_groups enable row level security;
create policy livestock_groups_select on public.livestock_groups for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy livestock_groups_insert on public.livestock_groups for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_groups_update on public.livestock_groups for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_groups_delete on public.livestock_groups for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.livestock_batches enable row level security;
create policy livestock_batches_select on public.livestock_batches for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy livestock_batches_insert on public.livestock_batches for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian','worker']));
create policy livestock_batches_update on public.livestock_batches for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_batches_delete on public.livestock_batches for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.livestock_events enable row level security;
create policy livestock_events_select on public.livestock_events for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy livestock_events_insert on public.livestock_events for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian','worker']));
create policy livestock_events_update on public.livestock_events for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_events_delete on public.livestock_events for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.livestock_health enable row level security;
create policy livestock_health_select on public.livestock_health for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy livestock_health_insert on public.livestock_health for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_health_update on public.livestock_health for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_health_delete on public.livestock_health for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.livestock_feed enable row level security;
create policy livestock_feed_select on public.livestock_feed for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy livestock_feed_insert on public.livestock_feed for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian','worker','inventory_manager']));
create policy livestock_feed_update on public.livestock_feed for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian','inventory_manager']));
create policy livestock_feed_delete on public.livestock_feed for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.livestock_sales enable row level security;
create policy livestock_sales_select on public.livestock_sales for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy livestock_sales_insert on public.livestock_sales for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_sales_update on public.livestock_sales for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','veterinarian']));
create policy livestock_sales_delete on public.livestock_sales for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- ---------------------------------------------------------------------
-- Audit triggers for key tables
-- ---------------------------------------------------------------------
create or replace function public.audit_crop_seasons() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (NEW.organization_id, public.app_uid(), 'crop_seasons.' || TG_OP, 'crop_season', NEW.id,
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end);
  return NEW;
end $$;
create trigger audit_crop_seasons after insert or update or delete on public.crop_seasons
  for each row execute function public.audit_crop_seasons();

create or replace function public.audit_livestock_batches() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (NEW.organization_id, public.app_uid(), 'livestock_batches.' || TG_OP, 'livestock_batch', NEW.id,
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end);
  return NEW;
end $$;
create trigger audit_livestock_batches after insert or update or delete on public.livestock_batches
  for each row execute function public.audit_livestock_batches();