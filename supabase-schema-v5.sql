-- =================================================================
-- Mining Empire schema — v5 migration
-- Adds backup-code account recovery on top of v4 (which already added
-- email + boost_count + unique-name index).
--
-- New behaviour:
--   - "Set up backup": server generates a one-time random 12-char code,
--     hashes it with bcrypt, stores the hash. Plain code is returned to
--     the client EXACTLY ONCE.
--   - "Restore": client sends (email, code), server verifies the bcrypt
--     hash, returns cloud_id + saved state.
--   - "Rotate": user already proved they own the cloud_id locally, so we
--     accept their request to regenerate a fresh code; old code stops
--     working immediately.
--
-- ADDITIVE, idempotent. Does not touch existing rows except to add the
-- new nullable recovery_code_hash column (defaults to NULL).
-- =================================================================

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- player_states.recovery_code_hash — bcrypt hash of backup code
------------------------------------------------------------

alter table player_states
  add column if not exists recovery_code_hash text;

------------------------------------------------------------
-- Internal helper: generate a 12-char code grouped as XXXX-XXXX-XXXX.
-- Alphabet excludes confusing characters (0, O, 1, I, L) so codes are
-- transcribable from a screenshot or sticky note without ambiguity.
------------------------------------------------------------

create or replace function _generate_backup_code()
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out_code text := '';
  i int;
  ch int;
begin
  for i in 1..12 loop
    ch := (get_byte(gen_random_bytes(1), 0) % length(alphabet)) + 1;
    out_code := out_code || substr(alphabet, ch, 1);
  end loop;
  return substr(out_code, 1, 4) || '-' || substr(out_code, 5, 4) || '-' || substr(out_code, 9, 4);
end;
$$;

------------------------------------------------------------
-- setup_account: bind email + freshly generated code to local cloud_id.
-- Returns the plain code ONCE. Fails if email is already taken by a
-- different cloud_id (use restore_account or rotate from that account).
------------------------------------------------------------

drop function if exists setup_account(uuid, text) cascade;

create or replace function setup_account(p_local_cloud_id uuid, p_email text)
returns table(cloud_id uuid, plain_code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_email text;
  v_existing_cloud uuid;
  v_code text;
  v_hash text;
begin
  v_email := lower(trim(p_email));
  if v_email is null or v_email = '' then
    raise exception 'EMAIL_REQUIRED';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'EMAIL_INVALID';
  end if;

  -- If email is already linked to a different cloud_id, refuse.
  select ps.cloud_id into v_existing_cloud
    from player_states ps
    where lower(ps.email) = v_email and ps.cloud_id <> p_local_cloud_id
    limit 1;
  if v_existing_cloud is not null then
    raise exception 'EMAIL_TAKEN';
  end if;

  v_code := _generate_backup_code();
  v_hash := crypt(v_code, gen_salt('bf', 8));

  -- Upsert: tag this cloud_id with the email + code hash.
  insert into player_states (cloud_id, state, email, recovery_code_hash)
    values (p_local_cloud_id, '{}'::jsonb, p_email, v_hash)
    on conflict (cloud_id) do update
      set email = p_email,
          recovery_code_hash = v_hash;

  return query select p_local_cloud_id, v_code;
end;
$$;

------------------------------------------------------------
-- rotate_recovery_code: user is locally on a cloud_id row that they own;
-- regenerate the code without proving the old one. Old code stops working.
------------------------------------------------------------

drop function if exists rotate_recovery_code(uuid) cascade;

create or replace function rotate_recovery_code(p_local_cloud_id uuid)
returns table(plain_code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_hash text;
  v_email text;
begin
  select email into v_email from player_states where cloud_id = p_local_cloud_id;
  if v_email is null then
    raise exception 'NO_BACKUP_YET — call setup_account first';
  end if;

  v_code := _generate_backup_code();
  v_hash := crypt(v_code, gen_salt('bf', 8));

  update player_states
    set recovery_code_hash = v_hash
    where cloud_id = p_local_cloud_id;

  return query select v_code;
end;
$$;

------------------------------------------------------------
-- restore_account: verify (email, code) and return cloud_id + state.
-- This is the cross-device recovery path. No need to send the local
-- cloud_id — the server is authoritative.
------------------------------------------------------------

drop function if exists restore_account(text, text) cascade;

create or replace function restore_account(p_email text, p_code text)
returns table(cloud_id uuid, state jsonb)
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_email text;
  v_code text;
  v_row record;
begin
  v_email := lower(trim(p_email));
  v_code := upper(trim(p_code));
  if v_email is null or v_email = '' or v_code is null or v_code = '' then
    raise exception 'BAD_CREDENTIALS';
  end if;

  select ps.cloud_id, ps.state, ps.recovery_code_hash
    into v_row
    from player_states ps
    where lower(ps.email) = v_email
    limit 1;

  if v_row.cloud_id is null then
    raise exception 'BAD_CREDENTIALS';
  end if;
  if v_row.recovery_code_hash is null then
    raise exception 'NO_BACKUP_FOR_EMAIL';
  end if;
  if crypt(v_code, v_row.recovery_code_hash) <> v_row.recovery_code_hash then
    raise exception 'BAD_CREDENTIALS';
  end if;

  return query select v_row.cloud_id, v_row.state;
end;
$$;

------------------------------------------------------------
-- The old "email-as-key" claim_account from v4 stays defined but we
-- stop calling it. Leaving it in place avoids breaking anyone mid-flight.
------------------------------------------------------------

grant execute on function setup_account(uuid, text)         to anon, authenticated;
grant execute on function rotate_recovery_code(uuid)        to anon, authenticated;
grant execute on function restore_account(text, text)       to anon, authenticated;
