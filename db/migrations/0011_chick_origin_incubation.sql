-- Poultry origin, hatchery purchasing and on-farm incubation traceability.
-- Existing livestock batches remain valid; new poultry batches are required
-- to carry an origin by the application workflow.

create table if not exists public.hatcheries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  contact_name text,
  phone text,
  email text,
  location text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.hatchery_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  hatchery_id uuid references public.hatcheries(id) on delete set null,
  supplier_name text not null,
  order_number text,
  batch_reference text,
  order_date date not null,
  delivery_date date,
  breed text,
  strain text,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_delivered integer not null default 0 check (quantity_delivered >= 0),
  dead_on_arrival integer not null default 0 check (dead_on_arrival >= 0),
  price_per_chick numeric(14,2) not null default 0 check (price_per_chick >= 0),
  transport_cost numeric(14,2) not null default 0 check (transport_cost >= 0),
  other_cost numeric(14,2) not null default 0 check (other_cost >= 0),
  vaccination_info text,
  document_urls jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (dead_on_arrival <= quantity_delivered)
);
create index if not exists hatchery_orders_farm_date_idx on public.hatchery_orders(farm_id, order_date desc);
create unique index if not exists hatchery_orders_reference_uq on public.hatchery_orders(organization_id, supplier_name, order_number) where order_number is not null;

create table if not exists public.incubators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  capacity integer not null check (capacity > 0),
  location text,
  manufacturer text,
  model text,
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  monitors_temperature boolean not null default false,
  monitors_humidity boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, farm_id, name)
);

create table if not exists public.incubation_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  incubator_id uuid not null references public.incubators(id) on delete restrict,
  batch_code text not null,
  start_date date not null,
  expected_hatch_date date,
  actual_hatch_date date,
  egg_source text not null check (egg_source in ('farm_breeders','purchased_fertile_eggs','another_farm','other')),
  egg_source_details text,
  document_urls jsonb not null default '[]'::jsonb,
  breed text,
  strain text,
  eggs_loaded integer not null check (eggs_loaded > 0),
  fertile_eggs integer not null default 0 check (fertile_eggs >= 0),
  infertile_eggs integer not null default 0 check (infertile_eggs >= 0),
  cracked_or_damaged integer not null default 0 check (cracked_or_damaged >= 0),
  embryonic_losses integer not null default 0 check (embryonic_losses >= 0),
  hatched integer not null default 0 check (hatched >= 0),
  weak_chicks integer not null default 0 check (weak_chicks >= 0),
  dead_at_hatch integer not null default 0 check (dead_at_hatch >= 0),
  healthy_chicks integer not null default 0 check (healthy_chicks >= 0),
  egg_cost numeric(14,2) not null default 0 check (egg_cost >= 0),
  operating_cost numeric(14,2) not null default 0 check (operating_cost >= 0),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, batch_code),
  check (fertile_eggs + infertile_eggs <= eggs_loaded),
  check (healthy_chicks + weak_chicks + dead_at_hatch <= hatched)
);
create index if not exists incubation_batches_farm_date_idx on public.incubation_batches(farm_id, start_date desc);

create table if not exists public.incubation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incubation_batch_id uuid not null references public.incubation_batches(id) on delete cascade,
  event_type text not null check (event_type in ('eggs_loaded','candling','turning','temperature_check','humidity_check','losses_recorded','hatch_completed','other')),
  event_at timestamptz not null default now(),
  temperature_c numeric(5,2),
  humidity_percent numeric(5,2) check (humidity_percent between 0 and 100),
  quantity integer check (quantity >= 0),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists incubation_events_batch_time_idx on public.incubation_events(incubation_batch_id, event_at desc);

create table if not exists public.incubation_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incubation_batch_id uuid not null references public.incubation_batches(id) on delete cascade,
  category text not null check (category in ('eggs','electricity','fuel','labor','incubator_operation','cleaning','transport','other')),
  amount numeric(14,2) not null check (amount >= 0),
  incurred_on date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists incubation_costs_batch_date_idx on public.incubation_costs(incubation_batch_id, incurred_on desc);

alter table public.livestock_batches
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_details text,
  add column if not exists source_cost numeric(14,2) check (source_cost is null or source_cost >= 0),
  add column if not exists breed text,
  add column if not exists strain text;
