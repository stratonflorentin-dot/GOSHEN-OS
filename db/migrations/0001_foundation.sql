-- =====================================================================
-- 0001_foundation.sql — Phase 1 (docs/03-database-schema.md §1–2, §13)
-- Neon / Lakebase Postgres edition.
--
-- Identity: Neon Auth (Managed Better Auth). Users live in neon_auth."user"
-- (id uuid). Tenant authorization uses the transaction-local setting
-- app.user_id, set by the application per request (lib/db withUser()).
-- SECURITY DEFINER helpers owned by the table owner bypass RLS by design;
-- the application connects as the non-owner role goshen_app, which is fully
-- subject to RLS (docs/05-security-model.md).
-- =====================================================================

create extension if not exists postgis;

-- ---------------------------------------------------------------------
-- Common trigger functions
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', TG_TABLE_NAME;
end $$;

-- Caller identity from the transaction-local app.user_id setting.
create or replace function public.app_uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function public.set_created_by() returns trigger
language plpgsql as $$
begin
  if new.created_by is null then
    new.created_by := public.app_uid();
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Identity (profiles mirror neon_auth."user")
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
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
  country char(2) not null default 'TZ',
  default_currency char(3) not null default 'TZS',
  timezone text not null default 'Africa/Dar_es_Salaam',
  status text not null default 'active' check (status in ('active','suspended','cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

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
  user_id uuid not null references public.profiles(id) on delete cascade,
  farm_id uuid not null, -- FK added after farms
  role text not null check (role in ('owner','admin','manager','accountant',
      'agronomist','veterinarian','inventory_manager','worker','viewer')),
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','manager','accountant','agronomist',
      'veterinarian','inventory_manager','worker','viewer')),
  token text not null unique default substring(md5(random()::text || clock_timestamp()::text) from 1 for 48),
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

create table public.roles ( -- reserved for granular model (Phase 12+)
  code text primary key,
  name text not null,
  scope text not null check (scope in ('organization','farm','platform'))
);
create table public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_key text not null,
  allowed boolean not null default true,
  primary key (role_code, permission_key)
);

-- ---------------------------------------------------------------------
-- Farms & GIS base
-- ---------------------------------------------------------------------
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
  boundary geometry(Polygon,4326),
  boundary_source text check (boundary_source in ('gps_walk','manual_draw','geojson_import','kml_import','survey')),
  area_m2 numeric(14,2) generated always as
    (case when boundary is null then null else ST_Area(boundary::geography) end) stored,
  centroid geography(Point,4326) generated always as
    (case when boundary is null then null else ST_Centroid(boundary)::geography end) stored,
  elevation_m numeric(8,2),
  currency char(3) not null default 'TZS',
  timezone text not null default 'Africa/Dar_es_Salaam',
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create trigger farms_touch before update on public.farms
  for each row execute function public.touch_updated_at();
create trigger farms_created_by before insert on public.farms
  for each row execute function public.set_created_by();
create index farms_org_idx on public.farms (organization_id) where status = 'active';
create index farms_boundary_gix on public.farms using gist (boundary);

alter table public.farm_members
  add constraint farm_members_farm_fk foreign key (farm_id) references public.farms(id) on delete cascade;

create table public.farm_boundary_versions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  boundary geometry(Polygon,4326) not null,
  source text not null check (source in ('gps_walk','manual_draw','geojson_import','kml_import','survey')),
  raw_gps_points jsonb,
  point_count int,
  accuracy_summary jsonb,
  area_m2 numeric(14,2) not null,
  perimeter_m numeric(14,2) not null,
  validation jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger fbv_created_by before insert on public.farm_boundary_versions
  for each row execute function public.set_created_by();
create trigger fbv_immutable before update or delete on public.farm_boundary_versions
  for each row execute function public.forbid_mutation();
create index fbv_farm_idx on public.farm_boundary_versions (farm_id, created_at desc);
create index fbv_gix on public.farm_boundary_versions using gist (boundary);

