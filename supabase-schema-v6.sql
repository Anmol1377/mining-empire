-- =================================================================
-- Mining Empire schema — v6 migration
-- Fix: bump_fame's OUT column names ("contributions", "boost_count") collide
-- with the same-named columns on fame_entries, so plpgsql raises
-- 'column reference "contributions" is ambiguous' on the RETURNING clause.
-- Add `#variable_conflict use_column` so unqualified names resolve to
-- the table column.
-- =================================================================

drop function if exists bump_fame(uuid, bigint) cascade;

create or replace function bump_fame(p_cloud_id uuid, p_amount bigint)
returns table(contributions bigint, boost_count integer)
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
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

grant execute on function bump_fame(uuid, bigint) to anon, authenticated;
