-- =====================================================================
-- 0007_harvest_value.sql — add unit_price + total_value to harvests
-- =====================================================================
alter table public.harvests
  add column if not exists unit_price numeric(14,2) check (unit_price is null or unit_price >= 0),
  add column if not exists total_value numeric(14,2) generated always as
    (case when unit_price is null then null else quantity * unit_price end) stored;

create index if not exists harvests_value_idx on public.harvests (total_value desc) where total_value is not null;