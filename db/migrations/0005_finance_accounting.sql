-- =====================================================================
-- 0005_finance_accounting.sql — Phase 5 (docs/03-database-schema.md §7–8, §18–21)
-- Neon / Lakebase Postgres edition.
-- IDempotent version for safe re-execution
-- =====================================================================

-- ---------------------------------------------------------------------
-- Chart of Accounts
-- ---------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{3,10}$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  account_type text not null check (account_type in (
    'asset','liability','equity','revenue','expense','cost_of_goods_sold'
  )),
  parent_id uuid references public.accounts(id) on delete set null,
  currency char(3) not null default 'TZS',
  is_active boolean not null default true,
  is_system boolean not null default false, -- protected system accounts
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
drop trigger if exists accounts_touch on public.accounts;
create trigger accounts_touch before update on public.accounts
  for each row execute function public.touch_updated_at();
drop trigger if exists accounts_created_by on public.accounts;
create trigger accounts_created_by before insert on public.accounts
  for each row execute function public.set_created_by();
create index if not exists accounts_org_idx on public.accounts (organization_id, account_type, code);

-- ---------------------------------------------------------------------
-- Journal Entries (double-entry bookkeeping)
-- ---------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_number text not null,
  entry_date date not null,
  reference_type text, -- 'purchase_invoice', 'sale', 'payroll', 'asset_purchase', 'manual', etc.
  reference_id uuid,
  description text not null,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  posted_at timestamptz,
  posted_by uuid references public.profiles(id),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id),
  reversal_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entry_number)
);
drop trigger if exists journal_entries_touch on public.journal_entries;
create trigger journal_entries_touch before update on public.journal_entries
  for each row execute function public.touch_updated_at();
drop trigger if exists journal_entries_created_by on public.journal_entries;
create trigger journal_entries_created_by before insert on public.journal_entries
  for each row execute function public.set_created_by();
create index if not exists journal_entries_org_idx on public.journal_entries (organization_id, entry_date desc);
create index if not exists journal_entries_ref_idx on public.journal_entries (reference_type, reference_id);

-- ---------------------------------------------------------------------
-- Journal Lines (each line hits one account with debit or credit)
-- ---------------------------------------------------------------------
create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  description text,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  currency char(3) not null default 'TZS',
  exchange_rate numeric(14,6) default 1,
  farm_id uuid references public.farms(id) on delete set null,
  plot_id uuid, -- FK added after plots
  crop_season_id uuid, -- FK added after crop_seasons
  livestock_batch_id uuid, -- FK added after livestock_batches
  cost_center_id uuid, -- FK added after cost_centers
  created_at timestamptz not null default now()
);
create index if not exists journal_lines_entry_idx on public.journal_lines (entry_id);
create index if not exists journal_lines_account_idx on public.journal_lines (account_id, entry_id);
create index if not exists journal_lines_farm_idx on public.journal_lines (farm_id);
create index if not exists journal_lines_crop_idx on public.journal_lines (crop_season_id);
create index if not exists journal_lines_livestock_idx on public.journal_lines (livestock_batch_id);

-- ---------------------------------------------------------------------
-- Payments (cash/bank/mobile money movements)
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_number text not null,
  payment_date date not null,
  payment_type text not null check (payment_type in ('receipt','payment','transfer')),
  method text not null check (method in ('cash','bank_transfer','mobile_money','cheque','card','other')),
  account_id uuid not null references public.accounts(id) on delete restrict, -- cash/bank account
  counterparty_type text check (counterparty_type in ('customer','supplier','employee','owner','other')),
  counterparty_id uuid,
  counterparty_name text,
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'TZS',
  exchange_rate numeric(14,6) default 1,
  reference_type text, -- 'sale', 'purchase_invoice', 'payroll', 'loan', 'owner_draw', etc.
  reference_id uuid,
  status text not null default 'pending' check (status in ('pending','cleared','bounced','cancelled')),
  cleared_date date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, payment_number)
);
drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();
drop trigger if exists payments_created_by on public.payments;
create trigger payments_created_by before insert on public.payments
  for each row execute function public.set_created_by();
create index if not exists payments_org_idx on public.payments (organization_id, payment_date desc);
create index if not exists payments_ref_idx on public.payments (reference_type, reference_id);

