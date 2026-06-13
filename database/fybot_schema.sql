-- ############################################################################
-- IABOT / FYBOT — Supabase schema
--
-- The application persists its entire state (users, licenses, payments,
-- withdrawals, referral earnings and config) as a single JSON document in one
-- row of the `fybot_db` table (id = 1, column `data`).
--
-- Run this script ONCE in your Supabase project:
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- ############################################################################

create table if not exists public.fybot_db (
  id          integer primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamp with time zone default now()
);

-- Seed the single row the app reads/writes (id = 1). Safe to run repeatedly.
insert into public.fybot_db (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Keep updated_at fresh on every write.
create or replace function public.fybot_db_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.fybot_db;
create trigger set_updated_at
  before update on public.fybot_db
  for each row execute procedure public.fybot_db_set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- The server connects with the SERVICE ROLE key, which bypasses RLS. If you
-- prefer to connect with the ANON key instead, enable RLS and add a policy
-- that allows access to row id = 1. By default RLS is left disabled so the
-- service-role connection works out of the box.
-- ----------------------------------------------------------------------------
-- alter table public.fybot_db enable row level security;
-- create policy "service access" on public.fybot_db for all using (true) with check (true);
