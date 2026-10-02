-- Row Level Security assertions for create_transaction_entry_v2.
--
-- Everything below runs as the real `authenticated` role with JWT claims, so the
-- RLS policies in the Kaswise migrations are the only thing standing between the
-- caller and the data — exactly as in production. Fixtures are created first as
-- superuser (which bypasses RLS).
--
-- Proves:
--   R1 an authenticated user can save their own personal batch under RLS
--   R2 replaying it is still idempotent under RLS
--   R3 a user cannot read another user's operation row
--   R4 writing into a household the caller does not belong to is denied
--   R5 a household VIEWER is denied
--   R6 a household MEMBER is allowed
--   R7 anon cannot execute the RPC at all

\set ON_ERROR_STOP on

do $$
declare
  a uuid; b uuid;
  h_foreign uuid; h_viewer uuid; h_member uuid;
  w_a uuid; w_b uuid; w_view uuid; w_mem uuid;
  req uuid := gen_random_uuid();
  req_view uuid := gen_random_uuid();
  req_mem uuid := gen_random_uuid();
  ids uuid[];
  ids2 uuid[];
  cnt int;
  bal numeric;
  drafts jsonb;
  drafts_view jsonb;
  drafts_mem jsonb;
begin
  perform set_config('kaswise.wallet_balance_trigger', 'on', true);

  -- ── fixtures (superuser: RLS bypassed) ────────────────────────────────────
  insert into auth.users (id, email) values (gen_random_uuid(), 'rls-a@example.com') returning id into a;
  insert into auth.users (id, email) values (gen_random_uuid(), 'rls-b@example.com') returning id into b;

  insert into public.wallets (user_id, name, type, balance, currency, is_active)
    values (a, 'A personal', 'bank', 1000000, 'IDR', true) returning id into w_a;
  insert into public.wallets (user_id, name, type, balance, currency, is_active)
    values (b, 'B personal', 'bank', 500000, 'IDR', true) returning id into w_b;

  insert into public.households (name, owner_id, invite_code) values ('H foreign', b, 'INVFOREIGN') returning id into h_foreign;
  insert into public.households (name, owner_id, invite_code) values ('H viewer', b, 'INVVIEWER') returning id into h_viewer;
  insert into public.households (name, owner_id, invite_code) values ('H member', b, 'INVMEMBER') returning id into h_member;

  -- A is a VIEWER in h_viewer and a MEMBER in h_member; not in h_foreign.
  insert into public.household_members (household_id, user_id, role, status)
    values (h_viewer, a, 'viewer', 'active');
  insert into public.household_members (household_id, user_id, role, status)
    values (h_member, a, 'member', 'active');

  insert into public.wallets (user_id, name, type, balance, currency, is_active, household_id)
    values (a, 'A household', 'bank', 800000, 'IDR', true, h_member) returning id into w_mem;
  insert into public.wallets (user_id, name, type, balance, currency, is_active, household_id)
    values (b, 'B household', 'bank', 800000, 'IDR', true, h_viewer) returning id into w_view;

  -- B already owns an operation row; A must never see it.
  insert into public.transaction_entry_operations (user_id, household_id, request_id, fingerprint, transaction_ids)
    values (b, null, gen_random_uuid(), 'b-secret', '{}');

  drafts := jsonb_build_array(
    jsonb_build_object('transaction_type','expense','amount',35000,'category','Makan & Minum',
                       'description','Kopi','date','2026-10-02','wallet_id', w_a::text),
    jsonb_build_object('transaction_type','expense','amount',12500,'category','Makan & Minum',
                       'description','Teh','date','2026-10-02','wallet_id', w_a::text)
  );
  drafts_view := jsonb_build_array(
    jsonb_build_object('transaction_type','expense','amount',9000,'category','Lainnya',
                       'description','viewer attempt','date','2026-10-02','wallet_id', w_view::text)
  );
  drafts_mem := jsonb_build_array(
    jsonb_build_object('transaction_type','expense','amount',15000,'category','Lainnya',
                       'description','member writes','date','2026-10-02','wallet_id', w_mem::text)
  );

  -- ── become the real authenticated role with A's claims ────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', a::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- R1 personal batch under RLS
  select array_agg(r.id order by r.id) into ids
  from public.create_transaction_entry_v2(req, 'fp-rls', 'personal', null, drafts) r;

  if coalesce(array_length(ids,1),0) <> 2 then
    raise exception 'R1 FAIL: expected 2 rows, got %', coalesce(array_length(ids,1),0);
  end if;
  perform set_config('role', 'none', true);
  select balance into bal from public.wallets where id = w_a;
  if bal <> 952500 then raise exception 'R1 FAIL: balance = % (expected 952500)', bal; end if;
  raise notice 'PASS R1: authenticated personal batch saved under RLS, balance debited once';

  perform set_config('role', 'authenticated', true);
  -- R2 replay is still idempotent under RLS
  select array_agg(r.id order by r.id) into ids2
  from public.create_transaction_entry_v2(req, 'fp-rls', 'personal', null, drafts) r;
  if ids2 is distinct from ids then raise exception 'R2 FAIL: replay ids differ'; end if;
  perform set_config('role', 'none', true);
  select balance into bal from public.wallets where id = w_a;
  if bal <> 952500 then raise exception 'R2 FAIL: balance moved on replay = %', bal; end if;
  raise notice 'PASS R2: replay idempotent under RLS (same ids, balance unchanged)';

  -- R3 cross-user isolation on the operation table
  perform set_config('role', 'authenticated', true);
  select count(*) into cnt from public.transaction_entry_operations where fingerprint = 'b-secret';
  perform set_config('role', 'none', true);
  if cnt <> 0 then raise exception 'R3 FAIL: A can read B''s operation row (%)', cnt; end if;
  raise notice 'PASS R3: another user''s operation row is invisible';

  -- R4 household the caller does not belong to
  perform set_config('role', 'authenticated', true);
  begin
    perform 1 from public.create_transaction_entry_v2(gen_random_uuid(), 'fp-f', 'household', h_foreign, drafts_view) r;
    perform set_config('role', 'none', true);
    raise exception 'R4 FAIL: write into foreign household was allowed';
  exception when others then
    if sqlerrm not like 'ENTRY_PERMISSION_DENIED%' then raise; end if;
    raise notice 'PASS R4: foreign household denied -> %', sqlerrm;
  end;
  perform set_config('role', 'none', true);

  -- R5 viewer denied
  perform set_config('role', 'authenticated', true);
  begin
    perform 1 from public.create_transaction_entry_v2(req_view, 'fp-v', 'household', h_viewer, drafts_view) r;
    perform set_config('role', 'none', true);
    raise exception 'R5 FAIL: viewer was allowed to write';
  exception when others then
    if sqlerrm not like 'ENTRY_PERMISSION_DENIED%' then raise; end if;
    raise notice 'PASS R5: viewer denied -> %', sqlerrm;
  end;
  perform set_config('role', 'none', true);

  -- R6 member allowed
  perform set_config('role', 'authenticated', true);
  begin
    select array_agg(r.id order by r.id) into ids2
    from public.create_transaction_entry_v2(req_mem, 'fp-m', 'household', h_member, drafts_mem) r;
    perform set_config('role', 'none', true);
    if coalesce(array_length(ids2,1),0) <> 1 then
      raise exception 'R6 FAIL: member write returned % rows', coalesce(array_length(ids2,1),0);
    end if;
    raise notice 'PASS R6: household member allowed to write';
  exception when others then
    perform set_config('role', 'none', true);
    raise exception 'R6 FAIL: member write rejected -> %', sqlerrm;
  end;
  perform set_config('role', 'none', true);

  -- R7 anon cannot execute
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  begin
    perform 1 from public.create_transaction_entry_v2(gen_random_uuid(), 'fp-anon', 'personal', null, drafts) r;
    perform set_config('role', 'none', true);
    raise exception 'R7 FAIL: anon was allowed to execute the RPC';
  exception when others then
    perform set_config('role', 'none', true);
    if sqlerrm not like '%permission denied%' then raise; end if;
    raise notice 'PASS R7: anon denied at the grant level';
  end;

  raise notice 'ALL RLS ASSERTIONS PASSED';
end
$$;
