-- Kaswise security hardening phase 2
-- Follow-up protections for server-managed profile fields, wallet balances,
-- import idempotency, transaction/wallet scope integrity, and avatar policies.

create or replace function public.prevent_profile_server_managed_field_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan_type := coalesce(new.plan_type, 'free');
    if new.plan_type <> 'free' or new.plan_expires_at is not null then
      raise exception 'Profile billing fields are server-managed';
    end if;
    return new;
  end if;

  if new.plan_type is distinct from old.plan_type
     or new.plan_expires_at is distinct from old.plan_expires_at then
    raise exception 'Profile billing fields are server-managed';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_server_managed_field_change on public.profiles;
create trigger prevent_profile_server_managed_field_change
before insert or update on public.profiles
for each row execute function public.prevent_profile_server_managed_field_change();

alter table public.transactions add column if not exists import_hash text;
create unique index if not exists transactions_import_hash_wallet_uidx
on public.transactions(user_id, wallet_id, import_hash)
where import_hash is not null;

create or replace function public.prevent_wallet_balance_direct_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.balance is distinct from old.balance
     and coalesce(auth.role(), '') <> 'service_role'
     and coalesce(current_setting('kaswise.wallet_balance_trigger', true), '') <> 'on' then
    raise exception 'Wallet balance is transaction-managed';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_wallet_balance_direct_change on public.wallets;
create trigger prevent_wallet_balance_direct_change
before update on public.wallets
for each row execute function public.prevent_wallet_balance_direct_change();

create or replace function public.prevent_transaction_wallet_scope_mismatch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.wallet_id is not null
     and not public.wallet_matches_transaction_scope(new.wallet_id, new.user_id, new.household_id) then
    raise exception 'Transaction wallet scope does not match transaction scope';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_transaction_wallet_scope_mismatch on public.transactions;
create trigger prevent_transaction_wallet_scope_mismatch
before insert or update on public.transactions
for each row execute function public.prevent_transaction_wallet_scope_mismatch();

create or replace function public.sync_wallet_balance_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta_amount numeric(14,2);
  target_wallet_id uuid;
  target_user_id uuid;
  target_household_id uuid;
begin
  perform set_config('kaswise.wallet_balance_trigger', 'on', true);

  if tg_op = 'INSERT' then
    target_wallet_id := new.wallet_id;
    target_user_id := new.user_id;
    target_household_id := new.household_id;
    delta_amount := case
      when new.type = 'income' then coalesce(new.nominal, 0)
      when new.type = 'expense' then -coalesce(new.nominal, 0)
      else 0
    end;
  elsif tg_op = 'UPDATE' then
    if old.wallet_id is distinct from new.wallet_id then
      if old.wallet_id is not null then
        delta_amount := -(case
          when old.type = 'income' then coalesce(old.nominal, 0)
          when old.type = 'expense' then -coalesce(old.nominal, 0)
          else 0
        end);
        update public.wallets
        set balance = balance + delta_amount
        where id = old.wallet_id
          and public.wallet_matches_transaction_scope(old.wallet_id, old.user_id, old.household_id);
      end if;

      target_wallet_id := new.wallet_id;
      target_user_id := new.user_id;
      target_household_id := new.household_id;
      delta_amount := case
        when new.type = 'income' then coalesce(new.nominal, 0)
        when new.type = 'expense' then -coalesce(new.nominal, 0)
        else 0
      end;
    else
      target_wallet_id := new.wallet_id;
      target_user_id := new.user_id;
      target_household_id := new.household_id;
      delta_amount :=
        (case
          when new.type = 'income' then coalesce(new.nominal, 0)
          when new.type = 'expense' then -coalesce(new.nominal, 0)
          else 0
        end)
        -
        (case
          when old.type = 'income' then coalesce(old.nominal, 0)
          when old.type = 'expense' then -coalesce(old.nominal, 0)
          else 0
        end);
    end if;
  elsif tg_op = 'DELETE' then
    target_wallet_id := old.wallet_id;
    target_user_id := old.user_id;
    target_household_id := old.household_id;
    delta_amount := -(case
      when old.type = 'income' then coalesce(old.nominal, 0)
      when old.type = 'expense' then -coalesce(old.nominal, 0)
      else 0
    end);
  end if;

  if target_wallet_id is not null and delta_amount <> 0 then
    update public.wallets
    set balance = balance + delta_amount
    where id = target_wallet_id
      and public.wallet_matches_transaction_scope(target_wallet_id, target_user_id, target_household_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_select_public"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_update_own"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_delete_own"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
