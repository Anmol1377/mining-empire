-- Mining Empire schema — v3 (file + cloud sync, no auth)
-- Run this in the Supabase SQL Editor. Destructive — wipes prior tables.

create extension if not exists "pgcrypto";

-- Wipe v2 artifacts (auth-based)
drop function if exists bump_contribution(uuid, bigint) cascade;
drop function if exists bump_fame(uuid, bigint) cascade;
drop function if exists join_fame(uuid, text, text, text, bigint) cascade;
drop function if exists get_state(uuid) cascade;
drop function if exists upsert_state(uuid, jsonb) cascade;
drop table if exists player_states cascade;
drop table if exists fame_entries cascade;

------------------------------------------------------------
-- player_states: keyed by client-generated UUID (cloud_id)
------------------------------------------------------------

create table player_states (
  cloud_id uuid primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS on, no policies → direct access denied. RPCs use SECURITY DEFINER.
alter table player_states enable row level security;

------------------------------------------------------------
-- fame_entries: leaderboard, one entry per cloud_id
------------------------------------------------------------

create table fame_entries (
  id uuid primary key default gen_random_uuid(),
  cloud_id uuid not null unique,
  name text not null check (char_length(name) between 1 and 30),
  url text not null check (char_length(url) between 1 and 200 and url ~* '^https?://'),
  avatar_seed text not null check (char_length(avatar_seed) between 1 and 64),
  contributions bigint not null default 0 check (contributions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fame_contributions on fame_entries (contributions desc);

alter table fame_entries enable row level security;
create policy "anyone reads fame"
  on fame_entries for select
  using (true);

-- No direct INSERT/UPDATE policies — go through RPCs.

------------------------------------------------------------
-- RPCs (all SECURITY DEFINER)
------------------------------------------------------------

create or replace function get_state(p_cloud_id uuid)
returns table(state jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select state, updated_at from player_states where cloud_id = p_cloud_id;
$$;

create or replace function upsert_state(p_cloud_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_state is null then
    raise exception 'State cannot be null';
  end if;
  if pg_column_size(p_state) > 200000 then
    raise exception 'State payload too large (max 200KB)';
  end if;
  insert into player_states (cloud_id, state)
    values (p_cloud_id, p_state)
    on conflict (cloud_id) do update
      set state = excluded.state,
          updated_at = now();
end;
$$;

create or replace function join_fame(
  p_cloud_id uuid,
  p_name text,
  p_url text,
  p_avatar_seed text,
  p_initial_contribution bigint default 0
)
returns fame_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  new_entry fame_entries;
begin
  if p_initial_contribution < 0 or p_initial_contribution > 1000000000 then
    raise exception 'Invalid initial contribution';
  end if;
  insert into fame_entries (cloud_id, name, url, avatar_seed, contributions)
    values (p_cloud_id, p_name, p_url, p_avatar_seed, p_initial_contribution)
    returning * into new_entry;
  return new_entry;
end;
$$;

create or replace function bump_fame(p_cloud_id uuid, p_amount bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total bigint;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_amount > 1000000000 then
    raise exception 'Amount too large';
  end if;
  update fame_entries
    set contributions = contributions + p_amount,
        updated_at = now()
    where cloud_id = p_cloud_id
    returning contributions into new_total;
  if new_total is null then
    raise exception 'No entry for this cloud_id — join the Hall first';
  end if;
  return new_total;
end;
$$;

grant execute on function get_state(uuid)                              to anon, authenticated;
grant execute on function upsert_state(uuid, jsonb)                    to anon, authenticated;
grant execute on function join_fame(uuid, text, text, text, bigint)    to anon, authenticated;
grant execute on function bump_fame(uuid, bigint)                      to anon, authenticated;
