-- Profiles mirror the self-managed Better Auth schema. The original
-- foundation migration accidentally pointed this FK at the retired Neon Auth
-- schema, which rejects profiles for users created by the current auth flow.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth."user" (id)
  on delete cascade not valid;
