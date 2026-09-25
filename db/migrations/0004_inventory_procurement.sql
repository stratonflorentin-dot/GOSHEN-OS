-- =====================================================================
-- 0004_inventory_procurement.sql — Phase 4 (docs/03-database-schema.md §5–6, §16–17)
-- Neon / Lakebase Postgres edition.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Inventory Categories
-- ---------------------------------------------------------------------
create table public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  code text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  parent_id uuid references public.inventory_categories(id) on delete set null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create trigger inventory_categories_touch before update on public.inventory_categories
  for each row execute function public.touch_updated_at();
create trigger inventory_categories_created_by before insert on public.inventory_categories
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- Inventory Items
-- ---------------------------------------------------------------------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null references public.inventory_categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 160),
  code text not null check (code ~ '^[a-z0-9_-]{2,60}$'),
  description text,
  unit text not null check (length(btrim(unit)) between 1 and 20),
  conversion_factor numeric(14,6) not null default 1, -- to base unit
  base_unit text not null,
  min_stock_level numeric(14,3) default 0,
  max_stock_level numeric(14,3),
  reorder_point numeric(14,3),
  default_supplier_id uuid, -- FK added after suppliers
  cost_method text not null default 'fifo' check (cost_method in ('fifo','lifo','average','standard')),
  standard_cost numeric(14,2),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create trigger inventory_items_touch before update on public.inventory_items
  for each row execute function public.touch_updated_at();
create trigger inventory_items_created_by before insert on public.inventory_items
  for each row execute function public.set_created_by();
create index inventory_items_org_idx on public.inventory_items (organization_id, is_active);
create index inventory_items_cat_idx on public.inventory_items (category_id);

-- ---------------------------------------------------------------------
-- Inventory Locations (warehouses, stores, silos, cold rooms)
-- ---------------------------------------------------------------------
create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 120),
  code text not null check (code ~ '^[a-z0-9_-]{2,40}$'),
  location_type text not null check (location_type in ('warehouse','store','cold_room','silo','field','other')),
  capacity numeric(14,2),
  capacity_unit text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create trigger inventory_locations_touch before update on public.inventory_locations
  for each row execute function public.touch_updated_at();
create trigger inventory_locations_created_by before insert on public.inventory_locations
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- Inventory Movements (append-only ledger)
-- ---------------------------------------------------------------------
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  movement_type text not null check (movement_type in (
    'purchase_receipt','production_receipt','transfer_in','transfer_out',
    'consumption','adjustment_in','adjustment_out','loss','spoilage',
    'sale_shipment','return_in','return_out','opening_balance'
  )),
  quantity numeric(14,3) not null,
  unit text not null,
  unit_cost numeric(14,2),
  total_cost numeric(14,2) generated always as (quantity * coalesce(unit_cost, 0)) stored,
  reference_type text, -- 'purchase_order', 'crop_activity', 'livestock_event', 'sale', etc.
  reference_id uuid,
  batch_number text,
  expiry_date date,
  movement_date timestamptz not null default now(),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create trigger inventory_movements_created_by before insert on public.inventory_movements
  for each row execute function public.set_created_by();
create trigger inventory_movements_immutable before update or delete on public.inventory_movements
  for each row execute function public.forbid_mutation();
create index inventory_movements_item_idx on public.inventory_movements (item_id, movement_date desc);
create index inventory_movements_loc_idx on public.inventory_movements (location_id, movement_date desc);
create index inventory_movements_ref_idx on public.inventory_movements (reference_type, reference_id);

-- ---------------------------------------------------------------------
-- Inventory Balances (materialized view for fast reads)
-- ---------------------------------------------------------------------
create table public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  avg_unit_cost numeric(14,2),
  last_movement_id uuid references public.inventory_movements(id),
  updated_at timestamptz not null default now(),
  unique (item_id, location_id)
);
create trigger inventory_balances_touch before update on public.inventory_balances
  for each row execute function public.touch_updated_at();
create index inventory_balances_org_idx on public.inventory_balances (organization_id);

-- ---------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  code text not null check (code ~ '^[a-z0-9_-]{2,60}$'),
  contact_person text,
  email text,
  phone text,
  address text,
  country char(2) default 'TZ',
  tax_id text,
  payment_terms text, -- e.g., "Net 30"
  currency char(3) default 'TZS',
  is_active boolean not null default true,
  rating numeric(3,2) check (rating >= 0 and rating <= 5),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();
create trigger suppliers_created_by before insert on public.suppliers
  for each row execute function public.set_created_by();