create table public.farm_settings (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger farm_settings_touch before update on public.farm_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Billing scaffolding (docs/03 §13; pricing stays config-driven)
-- ---------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  limits jsonb not null default '{}'::jsonb
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','cancelled','expired')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null,
  period date not null,
  value numeric(14,2) not null default 0,
  unique (organization_id, metric, period)
);

-- ---------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references public.profiles(id),
  actor_scope text not null default 'organization'
    check (actor_scope in ('organization','platform','system')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  reason text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_org_idx on public.audit_logs (organization_id, created_at desc);
create index audit_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER, STABLE — docs/05 §3)
-- Owned by the table owner; bypass RLS by design (trusted membership checks).
-- The application role is subject to RLS and never reads these tables directly.
-- ---------------------------------------------------------------------
create or replace function public.user_org_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members
  where user_id = public.app_uid() and status = 'active';
$$;

create or replace function public.org_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.organization_members
  where organization_id = p_org and user_id = public.app_uid() and status = 'active';
$$;

create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.org_role(p_org) is not null;
$$;

create or replace function public.has_org_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select public.org_role(p_org) = any (p_roles);
$$;

create or replace function public.farm_org(p_farm uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.farms where id = p_farm;
$$;

create or replace function public.farm_role(p_farm uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text;
  v_org uuid;
begin
  select role into v_role from public.farm_members
  where farm_id = p_farm and user_id = public.app_uid();
  if v_role is not null then return v_role; end if;
  select organization_id into v_org from public.farms where id = p_farm;
  return public.org_role(v_org);
end $$;

create or replace function public.is_farm_member(p_farm uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.farm_role(p_farm) is not null;
$$;

create or replace function public.has_farm_role(p_farm uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select public.farm_role(p_farm) = any (p_roles);
$$;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = public.app_uid());
$$;

-- ---------------------------------------------------------------------
-- Tenant business functions (SECURITY DEFINER, audited)
-- ---------------------------------------------------------------------
-- Organization creation: no direct INSERT policy; creator becomes owner
-- and a trialing subscription is attached atomically.
create or replace function public.create_organization(
  p_name text,
  p_country char default 'TZ',
  p_currency char default 'TZS',
  p_timezone text default 'Africa/Dar_es_Salaam'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.app_uid();
  v_org uuid;
  v_plan uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if length(btrim(p_name)) < 2 or length(btrim(p_name)) > 120 then
    raise exception 'Organization name must be 2-120 characters';
  end if;

  insert into public.profiles (id, full_name)
  values (v_uid, coalesce((select name from neon_auth."user" where id = v_uid), ''))
  on conflict (id) do nothing;

  insert into public.organizations (name, country, default_currency, timezone, created_by)
  values (btrim(p_name), p_country, p_currency, p_timezone, v_uid)
  returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org, v_uid, 'owner', 'active');

  select id into v_plan from public.plans where code = 'trial';
  if v_plan is null then
    insert into public.plans (code, name, limits)
    values ('trial', 'Trial', '{"farms":3,"users":3,"hectares":50,"storage_mb":500,"ai_requests_month":50,"reports_month":10,"advanced_analytics":false}'::jsonb)
    returning id into v_plan;
  end if;

  insert into public.subscriptions
    (organization_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
  values
    (v_org, v_plan, 'trialing', now() + interval '14 days', now(), now() + interval '14 days');

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after)
  values (v_org, v_uid, 'organizations.create', 'organization', v_org,
          jsonb_build_object('name', btrim(p_name), 'country', p_country));

  return v_org;
end $$;

-- Invitation acceptance
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.app_uid();
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_inv from public.invitations
  where token = p_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'Invitation invalid or expired'; end if;

  insert into public.profiles (id, full_name)
  values (v_uid, coalesce((select name from neon_auth."user" where id = v_uid), ''))
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_inv.organization_id, v_uid, v_inv.role, 'active')
  on conflict (organization_id, user_id)
  do update set role = excluded.role, status = 'active';

  update public.invitations set accepted_at = now() where id = v_inv.id;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id)
  values (v_inv.organization_id, v_uid, 'organization_members.joined',
          'organization', v_inv.organization_id);

  return v_inv.organization_id;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security (docs/05 §4 canonical pattern)
-- The application role (goshen_app) is non-owner and fully subject to RLS.
-- SECURITY DEFINER helpers bypass RLS (owner), which is the trusted path.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select
  using (id = public.app_uid());
create policy profiles_insert on public.profiles for insert
  with check (id = public.app_uid());
create policy profiles_update on public.profiles for update
  using (id = public.app_uid()) with check (id = public.app_uid());

alter table public.organizations enable row level security;
create policy organizations_select on public.organizations for select
  using (public.is_org_member(id) or public.is_platform_admin());
create policy organizations_update on public.organizations for update
  using (public.has_org_role(id, array['owner','admin']))
  with check (public.has_org_role(id, array['owner','admin']));
-- No insert/delete policies: creation via create_organization RPC.

alter table public.organization_members enable row level security;
create policy organization_members_select on public.organization_members for select
  using (user_id = public.app_uid() or public.is_org_member(organization_id));
create policy organization_members_insert on public.organization_members for insert
  with check (public.has_org_role(organization_id, array['owner','admin']));
create policy organization_members_update on public.organization_members for update
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

alter table public.farm_members enable row level security;
create policy farm_members_select on public.farm_members for select
  using (user_id = public.app_uid() or public.is_org_member(public.farm_org(farm_id)));
create policy farm_members_insert on public.farm_members for insert
  with check (public.has_org_role(public.farm_org(farm_id), array['owner','admin']));
create policy farm_members_update on public.farm_members for update
  using (public.has_org_role(public.farm_org(farm_id), array['owner','admin']))
  with check (public.has_org_role(public.farm_org(farm_id), array['owner','admin']));

alter table public.invitations enable row level security;
create policy invitations_select on public.invitations for select
  using (public.has_org_role(organization_id, array['owner','admin']));
create policy invitations_insert on public.invitations for insert
  with check (public.has_org_role(organization_id, array['owner','admin']));
create policy invitations_update on public.invitations for update
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

alter table public.farms enable row level security;
create policy farms_select on public.farms for select
  using (public.is_org_member(organization_id) or public.is_farm_member(id));
create policy farms_insert on public.farms for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy farms_update on public.farms for update
  using (public.has_org_role(organization_id, array['owner','admin','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));
-- No delete: farms are archived via status.

alter table public.farm_boundary_versions enable row level security;
create policy fbv_select on public.farm_boundary_versions for select
  using (public.is_org_member(organization_id));
create policy fbv_insert on public.farm_boundary_versions for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','worker']));

alter table public.farm_settings enable row level security;
create policy farm_settings_select on public.farm_settings for select
  using (public.is_org_member(organization_id));
create policy farm_settings_insert on public.farm_settings for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));
create policy farm_settings_update on public.farm_settings for update
  using (public.has_org_role(organization_id, array['owner','admin','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager']));

alter table public.plans enable row level security;
create policy plans_select on public.plans for select using (true);

alter table public.subscriptions enable row level security;
create policy subscriptions_select on public.subscriptions for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
-- Writes via definer RPC only.

alter table public.usage_records enable row level security;
create policy usage_records_select on public.usage_records for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());

alter table public.audit_logs enable row level security;
create policy audit_logs_select on public.audit_logs for select
  using (organization_id is not null and public.has_org_role(organization_id,
      array['owner','admin','manager','accountant']));
create policy audit_logs_insert on public.audit_logs for insert
  with check (actor_id = public.app_uid() or public.is_platform_admin());

alter table public.platform_admins enable row level security;
create policy platform_admins_select on public.platform_admins for select
  using (public.is_platform_admin());

alter table public.roles enable row level security;
create policy roles_select on public.roles for select using (true);
alter table public.role_permissions enable row level security;
create policy role_permissions_select on public.role_permissions for select using (true);