-- ---------------------------------------------------------------------
-- Expenses (operational expenses linked to activities)
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_number text not null,
  expense_date date not null,
  account_id uuid not null references public.accounts(id) on delete restrict, -- expense account
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'TZS',
  exchange_rate numeric(14,6) default 1,
  vendor_name text,
  vendor_id uuid, -- FK to suppliers
  category text, -- 'fuel', 'fertilizer', 'seed', 'feed', 'medicine', 'labor', 'maintenance', etc.
  farm_id uuid references public.farms(id) on delete set null,
  plot_id uuid,
  crop_season_id uuid,
  livestock_batch_id uuid,
  payment_id uuid references public.payments(id) on delete set null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  description text,
  receipt_number text,
  receipt_file_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, expense_number)
);
drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();
drop trigger if exists expenses_created_by on public.expenses;
create trigger expenses_created_by before insert on public.expenses
  for each row execute function public.set_created_by();
create index if not exists expenses_org_idx on public.expenses (organization_id, expense_date desc);
create index if not exists expenses_farm_idx on public.expenses (farm_id);
create index if not exists expenses_crop_idx on public.expenses (crop_season_id);
create index if not exists expenses_livestock_idx on public.expenses (livestock_batch_id);

-- ---------------------------------------------------------------------
-- Revenues (sales revenue recognition)
-- ---------------------------------------------------------------------
create table if not exists public.revenues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  revenue_number text not null,
  revenue_date date not null,
  account_id uuid not null references public.accounts(id) on delete restrict, -- revenue account
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'TZS',
  exchange_rate numeric(14,6) default 1,
  customer_name text,
  customer_id uuid, -- FK to customers
  category text, -- 'crop_sale', 'livestock_sale', 'product_sale', 'service', etc.
  farm_id uuid references public.farms(id) on delete set null,
  crop_season_id uuid,
  livestock_batch_id uuid,
  payment_id uuid references public.payments(id) on delete set null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  description text,
  invoice_number text,
  invoice_file_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, revenue_number)
);
drop trigger if exists revenues_touch on public.revenues;
create trigger revenues_touch before update on public.revenues
  for each row execute function public.touch_updated_at();
drop trigger if exists revenues_created_by on public.revenues;
create trigger revenues_created_by before insert on public.revenues
  for each row execute function public.set_created_by();
create index if not exists revenues_org_idx on public.revenues (organization_id, revenue_date desc);
create index if not exists revenues_farm_idx on public.revenues (farm_id);
create index if not exists revenues_crop_idx on public.revenues (crop_season_id);
create index if not exists revenues_livestock_idx on public.revenues (livestock_batch_id);

-- ---------------------------------------------------------------------
-- Cost Allocations (distribute costs to farms/plots/crops/livestock)
-- ---------------------------------------------------------------------
create table if not exists public.cost_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check (source_type in (
    'expense','journal_entry','purchase_order','payroll','asset_depreciation'
  )),
  source_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'TZS',
  allocation_basis text not null check (allocation_basis in (
    'direct','area_proportional','head_count_proportional','manual'
  )),
  farm_id uuid references public.farms(id) on delete set null,
  plot_id uuid,
  crop_season_id uuid,
  livestock_batch_id uuid,
  cost_center_id uuid,
  allocation_date date not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
drop trigger if exists cost_allocations_created_by on public.cost_allocations;
create trigger cost_allocations_created_by before insert on public.cost_allocations
  for each row execute function public.set_created_by();
create index if not exists cost_allocations_org_idx on public.cost_allocations (organization_id, allocation_date desc);
create index if not exists cost_allocations_source_idx on public.cost_allocations (source_type, source_id);
create index if not exists cost_allocations_farm_idx on public.cost_allocations (farm_id);
create index if not exists cost_allocations_crop_idx on public.cost_allocations (crop_season_id);
create index if not exists cost_allocations_livestock_idx on public.cost_allocations (livestock_batch_id);

-- ---------------------------------------------------------------------
-- Cost Centers (departments, enterprises)
-- ---------------------------------------------------------------------
create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_-]{2,40}$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  description text,
  farm_id uuid references public.farms(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
drop trigger if exists cost_centers_touch on public.cost_centers;
create trigger cost_centers_touch before update on public.cost_centers
  for each row execute function public.touch_updated_at();
drop trigger if exists cost_centers_created_by on public.cost_centers;
create trigger cost_centers_created_by before insert on public.cost_centers
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- Assets (fixed assets register)
-- ---------------------------------------------------------------------
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_number text not null,
  name text not null check (length(btrim(name)) between 1 and 160),
  asset_type text not null check (asset_type in (
    'land','building','machinery','vehicle','equipment','irrigation','fencing','other'
  )),
  farm_id uuid references public.farms(id) on delete set null,
  location_id uuid references public.inventory_locations(id) on delete set null,
  purchase_date date,
  purchase_cost numeric(18,2),
  currency char(3) not null default 'TZS',
  useful_life_months int,
  depreciation_method text not null default 'straight_line' check (depreciation_method in ('straight_line','declining_balance','units_of_production')),
  salvage_value numeric(18,2) default 0,
  accumulated_depreciation numeric(18,2) not null default 0,
  last_depreciation_date date,
  status text not null default 'active' check (status in ('active','disposed','transferred','under_maintenance')),
  serial_number text,
  model text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  warranty_expiry date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_number)
);
drop trigger if exists assets_touch on public.assets;
create trigger assets_touch before update on public.assets
  for each row execute function public.touch_updated_at();
