-- Category discipline P2: create_transaction_entry_v2 writes category_id.
--
-- Prerequisite: 202611280001_category_discipline.sql (adds nullable
-- transactions.category_id). CREATE OR REPLACE keeps the whole idempotency
-- contract of 202610020001 (fast-path replay, fingerprint conflict, race-safe
-- claim, single-statement batch). Change vs original: each draft may carry
-- `category_id`; when absent the RPC resolves it from the user's own
-- categories by exact/normalized name (canonical_category_name maps id/en
-- pairs). Text `kategori` stays written; a NULL category_id never blocks a
-- save. Idempotent via CREATE OR REPLACE; grants re-asserted.

begin;

-- Helper (idempotent): canonical name for a category text, used by the
-- category_id lookup above. Returns NULL when no canonical pair matches.
create or replace function public.canonical_category_name(value text)
returns text
language sql
stable
as $$
  select nullif((
    select case
      when lower(btrim(value)) in ('makan & minum', 'makanan', 'makanan & minuman', 'makan', 'food & beverage') then 'Food & Beverage'
      when lower(btrim(value)) in ('belanja bulanan', 'groceries') then 'Groceries'
      when lower(btrim(value)) in ('transportasi', 'transport') then 'Transport'
      when lower(btrim(value)) in ('kebutuhan rumah & pribadi', 'housing', 'household & personal care') then 'Household & Personal Care'
      when lower(btrim(value)) in ('olahraga', 'sport') then 'Sport'
      when lower(btrim(value)) in ('gaji', 'salary') then 'Salary'
      when lower(btrim(value)) in ('lainnya', 'other', 'other expenses') then 'Other expenses'
      when lower(btrim(value)) in ('kesehatan', 'health') then 'Health'
      when lower(btrim(value)) in ('hiburan', 'entertainment') then 'Entertainment'
      when lower(btrim(value)) in ('belanja pribadi', 'personal shopping') then 'Personal Shopping'
      when lower(btrim(value)) in ('hadiah & donasi', 'gifts & donations') then 'Gifts & Donations'
      else btrim(value)
    end
  ), '');
$$;


create or replace function public.create_transaction_entry_v2(
  p_request_id uuid,
  p_fingerprint text,
  p_context_type text,
  p_household_id uuid,
  p_drafts jsonb
)
returns setof public.transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_context_type text := lower(btrim(coalesce(p_context_type, 'personal')));
  v_household_id uuid;
  v_operation public.transaction_entry_operations;
  v_inserted_ids uuid[];