alter table public.livestock_batches
  add column if not exists season_id uuid references public.seasons(id) on delete set null;
create index if not exists livestock_batches_season_idx on public.livestock_batches(organization_id, season_id);
alter table public.livestock_batches drop constraint if exists livestock_batches_source_type_check;
alter table public.livestock_batches add constraint livestock_batches_source_type_check
  check (source_type is null or source_type in ('external_hatchery','farm_incubator','purchased_fertile_eggs','farm_eggs','farm_transfer','other','legacy_unrecorded'));
create index if not exists livestock_batches_source_idx on public.livestock_batches(organization_id, source_type, source_id);

create or replace function public.require_livestock_batch_origin() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Preserve historical rows with no origin, while requiring provenance on
  -- every new batch and preventing a recorded origin from being cleared.
  if NEW.source_type is null then
    if TG_OP = 'INSERT' then
      raise exception 'A source type is required for every new livestock batch';
    elsif OLD.source_type is not null then
      raise exception 'A source type is required for every new livestock batch';
    end if;
  elsif NEW.source_type in ('external_hatchery','farm_incubator') and NEW.source_id is null then
    raise exception 'Select the hatchery delivery or incubation batch for this source';
  elsif NEW.source_type in ('purchased_fertile_eggs','farm_eggs','farm_transfer','other') and nullif(btrim(NEW.source_details),'') is null then
    raise exception 'Describe the documented livestock source';
  end if;
  return NEW;
end $$;
drop trigger if exists livestock_batches_require_origin on public.livestock_batches;
create trigger livestock_batches_require_origin before insert or update of source_type,source_id,source_details on public.livestock_batches
for each row execute function public.require_livestock_batch_origin();

do $$
declare t text;
begin
  foreach t in array array['hatcheries','hatchery_orders','incubators','incubation_batches','incubation_events','incubation_costs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select using (public.is_org_member(organization_id) or public.is_platform_admin())', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert with check (public.has_org_role(organization_id, array[''owner'',''admin'',''manager'',''veterinarian'',''worker'']))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update using (public.has_org_role(organization_id, array[''owner'',''admin'',''manager'',''veterinarian''])) with check (public.has_org_role(organization_id, array[''owner'',''admin'',''manager'',''veterinarian'']))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete using (public.has_org_role(organization_id, array[''owner'',''admin'']))', t || '_delete', t);
    execute format('drop trigger if exists %I on public.%I', t || '_created_by', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.set_created_by()', t || '_created_by', t);
  end loop;
end $$;

-- Keep a durable audit trail for origin and hatch-production records.
create or replace function public.audit_chick_production() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if TG_OP = 'INSERT' then
    v_org := NEW.organization_id; v_id := NEW.id; v_after := to_jsonb(NEW);
  elsif TG_OP = 'DELETE' then
    v_org := OLD.organization_id; v_id := OLD.id; v_before := to_jsonb(OLD);
  else
    v_org := NEW.organization_id; v_id := NEW.id; v_before := to_jsonb(OLD); v_after := to_jsonb(NEW);
  end if;
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (
    v_org, public.app_uid(),
    TG_TABLE_NAME || '.' || TG_OP, TG_TABLE_NAME,
    v_id, v_before, v_after
  );
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end $$;

drop trigger if exists audit_hatcheries on public.hatcheries;
create trigger audit_hatcheries after insert or update or delete on public.hatcheries for each row execute function public.audit_chick_production();
drop trigger if exists audit_hatchery_orders on public.hatchery_orders;
create trigger audit_hatchery_orders after insert or update or delete on public.hatchery_orders for each row execute function public.audit_chick_production();
drop trigger if exists audit_incubators on public.incubators;
create trigger audit_incubators after insert or update or delete on public.incubators for each row execute function public.audit_chick_production();
drop trigger if exists audit_incubation_batches on public.incubation_batches;
create trigger audit_incubation_batches after insert or update or delete on public.incubation_batches for each row execute function public.audit_chick_production();
drop trigger if exists audit_incubation_events on public.incubation_events;
create trigger audit_incubation_events after insert or update or delete on public.incubation_events for each row execute function public.audit_chick_production();
drop trigger if exists audit_incubation_costs on public.incubation_costs;
create trigger audit_incubation_costs after insert or update or delete on public.incubation_costs for each row execute function public.audit_chick_production();
