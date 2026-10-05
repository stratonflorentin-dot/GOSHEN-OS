-- AI agricultural assistant + retrieval-augmented knowledge base (§34-§37, §66).
-- Knowledge sources/chunks are platform-wide reference evidence (FAO, research
-- institutions, government guides). AI queries/responses/citations are
-- tenant-isolated conversation records with a full audit trail.

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 300),
  publisher text not null check (length(btrim(publisher)) between 1 and 200),
  publication_date date,
  url text,
  crop text,
  animal_species text,
  country_region text,
  topic text not null,
  created_at timestamptz not null default now(),
  unique (title, publisher)
);

create index if not exists knowledge_sources_topic_idx on public.knowledge_sources(topic);
create index if not exists knowledge_sources_crop_idx on public.knowledge_sources(crop);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  title text not null,
  content text not null check (length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_document_idx on public.knowledge_chunks(document_id, chunk_index);
create index if not exists knowledge_chunks_fts_idx on public.knowledge_chunks
  using gin (to_tsvector('english', content));

create table if not exists public.ai_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  user_id uuid not null references public.profiles(id),
  question text not null check (length(btrim(question)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists ai_queries_org_time_idx on public.ai_queries(organization_id, created_at desc);
create index if not exists ai_queries_user_idx on public.ai_queries(user_id, created_at desc);

create table if not exists public.ai_responses (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.ai_queries(id) on delete cascade,
  provider text not null,
  model text not null,
  answer text not null,
  confidence text not null default 'medium' check (confidence in ('low','medium','high')),
  uncertainty_note text,
  tokens_used integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists ai_responses_query_idx on public.ai_responses(query_id, created_at);

create table if not exists public.ai_citations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.ai_responses(id) on delete cascade,
  chunk_id uuid references public.knowledge_chunks(id) on delete set null,
  kind text not null default 'knowledge' check (kind in ('knowledge','farm_data')),
  title text not null,
  publisher text,
  url text,
  quote text,
  created_at timestamptz not null default now()
);

create index if not exists ai_citations_response_idx on public.ai_citations(response_id);

-- ---------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------

-- Knowledge base is shared, read-only reference evidence for any
-- authenticated user. Writes happen via the owner role (seeding only).
alter table public.knowledge_sources enable row level security;
drop policy if exists knowledge_sources_select on public.knowledge_sources;
create policy knowledge_sources_select on public.knowledge_sources for select
  using (public.app_uid() is not null);

alter table public.knowledge_documents enable row level security;
drop policy if exists knowledge_documents_select on public.knowledge_documents;
create policy knowledge_documents_select on public.knowledge_documents for select
  using (public.app_uid() is not null);

alter table public.knowledge_chunks enable row level security;
drop policy if exists knowledge_chunks_select on public.knowledge_chunks;
create policy knowledge_chunks_select on public.knowledge_chunks for select
  using (public.app_uid() is not null);

-- Tenant conversation records follow the standard isolation model.
alter table public.ai_queries enable row level security;
drop policy if exists ai_queries_select on public.ai_queries;
create policy ai_queries_select on public.ai_queries for select
  using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists ai_queries_insert on public.ai_queries;
create policy ai_queries_insert on public.ai_queries for insert
  with check (public.is_org_member(organization_id));
drop policy if exists ai_queries_delete on public.ai_queries;
create policy ai_queries_delete on public.ai_queries for delete
  using (public.has_org_role(organization_id, array['owner','admin']));

alter table public.ai_responses enable row level security;
drop policy if exists ai_responses_select on public.ai_responses;
create policy ai_responses_select on public.ai_responses for select
  using (public.is_org_member((select organization_id from public.ai_queries where id = query_id)) or public.is_platform_admin());
drop policy if exists ai_responses_insert on public.ai_responses;
create policy ai_responses_insert on public.ai_responses for insert
  with check (public.is_org_member((select organization_id from public.ai_queries where id = query_id)));

alter table public.ai_citations enable row level security;
drop policy if exists ai_citations_select on public.ai_citations;
create policy ai_citations_select on public.ai_citations for select
  using (public.is_org_member((select organization_id from public.ai_queries where id = response_id)) or public.is_platform_admin());
drop policy if exists ai_citations_insert on public.ai_citations;
create policy ai_citations_insert on public.ai_citations for insert
  with check (public.is_org_member((select organization_id from public.ai_queries where id = response_id)));
