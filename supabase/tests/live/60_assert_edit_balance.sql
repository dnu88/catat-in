-- Isolated reconstruction only: actual authenticated writes and trigger readback.
\set ON_ERROR_STOP on
begin;
do $$
declare
  u uuid; w uuid; other_wallet uuid; tx public.transactions; bal numeric; count_rows int;
  drafts jsonb;
begin
  perform set_config('kaswise.wallet_balance_trigger', 'on', true);
  insert into auth.users(id,email) values(gen_random_uuid(),'checklist-edit@example.com') returning id into u;
  insert into public.wallets(user_id,name,type,balance,currency,is_active)
    values(u,'QA primary','bank',1000000,'IDR',true) returning id into w;
  insert into public.wallets(user_id,name,type,balance,currency,is_active)
    values(u,'QA other','bank',0,'IDR',true) returning id into other_wallet;
  perform set_config('request.jwt.claims',json_build_object('sub',u::text,'role','authenticated')::text,true);
  perform set_config('role','authenticated',true);
  drafts := jsonb_build_array(jsonb_build_object('transaction_type','expense','amount',35000,
    'category','Makan & Minum','description','Kopi terkoreksi','merchant','QA Cafe',
    'date','2026-10-03','wallet_id',w::text,'input_type','image'));
  select * into tx from public.create_transaction_entry_v2(gen_random_uuid(),'edit-first','personal',null,drafts);
  if tx.nominal <> 35000 or tx.kategori <> 'Makan & Minum' or tx.tanggal <> date '2026-10-03'
    or tx.wallet_id <> w or tx.catatan <> 'Kopi terkoreksi' or tx.merchant <> 'QA Cafe' then
    raise exception 'Single saved fields differ from confirmed draft';
  end if;
  select balance into bal from public.wallets where id=w;
  if bal <> 965000 then raise exception 'Single balance mismatch %',bal; end if;
  raise notice 'PASS E1: single confirmed amount/category/date/wallet/description/merchant persisted and balance correct';

  update public.transactions set nominal=50000,kategori='Lainnya',tanggal='2026-10-02' where id=tx.id;
  select balance into bal from public.wallets where id=w;
  if bal <> 950000 then raise exception 'Edit amount balance mismatch %',bal; end if;
  select count(*) into count_rows from public.transactions where user_id=u;
  if count_rows <> 1 then raise exception 'Edit duplicated row'; end if;
  raise notice 'PASS E2: edit amount recalculates balance, no duplicate row';

  update public.transactions set wallet_id=other_wallet where id=tx.id;
  select balance into bal from public.wallets where id=w;
  if bal <> 1000000 then raise exception 'Old wallet not restored %',bal; end if;
  select balance into bal from public.wallets where id=other_wallet;
  if bal <> -50000 then raise exception 'New wallet not debited %',bal; end if;
  raise notice 'PASS E3: changing wallet restores old wallet and debits new wallet';

  update public.transactions set type='income' where id=tx.id;
  select balance into bal from public.wallets where id=other_wallet;
  if bal <> 50000 then raise exception 'Expense to income delta mismatch %',bal; end if;
  raise notice 'PASS E4: changing expense to income reverses old delta and applies new delta';

  delete from public.transactions where id=tx.id;
  select balance into bal from public.wallets where id=other_wallet;
  if bal <> 0 then raise exception 'Delete did not reverse delta %',bal; end if;
  raise notice 'PASS E5: delete restores balance';
  perform set_config('role','none',true);
end $$;
rollback;
