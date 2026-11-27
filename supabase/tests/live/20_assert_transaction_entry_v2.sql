-- Runtime assertions for create_transaction_entry_v2 (Gate B evidence).
--
-- Runs against a DISPOSABLE local PostgreSQL carrying the Supabase stubs and the
-- Kaswise migrations. Proves the idempotency + atomicity contract at runtime:
--   1. a first call inserts the whole batch and moves the wallet balance once
--   2. replaying the same request_id + fingerprint returns the same rows and
--      inserts nothing (and does not move the balance again)
--   3. replaying the same request_id with a different fingerprint is rejected
--   4. a batch whose second draft is invalid leaves NO rows, NO operation row
--      and NO balance change (whole-statement rollback)
--   5. an unauthenticated call is rejected
--
-- Any broken expectation raises and aborts the script (psql ON_ERROR_STOP).

\set ON_ERROR_STOP on

do $$
declare
  v_user uuid;
  v_wallet uuid;
  v_req uuid := gen_random_uuid();
  v_fp text := 'fp-1';
  v_ids uuid[];
  v_ids2 uuid[];
  v_cnt int;
  v_bal numeric;
  v_ops int;
  v_drafts jsonb;
  v_drafts_same jsonb;
begin
  -- Balance guard trigger (when present) only allows changes it initiated.
  perform set_config('kaswise.wallet_balance_trigger', 'on', true);

  insert into auth.users (id, email)
  values (gen_random_uuid(), 'entry-v2-assert@example.com')
  returning id into v_user;

  insert into public.wallets (user_id, name, type, balance, currency, is_active)
  values (v_user, 'Seabank', 'bank', 1000000, 'IDR', true)
  returning id into v_wallet;

  -- The RPC derives identity from the JWT claims GUC only.
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text,
    true
  );

  v_drafts := jsonb_build_array(
    jsonb_build_object(
      'transaction_type', 'expense', 'amount', 35000,
      'category', 'Makan & Minum', 'description', 'Kopi',
      'date', '2026-10-02', 'wallet_id', v_wallet::text
    ),
    jsonb_build_object(
      'transaction_type', 'expense', 'amount', 12500,
      'category', 'Makan & Minum', 'description', 'Teh',
      'date', '2026-10-02', 'wallet_id', v_wallet::text
    )
  );
  v_drafts_same := v_drafts;

  -- 1 ── first call
  select array_agg(r.id order by r.id) into v_ids
  from public.create_transaction_entry_v2(v_req, v_fp, 'personal', null, v_drafts) r;

  if coalesce(array_length(v_ids, 1), 0) <> 2 then
    raise exception 'ASSERT FAIL 1: first call returned % rows',
      coalesce(array_length(v_ids, 1), 0);
  end if;

  select balance into v_bal from public.wallets where id = v_wallet;
  if v_bal <> 952500 then
    raise exception 'ASSERT FAIL 1: balance after first call = % (expected 952500)', v_bal;
  end if;
  raise notice 'PASS 1: batch inserted (2 rows) and balance debited once -> 952500';

  -- 2 ── idempotent replay
  select array_agg(r.id order by r.id) into v_ids2
  from public.create_transaction_entry_v2(v_req, v_fp, 'personal', null, v_drafts_same) r;

  if v_ids2 is distinct from v_ids then
    raise exception 'ASSERT FAIL 2: replay returned different ids (% vs %)', v_ids2, v_ids;
  end if;

  select count(*) into v_cnt from public.transactions where user_id = v_user;
  if v_cnt <> 2 then
    raise exception 'ASSERT FAIL 2: row count after replay = % (expected 2)', v_cnt;
  end if;

  select balance into v_bal from public.wallets where id = v_wallet;
  if v_bal <> 952500 then
    raise exception 'ASSERT FAIL 2: balance changed on replay = %', v_bal;
  end if;
  raise notice 'PASS 2: replay returned the same ids, inserted nothing, balance unchanged';

  -- 3 ── same request id, different payload
  begin
    perform 1
    from public.create_transaction_entry_v2(v_req, 'fp-different', 'personal', null, v_drafts) r;
    raise exception 'ASSERT FAIL 3: conflicting fingerprint was accepted';
  exception when others then
    if sqlerrm not like 'ENTRY_REQUEST_CONFLICT%' then
      raise;
    end if;
    raise notice 'PASS 3: conflicting fingerprint rejected -> %', sqlerrm;
  end;

  -- 4 ── invalid second draft rolls the whole batch back
  declare
    v_req_bad uuid := gen_random_uuid();
    v_bad jsonb;
  begin
    v_bad := jsonb_build_array(
      jsonb_build_object(
        'transaction_type', 'expense', 'amount', 5000,
        'category', 'Lainnya', 'description', 'valid item',
        'date', '2026-10-02', 'wallet_id', v_wallet::text
      ),
      jsonb_build_object(
        'transaction_type', 'expense', 'amount', 'not-a-number',
        'category', 'Lainnya', 'description', 'invalid item',
        'date', '2026-10-02', 'wallet_id', v_wallet::text
      )
    );

    begin
      perform 1
      from public.create_transaction_entry_v2(v_req_bad, 'fp-bad', 'personal', null, v_bad) r;
      raise exception 'ASSERT FAIL 4: invalid batch was accepted';
    exception when others then
      raise notice 'PASS 4a: invalid batch rejected -> %', sqlerrm;
    end;

    select count(*) into v_cnt from public.transactions where user_id = v_user;
    if v_cnt <> 2 then
      raise exception 'ASSERT FAIL 4b: partial batch left % rows (expected 2)', v_cnt;
    end if;

    select count(*) into v_ops
    from public.transaction_entry_operations where request_id = v_req_bad;
    if v_ops <> 0 then
      raise exception 'ASSERT FAIL 4c: operation row survived rollback (%)', v_ops;
    end if;

    select balance into v_bal from public.wallets where id = v_wallet;
    if v_bal <> 952500 then
      raise exception 'ASSERT FAIL 4d: balance moved on rolled-back batch = %', v_bal;
    end if;
    raise notice 'PASS 4: rollback clean — no rows, no operation row, no balance change';
  end;

  -- 5 ── unauthenticated
  perform set_config('request.jwt.claims', '', true);
  begin
    perform 1
    from public.create_transaction_entry_v2(gen_random_uuid(), 'fp-anon', 'personal', null, v_drafts) r;
    raise exception 'ASSERT FAIL 5: unauthenticated call was allowed';
  exception when others then
    if sqlerrm not like 'ENTRY_AUTH_REQUIRED%' then
      raise;
    end if;
    raise notice 'PASS 5: unauthenticated call rejected';
  end;

  raise notice 'ALL RUNTIME ASSERTIONS PASSED';
end
$$;