begin
  -- Identity is derived server-side only.
  if v_user_id is null then
    raise exception 'ENTRY_AUTH_REQUIRED: authentication required'
      using errcode = '28000';
  end if;

  if p_request_id is null then
    raise exception 'ENTRY_BAD_REQUEST: request_id is required'
      using errcode = '22023';
  end if;

  if p_fingerprint is null or btrim(p_fingerprint) = '' then
    raise exception 'ENTRY_BAD_REQUEST: fingerprint is required'
      using errcode = '22023';
  end if;

  if p_drafts is null or jsonb_typeof(p_drafts) <> 'array' or jsonb_array_length(p_drafts) = 0 then
    raise exception 'ENTRY_BAD_REQUEST: drafts must be a non-empty array'
      using errcode = '22023';
  end if;

  if v_context_type not in ('personal', 'household') then
    raise exception 'ENTRY_BAD_REQUEST: context_type must be personal or household'
      using errcode = '22023';
  end if;

  -- Context permissions. Personal ignores any household id; household requires
  -- an active write role (owner/admin/member) and rejects viewers.
  if v_context_type = 'personal' then
    v_household_id := null;
  else
    v_household_id := p_household_id;
    if v_household_id is null then
      raise exception 'ENTRY_BAD_REQUEST: household_id is required for household context'
        using errcode = '22023';
    end if;
    if not public.can_write_household(v_household_id) then
      raise exception 'ENTRY_PERMISSION_DENIED: Akses lihat saja'
        using errcode = '42501';
    end if;
  end if;

  -- Fast-path replay: an already-recorded request returns its rows untouched.
  select * into v_operation
  from public.transaction_entry_operations o
  where o.user_id = v_user_id
    and o.household_id is not distinct from v_household_id
    and o.request_id = p_request_id;

  if found then
    if v_operation.fingerprint is distinct from p_fingerprint then
      raise exception 'ENTRY_REQUEST_CONFLICT: request % was already recorded with a different payload', p_request_id
        using errcode = '23505';
    end if;

    return query
      select t.*
      from public.transactions t
      where t.id = any (v_operation.transaction_ids)
      order by t.created_at, t.id;
    return;
  end if;

  -- Claim the request id first. If a concurrent submit won the race, its row is
  -- returned instead of inserting a duplicate batch. The unique constraint on
  -- (user_id, household_id, request_id) is the arbiter.
  begin
    insert into public.transaction_entry_operations (user_id, household_id, request_id, fingerprint, transaction_ids)
    values (v_user_id, v_household_id, p_request_id, p_fingerprint, '{}');
  exception when unique_violation then
    select * into v_operation
    from public.transaction_entry_operations o
    where o.user_id = v_user_id
      and o.household_id is not distinct from v_household_id
      and o.request_id = p_request_id;

    if v_operation.fingerprint is distinct from p_fingerprint then
      raise exception 'ENTRY_REQUEST_CONFLICT: request % was already recorded with a different payload', p_request_id
        using errcode = '23505';
    end if;

    return query
      select t.*
      from public.transactions t
      where t.id = any (v_operation.transaction_ids)
      order by t.created_at, t.id;
    return;
  end;

  -- Single-statement batch insert. Any type/constraint failure aborts the entire
  -- statement, and therefore the whole function call, so the operation claim
  -- above rolls back too and no partial batch is ever visible.
  --
  -- Wallet balances are intentionally not touched: the AFTER INSERT trigger
  -- sync_wallet_balance_from_transaction applies the deltas (debiting/crediting
  -- for transfers) exactly as for single-row inserts.
  with inserted as (
    insert into public.transactions (
      user_id,
      wallet_id,
      target_wallet_id,
      type,
      nominal,
      kategori,
      category_id,
      catatan,
      merchant,
      tanggal,
      receipt_url,
      household_id,
      created_by,
      updated_by,
      input_type,
      status,
      raw_input,
      review_required,
      is_verified,
      confidence
    )
    select
      v_user_id,
      nullif(btrim(d.value->>'wallet_id'), '')::uuid,
      nullif(btrim(d.value->>'target_wallet_id'), '')::uuid,
      coalesce(nullif(btrim(d.value->>'transaction_type'), ''), 'expense')::public.transaction_type,
      (d.value->>'amount')::numeric,
      nullif(btrim(d.value->>'category'), ''),
      coalesce(
        -- P2 category discipline: id dari draft bila dibawa; kalau tidak,
        -- resolve dari kategori milik user (exact, lalu nama kanonik).
        nullif(btrim(d.value->>'category_id'), '')::uuid,
        (
          select c.id
          from public.categories c
          where c.user_id = v_user_id
            and c.name is not null
            and btrim(nullif(btrim(d.value->>'category'), '')) is not null
            and (
              lower(btrim(c.name)) = lower(btrim(nullif(btrim(d.value->>'category'), '')))
              or lower(btrim(c.name)) = lower(btrim(
                    coalesce(
                      public.canonical_category_name(nullif(btrim(d.value->>'category'), '')),
                      ''
                    )
                  ))
            )
          limit 1
        )
      ),
      coalesce(d.value->>'description', ''),
      nullif(btrim(d.value->>'merchant'), ''),
      nullif(btrim(d.value->>'date'), '')::date,
      nullif(btrim(d.value->>'receipt_url'), ''),
      v_household_id,
      v_user_id,
      v_user_id,
      coalesce(nullif(btrim(d.value->>'input_type'), ''), 'manual'),
      coalesce(nullif(btrim(d.value->>'status'), ''), 'done'),
      nullif(d.value->>'raw_input', ''),
      coalesce((d.value->>'review_required')::boolean, false),
      coalesce((d.value->>'is_verified')::boolean, false),
      nullif(d.value->>'confidence', '')::numeric
    from jsonb_array_elements(p_drafts) as d(value)
    returning id
  )
  select array_agg(id order by id) into v_inserted_ids from inserted;

  update public.transaction_entry_operations
  set transaction_ids = coalesce(v_inserted_ids, '{}')
  where user_id = v_user_id
    and household_id is not distinct from v_household_id
    and request_id = p_request_id;

  -- Deterministic ordering: all rows share the statement timestamp, so id
  -- breaks the tie.
  return query
    select t.*
    from public.transactions t
    where t.id = any (coalesce(v_inserted_ids, '{}'))
    order by t.created_at, t.id;
end;
$$;

-- Only authenticated users may call it; anon must not.
revoke all on function public.create_transaction_entry_v2(uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.create_transaction_entry_v2(uuid, text, text, uuid, jsonb) to authenticated;


commit;
