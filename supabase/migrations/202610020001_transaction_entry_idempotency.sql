-- Kaswise transaction entry idempotency + atomic batch save.
--
-- Additive migration. It never alters or drops existing columns, policies or
-- triggers. It introduces an operation-identity table plus an RPC that persists
-- a whole review batch (the drafts the user confirmed) in one statement.
--
-- IDEMPOTENCY CONTRACT (do not weaken without updating clients):
--   * Every save is identified by (user_id, household_id, request_id). The
--     client mints a fresh request_id (uuid) per user-initiated save and reuses
--     it verbatim on retries of that same save.
--   * fingerprint is a stable hash of the exact draft batch. Replaying a
--     request_id with an identical fingerprint returns the rows that were
--     already written and inserts nothing. Replaying a request_id with a
--     DIFFERENT fingerprint is a programming error and raises
--     ENTRY_REQUEST_CONFLICT.
--   * All drafts are inserted by a single INSERT ... SELECT over
--     jsonb_array_elements, so one invalid draft rolls the whole batch back.
--   * Wallet balances are never touched here: the existing
--     sync_wallet_balance_from_transaction trigger owns balance deltas. This
--     function only inserts transaction rows.

begin;

-- ── Operation identity ──────────────────────────────────────────────────────
-- One row per accepted save request. transaction_ids records the exact rows the
-- batch produced so a replay can return them without re-inserting.
create table if not exists public.transaction_entry_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  request_id uuid not null,
  fingerprint text not null,
  transaction_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  -- NULLS NOT DISTINCT: personal saves carry household_id = null, and a plain
  -- unique constraint treats NULLs as distinct, which would let two personal
  -- submits for the same request_id both succeed.
  constraint transaction_entry_operations_request_key
    unique nulls not distinct (user_id, household_id, request_id)
);

create index if not exists idx_transaction_entry_operations_user_created
  on public.transaction_entry_operations(user_id, created_at desc);

alter table public.transaction_entry_operations enable row level security;

-- Owner-only access, in the same style as the other financial tables. The RPC
-- runs SECURITY INVOKER, so these policies are the ones that gate it.
drop policy if exists "transaction_entry_operations_select_own" on public.transaction_entry_operations;
create policy "transaction_entry_operations_select_own" on public.transaction_entry_operations
  for select using (user_id = auth.uid());

drop policy if exists "transaction_entry_operations_insert_own" on public.transaction_entry_operations;
create policy "transaction_entry_operations_insert_own" on public.transaction_entry_operations
  for insert with check (user_id = auth.uid());

drop policy if exists "transaction_entry_operations_update_own" on public.transaction_entry_operations;
create policy "transaction_entry_operations_update_own" on public.transaction_entry_operations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "transaction_entry_operations_delete_own" on public.transaction_entry_operations;
create policy "transaction_entry_operations_delete_own" on public.transaction_entry_operations
  for delete using (user_id = auth.uid());

-- ── Atomic, idempotent batch insert ─────────────────────────────────────────
-- SECURITY INVOKER + pinned search_path: the caller's RLS applies and no
-- elevated privileges are granted. The user is always taken from auth.uid();
-- a client-supplied user id is never trusted.
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
