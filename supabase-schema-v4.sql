-- =================================================================
-- Mining Empire schema — v4 migration
-- ADDITIVE migration on top of supabase-schema.sql (v3). Idempotent.
-- Run this in the Supabase SQL editor.
--
-- Adds:
--   - player_states.email          (case-insensitive unique account key)
--   - fame_entries.boost_count     (powers exponential boost cost: 5k → 10k → 20k …)
--   - case-insensitive unique name on fame_entries
--   - RPCs: claim_account, sign_out_account
--   - join_fame / bump_fame updated for unique-name error + boost_count
-- =================================================================

------------------------------------------------------------
-- player_states.email — account recovery key
------------------------------------------------------------

alter table player_states
  add column if not exists email text;

-- Case-insensitive unique: "Foo@bar.com" and "foo@bar.com" collide
create unique index if not exists ux_player_states_email_lower
  on player_states (lower(email))
  where email is not null;

------------------------------------------------------------
-- fame_entries.boost_count — powers exponential cost
------------------------------------------------------------

alter table fame_entries
  add column if not exists boost_count integer not null default 0;

-- Case-insensitive unique display name
create unique index if not exists ux_fame_name_lower
  on fame_entries (lower(name));

------------------------------------------------------------
-- claim_account: bind an email to a cloud_id.
-- If email already exists → return its cloud_id + state (account recovery).
-- Else → claim the supplied local cloud_id for this email and return it.
------------------------------------------------------------

create or replace function claim_account(p_local_cloud_id uuid, p_email text)
returns table(cloud_id uuid, state jsonb, was_existing boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_norm text;
  v_existing_cloud uuid;
  v_existing_state jsonb;
  v_local_state jsonb;
begin
  v_email_norm := lower(trim(p_email));
  if v_email_norm is null or v_email_norm = '' then
    raise exception 'Email is required';
  end if;
  if v_email_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email format';
  end if;

  -- Existing account for this email?
  select ps.cloud_id, ps.state into v_existing_cloud, v_existing_state
    from player_states ps
    where lower(ps.email) = v_email_norm
    limit 1;

  if v_existing_cloud is not null then
    -- Found existing — return that cloud_id and its saved state.
    return query select v_existing_cloud, v_existing_state, true;
    return;
  end if;

  -- No existing account. Bind email to the supplied local cloud_id.
  -- Two sub-cases:
  --   a) player_states row exists for p_local_cloud_id → set email there
  --   b) no row yet → insert a stub with empty state so the email is reserved
  select ps.state into v_local_state
    from player_states ps where ps.cloud_id = p_local_cloud_id;

  if v_local_state is null then
    insert into player_states (cloud_id, state, email)
      values (p_local_cloud_id, '{}'::jsonb, p_email);
    return query select p_local_cloud_id, '{}'::jsonb, false;
  else
    update player_states
      set email = p_email
      where cloud_id = p_local_cloud_id;
    return query select p_local_cloud_id, v_local_state, false;
  end if;
end;
$$;

------------------------------------------------------------
-- sign_out_account: just a no-op on the server (auth is client-side
-- since we have no Supabase Auth session). Kept for symmetry / future.
------------------------------------------------------------

-- (intentionally no server RPC for sign-out; client just forgets the email)

------------------------------------------------------------
-- join_fame: rewritten to surface a friendly name-taken error
------------------------------------------------------------

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

  -- Pre-check name uniqueness for a friendlier error than the constraint name.
  if exists (select 1 from fame_entries where lower(name) = lower(p_name)) then
    raise exception 'NAME_TAKEN: That display name is already used';
  end if;

  insert into fame_entries (cloud_id, name, url, avatar_seed, contributions, boost_count)
    values (p_cloud_id, p_name, p_url, p_avatar_seed, p_initial_contribution, 0)
    returning * into new_entry;
  return new_entry;
exception
  when unique_violation then
    raise exception 'NAME_TAKEN: That display name is already used';
end;
$$;

------------------------------------------------------------
-- bump_fame: also increments boost_count so client can compute next cost.
-- Return type changed from bigint → table(...), so the old definition has
-- to be dropped before recreating (Postgres won't allow CREATE OR REPLACE
-- across return-type changes).
------------------------------------------------------------

drop function if exists bump_fame(uuid, bigint) cascade;

create or replace function bump_fame(p_cloud_id uuid, p_amount bigint)
returns table(contributions bigint, boost_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrib bigint;
  v_boost integer;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_amount > 1000000000 then
    raise exception 'Amount too large';
  end if;
  update fame_entries
    set contributions = contributions + p_amount,
        boost_count = boost_count + 1,
        updated_at = now()
    where cloud_id = p_cloud_id
    returning fame_entries.contributions, fame_entries.boost_count
      into v_contrib, v_boost;
  if v_contrib is null then
    raise exception 'No entry for this cloud_id — join the Hall first';
  end if;
  return query select v_contrib, v_boost;
end;
$$;

grant execute on function claim_account(uuid, text)                    to anon, authenticated;
grant execute on function join_fame(uuid, text, text, text, bigint)    to anon, authenticated;
grant execute on function bump_fame(uuid, bigint)                      to anon, authenticated;
