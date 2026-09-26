-- Align the existing auth tables with Better Auth's PostgreSQL field types.
-- Column names stay compatible with the original application schema.

alter table auth."user"
  alter column email_verified drop default;

alter table auth."user"
  alter column email_verified type boolean
  using (email_verified is not null);

update auth."user" set email_verified = false where email_verified is null;

alter table auth."user"
  alter column email_verified set default false,
  alter column email_verified set not null;

alter table auth.account
  add column if not exists password text,
  add column if not exists refresh_token_expires_at timestamptz;
