-- =====================================================================
-- 0000_auth_schema.sql — Better Auth schema setup
-- Creates the auth schema and tables for Better Auth
-- IDempotent version for safe re-execution
-- =====================================================================

-- Create auth schema
create schema if not exists auth;

-- Better Auth tables (created by Better Auth, but we'll create them here)
create table if not exists auth."user" (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  email_verified timestamptz,
  name text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth.session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth."user"(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth.account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth."user"(id) on delete cascade,
  account_id text not null,
  provider text not null,
  access_token text,
  refresh_token text,
  id_token text,
  expires_at timestamptz,
  token_type text,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, account_id)
);

create table if not exists auth.verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists auth_session_user_id_idx on auth.session (user_id);
create index if not exists auth_session_token_idx on auth.session (token);
create index if not exists auth_session_expires_at_idx on auth.session (expires_at);
create index if not exists auth_account_user_id_idx on auth.account (user_id);
create index if not exists auth_verification_identifier_idx on auth.verification (identifier);
create index if not exists auth_verification_expires_at_idx on auth.verification (expires_at);

-- Triggers for updated_at
create or replace function auth.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_touch on auth."user";
create trigger user_touch before update on auth."user"
  for each row execute function auth.touch_updated_at();

drop trigger if exists session_touch on auth.session;
create trigger session_touch before update on auth.session
  for each row execute function auth.touch_updated_at();

drop trigger if exists account_touch on auth.account;
create trigger account_touch before update on auth.account
  for each row execute function auth.touch_updated_at();

drop trigger if exists verification_touch on auth.verification;
create trigger verification_touch before update on auth.verification
  for each row execute function auth.touch_updated_at();