drop trigger if exists assets_created_by on public.assets;
create trigger assets_created_by before insert on public.assets
  for each row execute function public.set_created_by();
create index if not exists assets_org_idx on public.assets (organization_id, asset_type);
create index if not exists assets_farm_idx on public.assets (farm_id);

-- ---------------------------------------------------------------------
-- Loans
-- ---------------------------------------------------------------------
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  loan_number text not null,
  lender_name text not null,
  lender_type text not null check (lender_type in ('bank','microfinance','cooperative','individual','government','other')),
  principal_amount numeric(18,2) not null check (principal_amount > 0),
  currency char(3) not null default 'TZS',
  interest_rate numeric(6,4) not null, -- annual percentage rate
  interest_type text not null default 'fixed' check (interest_type in ('fixed','variable')),
  disbursement_date date not null,
  maturity_date date not null,
  repayment_frequency text not null check (repayment_frequency in ('monthly','quarterly','semi_annual','annual','bullet')),
  repayment_amount numeric(18,2),
  outstanding_principal numeric(18,2) not null,
  outstanding_interest numeric(18,2) not null default 0,
  status text not null default 'active' check (status in ('active','paid_off','defaulted','restructured','written_off')),
  collateral text,
  purpose text,
  farm_id uuid references public.farms(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, loan_number)
);
drop trigger if exists loans_touch on public.loans;
create trigger loans_touch before update on public.loans
  for each row execute function public.touch_updated_at();
drop trigger if exists loans_created_by on public.loans;
create trigger loans_created_by before insert on public.loans
  for each row execute function public.set_created_by();
create index if not exists loans_org_idx on public.loans (organization_id, status);

-- ---------------------------------------------------------------------
-- Loan Repayments
-- ---------------------------------------------------------------------
create table if not exists public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  repayment_date date not null,
  principal_amount numeric(18,2) not null default 0,
  interest_amount numeric(18,2) not null default 0,
  fees numeric(18,2) not null default 0,
  total_amount numeric(18,2) generated always as (principal_amount + interest_amount + fees) stored,
  payment_id uuid references public.payments(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
drop trigger if exists loan_repayments_created_by on public.loan_repayments;
create trigger loan_repayments_created_by before insert on public.loan_repayments
  for each row execute function public.set_created_by();
create index if not exists loan_repayments_loan_idx on public.loan_repayments (loan_id, repayment_date);

-- ---------------------------------------------------------------------
-- Owner Equity (contributions and withdrawals)
-- ---------------------------------------------------------------------
create table if not exists public.owner_equity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_number text not null,
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('contribution','withdrawal','profit_allocation','loss_allocation')),
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'TZS',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, transaction_number)
);
drop trigger if exists owner_equity_created_by on public.owner_equity;
create trigger owner_equity_created_by before insert on public.owner_equity
  for each row execute function public.set_created_by();
create index if not exists owner_equity_org_idx on public.owner_equity (organization_id, transaction_date desc);

-- ---------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------
alter table public.accounts enable row level security;
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists accounts_insert on public.accounts;
create policy accounts_insert on public.accounts for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists accounts_update on public.accounts;
create policy accounts_update on public.accounts for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists accounts_delete on public.accounts;
create policy accounts_delete on public.accounts for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.journal_entries enable row level security;
drop policy if exists journal_entries_select on public.journal_entries;
create policy journal_entries_select on public.journal_entries for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists journal_entries_insert on public.journal_entries;
create policy journal_entries_insert on public.journal_entries for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists journal_entries_update on public.journal_entries;
create policy journal_entries_update on public.journal_entries for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists journal_entries_delete on public.journal_entries;
create policy journal_entries_delete on public.journal_entries for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.journal_lines enable row level security;
drop policy if exists journal_lines_select on public.journal_lines;
create policy journal_lines_select on public.journal_lines for select
  using (public.is_org_member((select organization_id from public.journal_entries where id = entry_id)) or public.is_platform_admin());
