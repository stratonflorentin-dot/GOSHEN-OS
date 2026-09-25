-- 0002_reference_data.sql — platform reference data only. No customer data
-- (Bagamoyo Farm is onboarded as tenant #1 through the product, docs/63).

insert into public.plans (code, name, limits) values
  ('trial', 'Trial', '{"farms":3,"users":3,"hectares":50,"storage_mb":500,"ai_requests_month":50,"reports_month":10,"advanced_analytics":false}'),
  ('starter', 'Starter', '{"farms":3,"users":5,"hectares":200,"storage_mb":2000,"ai_requests_month":200,"reports_month":50,"advanced_analytics":false}'),
  ('professional', 'Professional', '{"farms":10,"users":25,"hectares":2000,"storage_mb":20000,"ai_requests_month":2000,"reports_month":500,"advanced_analytics":true}'),
  ('business', 'Business', '{"farms":50,"users":150,"hectares":20000,"storage_mb":200000,"ai_requests_month":20000,"reports_month":5000,"advanced_analytics":true}'),
  ('enterprise', 'Enterprise', '{"farms":null,"users":null,"hectares":null,"storage_mb":null,"ai_requests_month":null,"reports_month":null,"advanced_analytics":true}')
on conflict (code) do update set name = excluded.name, limits = excluded.limits;

insert into public.roles (code, name, scope) values
  ('owner','Organization Owner','organization'),
  ('admin','Organization Admin','organization'),
  ('manager','Farm Manager','organization'),
  ('accountant','Accountant','organization'),
  ('agronomist','Agronomist','organization'),
  ('veterinarian','Veterinarian','organization'),
  ('inventory_manager','Inventory Manager','organization'),
  ('worker','Field Worker','organization'),
  ('viewer','Viewer','organization')
on conflict (code) do nothing;