-- Add FK from inventory_items to suppliers
alter table public.inventory_items
  add constraint inventory_items_supplier_fk
  foreign key (default_supplier_id) references public.suppliers(id) on delete set null;

-- ---------------------------------------------------------------------
-- Purchase Requests
-- ---------------------------------------------------------------------
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_number text not null,
  requested_by uuid not null references public.profiles(id),
  request_date date not null default now(),
  required_date date,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','converted','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, request_number)
);
create trigger purchase_requests_touch before update on public.purchase_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Purchase Request Lines
-- ---------------------------------------------------------------------
create table public.purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null,
  estimated_unit_cost numeric(14,2),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Purchase Orders
-- ---------------------------------------------------------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_number text not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  request_id uuid references public.purchase_requests(id) on delete set null,
  order_date date not null default now(),
  expected_delivery_date date,
  status text not null default 'draft' check (status in ('draft','sent','acknowledged','partial','received','cancelled')),
  currency char(3) not null default 'TZS',
  exchange_rate numeric(14,6) default 1,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) generated always as (subtotal + tax_amount - discount_amount) stored,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);
create trigger purchase_orders_touch before update on public.purchase_orders
  for each row execute function public.touch_updated_at();
create trigger purchase_orders_created_by before insert on public.purchase_orders
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- Purchase Order Lines
-- ---------------------------------------------------------------------
create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null,
  unit_price numeric(14,2) not null,
  tax_rate numeric(5,2) default 0,
  discount_rate numeric(5,2) default 0,
  line_total numeric(14,2) generated always as (quantity * unit_price * (1 + tax_rate/100) * (1 - discount_rate/100)) stored,
  received_quantity numeric(14,3) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Goods Receipts
-- ---------------------------------------------------------------------
create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receipt_number text not null,
  order_id uuid not null references public.purchase_orders(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  receipt_date date not null default now(),
  received_by uuid not null references public.profiles(id),
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','partial','complete','rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, receipt_number)
);
create trigger goods_receipts_touch before update on public.goods_receipts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Goods Receipt Lines
-- ---------------------------------------------------------------------
create table public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.goods_receipts(id) on delete cascade,
  order_line_id uuid not null references public.purchase_order_lines(id) on delete restrict,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null,
  unit_cost numeric(14,2),
  batch_number text,
  expiry_date date,
  quality_status text not null default 'accepted' check (quality_status in ('accepted','rejected','quarantine')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Supplier Invoices
-- ---------------------------------------------------------------------
create table public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_number text not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  order_id uuid references public.purchase_orders(id) on delete set null,
  receipt_id uuid references public.goods_receipts(id) on delete set null,
  invoice_date date not null,
  due_date date,
  currency char(3) not null default 'TZS',
  exchange_rate numeric(14,6) default 1,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) generated always as (subtotal + tax_amount) stored,
  status text not null default 'pending' check (status in ('pending','approved','paid','disputed','cancelled')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);
create trigger supplier_invoices_touch before update on public.supplier_invoices
  for each row execute function public.touch_updated_at();
create trigger supplier_invoices_created_by before insert on public.supplier_invoices
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------
alter table public.inventory_categories enable row level security;
create policy inventory_categories_select on public.inventory_categories for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy inventory_categories_insert on public.inventory_categories for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_categories_update on public.inventory_categories for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_categories_delete on public.inventory_categories for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.inventory_items enable row level security;
create policy inventory_items_select on public.inventory_items for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy inventory_items_insert on public.inventory_items for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_items_update on public.inventory_items for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_items_delete on public.inventory_items for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.inventory_locations enable row level security;
create policy inventory_locations_select on public.inventory_locations for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy inventory_locations_insert on public.inventory_locations for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_locations_update on public.inventory_locations for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_locations_delete on public.inventory_locations for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.inventory_movements enable row level security;
create policy inventory_movements_select on public.inventory_movements for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy inventory_movements_insert on public.inventory_movements for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager','worker','agronomist','veterinarian']));
-- No update/delete: append-only

alter table public.inventory_balances enable row level security;
create policy inventory_balances_select on public.inventory_balances for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy inventory_balances_insert on public.inventory_balances for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_balances_update on public.inventory_balances for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy inventory_balances_delete on public.inventory_balances for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.suppliers enable row level security;
create policy suppliers_select on public.suppliers for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy suppliers_insert on public.suppliers for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy suppliers_update on public.suppliers for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy suppliers_delete on public.suppliers for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.purchase_requests enable row level security;
create policy purchase_requests_select on public.purchase_requests for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy purchase_requests_insert on public.purchase_requests for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager','worker']));
create policy purchase_requests_update on public.purchase_requests for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy purchase_requests_delete on public.purchase_requests for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.purchase_request_lines enable row level security;
create policy purchase_request_lines_select on public.purchase_request_lines for select
  using (public.is_org_member((select organization_id from public.purchase_requests where id = request_id)) or public.is_platform_admin());