drop policy if exists journal_lines_insert on public.journal_lines;
create policy journal_lines_insert on public.journal_lines for insert
  with check (public.has_org_role((select organization_id from public.journal_entries where id = entry_id), array['owner','admin','accountant']));
drop policy if exists journal_lines_update on public.journal_lines;
create policy journal_lines_update on public.journal_lines for update
  using (public.has_org_role((select organization_id from public.journal_entries where id = entry_id), array['owner','admin','accountant']))
  with check (public.has_org_role((select organization_id from public.journal_entries where id = entry_id), array['owner','admin','accountant']));
drop policy if exists journal_lines_delete on public.journal_lines;
create policy journal_lines_delete on public.journal_lines for delete
  using (public.has_org_role((select organization_id from public.journal_entries where id = entry_id), array['owner','admin']));

alter table public.payments enable row level security;
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.expenses enable row level security;
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager','inventory_manager']));
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.revenues enable row level security;
drop policy if exists revenues_select on public.revenues;
create policy revenues_select on public.revenues for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists revenues_insert on public.revenues;
create policy revenues_insert on public.revenues for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists revenues_update on public.revenues;
create policy revenues_update on public.revenues for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists revenues_delete on public.revenues;
create policy revenues_delete on public.revenues for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.cost_allocations enable row level security;
drop policy if exists cost_allocations_select on public.cost_allocations;
create policy cost_allocations_select on public.cost_allocations for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists cost_allocations_insert on public.cost_allocations;
create policy cost_allocations_insert on public.cost_allocations for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists cost_allocations_update on public.cost_allocations;
create policy cost_allocations_update on public.cost_allocations for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists cost_allocations_delete on public.cost_allocations;
create policy cost_allocations_delete on public.cost_allocations for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.cost_centers enable row level security;
drop policy if exists cost_centers_select on public.cost_centers;
create policy cost_centers_select on public.cost_centers for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists cost_centers_insert on public.cost_centers;
create policy cost_centers_insert on public.cost_centers for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists cost_centers_update on public.cost_centers;
create policy cost_centers_update on public.cost_centers for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists cost_centers_delete on public.cost_centers;
create policy cost_centers_delete on public.cost_centers for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.assets enable row level security;
drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists assets_update on public.assets;
create policy assets_update on public.assets for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant','manager']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant','manager']));
drop policy if exists assets_delete on public.assets;
create policy assets_delete on public.assets for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.loans enable row level security;
drop policy if exists loans_select on public.loans;
create policy loans_select on public.loans for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists loans_insert on public.loans;
create policy loans_insert on public.loans for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists loans_update on public.loans;
create policy loans_update on public.loans for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists loans_delete on public.loans;
create policy loans_delete on public.loans for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.loan_repayments enable row level security;
drop policy if exists loan_repayments_select on public.loan_repayments;
create policy loan_repayments_select on public.loan_repayments for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists loan_repayments_insert on public.loan_repayments;
create policy loan_repayments_insert on public.loan_repayments for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists loan_repayments_update on public.loan_repayments;
create policy loan_repayments_update on public.loan_repayments for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists loan_repayments_delete on public.loan_repayments;
create policy loan_repayments_delete on public.loan_repayments for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.owner_equity enable row level security;
drop policy if exists owner_equity_select on public.owner_equity;
create policy owner_equity_select on public.owner_equity for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists owner_equity_insert on public.owner_equity;
create policy owner_equity_insert on public.owner_equity for insert
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists owner_equity_update on public.owner_equity;
create policy owner_equity_update on public.owner_equity for update
  using (public.has_org_role(organization_id, array['owner','admin','accountant']))
  with check (public.has_org_role(organization_id, array['owner','admin','accountant']));
drop policy if exists owner_equity_delete on public.owner_equity;
create policy owner_equity_delete on public.owner_equity for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

-- ---------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------
create or replace function public.audit_journal_entries() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (NEW.organization_id, public.app_uid(), 'journal_entries.' || TG_OP, 'journal_entry', NEW.id,
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end);
  return NEW;
end $$;
drop trigger if exists audit_journal_entries on public.journal_entries;
create trigger audit_journal_entries after insert or update or delete on public.journal_entries
  for each row execute function public.audit_journal_entries();

create or replace function public.audit_payments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (NEW.organization_id, public.app_uid(), 'payments.' || TG_OP, 'payment', NEW.id,
          case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
          case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end);
  return NEW;
end $$;
drop trigger if exists audit_payments on public.payments;
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.audit_payments();
