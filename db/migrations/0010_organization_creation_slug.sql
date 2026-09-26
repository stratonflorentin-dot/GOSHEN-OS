-- Organization creation must populate the required unique slug. Use text
-- inputs so country/currency are not truncated by PostgreSQL's char(1) default.
drop function if exists public.create_organization(text, character, character, text);

create or replace function public.create_organization(
  p_name text,
  p_country text default 'TZ',
  p_currency text default 'TZS',
  p_timezone text default 'Africa/Dar_es_Salaam'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.app_uid();
  v_org uuid;
  v_plan uuid;
  v_slug_base text;
  v_slug text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if length(btrim(p_name)) < 2 or length(btrim(p_name)) > 120 then
    raise exception 'Organization name must be 2-120 characters';
  end if;
  if p_country !~* '^[a-z]{2}$' then
    raise exception 'Country must be a two-letter ISO code';
  end if;
  if p_currency !~* '^[a-z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code';
  end if;

  insert into public.profiles (id, full_name)
  values (v_uid, coalesce((select name from auth."user" where id = v_uid), ''))
  on conflict (id) do nothing;

  v_slug_base := left(
    trim(both '-' from regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g')),
    47
  );
  if v_slug_base = '' then v_slug_base := 'organization'; end if;

  -- The short random suffix keeps organization slugs unique without a race
  -- between a preflight SELECT and the INSERT.
  loop
    v_slug := trim(both '-' from v_slug_base) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    insert into public.organizations
      (name, slug, country, default_currency, timezone, created_by)
    values
      (btrim(p_name), v_slug, upper(p_country), upper(p_currency), p_timezone, v_uid)
    on conflict (slug) do nothing
    returning id into v_org;
    exit when v_org is not null;
  end loop;

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
          jsonb_build_object('name', btrim(p_name), 'country', upper(p_country)));

  return v_org;
end;
$$;

grant execute on function public.create_organization(text, text, text, text) to public;