create policy purchase_request_lines_insert on public.purchase_request_lines for insert
  with check (public.has_org_role((select organization_id from public.purchase_requests where id = request_id), array['owner','admin','manager','inventory_manager','worker']));
create policy purchase_request_lines_update on public.purchase_request_lines for update
  using (public.has_org_role((select organization_id from public.purchase_requests where id = request_id), array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role((select organization_id from public.purchase_requests where id = request_id), array['owner','admin','manager','inventory_manager']));
create policy purchase_request_lines_delete on public.purchase_request_lines for delete
  using (public.has_org_role((select organization_id from public.purchase_requests where id = request_id), array['owner','admin']));

alter table public.purchase_orders enable row level security;
create policy purchase_orders_select on public.purchase_orders for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy purchase_orders_insert on public.purchase_orders for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy purchase_orders_update on public.purchase_orders for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy purchase_orders_delete on public.purchase_orders for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.purchase_order_lines enable row level security;
create policy purchase_order_lines_select on public.purchase_order_lines for select
  using (public.is_org_member((select organization_id from public.purchase_orders where id = order_id)) or public.is_platform_admin());
create policy purchase_order_lines_insert on public.purchase_order_lines for insert
  with check (public.has_org_role((select organization_id from public.purchase_orders where id = order_id), array['owner','admin','manager','inventory_manager']));
create policy purchase_order_lines_update on public.purchase_order_lines for update
  using (public.has_org_role((select organization_id from public.purchase_orders where id = order_id), array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role((select organization_id from public.purchase_orders where id = order_id), array['owner','admin','manager','inventory_manager']));
create policy purchase_order_lines_delete on public.purchase_order_lines for delete
  using (public.has_org_role((select organization_id from public.purchase_orders where id = order_id), array['owner','admin']));

alter table public.goods_receipts enable row level security;
create policy goods_receipts_select on public.goods_receipts for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy goods_receipts_insert on public.goods_receipts for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager','worker']));
create policy goods_receipts_update on public.goods_receipts for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager']));
create policy goods_receipts_delete on public.goods_receipts for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.goods_receipt_lines enable row level security;
create policy goods_receipt_lines_select on public.goods_receipt_lines for select
  using (public.is_org_member((select organization_id from public.goods_receipts where id = receipt_id)) or public.is_platform_admin());
create policy goods_receipt_lines_insert on public.goods_receipt_lines for insert
  with check (public.has_org_role((select organization_id from public.goods_receipts where id = receipt_id), array['owner','admin','manager','inventory_manager','worker']));
create policy goods_receipt_lines_update on public.goods_receipt_lines for update
  using (public.has_org_role((select organization_id from public.goods_receipts where id = receipt_id), array['owner','admin','manager','inventory_manager']))
  with check (public.has_org_role((select organization_id from public.goods_receipts where id = receipt_id), array['owner','admin','manager','inventory_manager']));
create policy goods_receipt_lines_delete on public.goods_receipt_lines for delete
  using (public.has_org_role((select organization_id from public.goods_receipts where id = receipt_id), array['owner','admin']));

alter table public.supplier_invoices enable row level security;
create policy supplier_invoices_select on public.supplier_invoices for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy supplier_invoices_insert on public.supplier_invoices for insert
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager','accountant']));
create policy supplier_invoices_update on public.supplier_invoices for update
  using (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','manager','inventory_manager','accountant']));
create policy supplier_invoices_delete on public.supplier_invoices for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- ---------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------
create or replace function public.audit_inventory_movements() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (NEW.organization_id, public.app_uid(), 'inventory_movements.' || TG_OP, 'inventory_movement', NEW.id,
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end);
  return NEW;
end $$;
create trigger audit_inventory_movements after insert on public.inventory_movements
  for each row execute function public.audit_inventory_movements();

create or replace function public.audit_purchase_orders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (NEW.organization_id, public.app_uid(), 'purchase_orders.' || TG_OP, 'purchase_order', NEW.id,
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end);
  return NEW;
end $$;
create trigger audit_purchase_orders after insert or update or delete on public.purchase_orders
  for each row execute function public.audit_purchase_orders();