-- Add transfer transaction type support.
-- A transfer moves money between two wallets without changing total balance.
-- Represented as a single row with type='transfer', wallet_id=source, target_wallet_id=destination.

begin;

-- 1. Add target_wallet_id column
alter table public.transactions
  add column if not exists target_wallet_id uuid references public.wallets(id) on delete set null;

-- 2. Add 'transfer' to the transaction_type enum
alter type public.transaction_type add value if not exists 'transfer';

-- 3. Update sync_wallet_balance_from_transaction to handle transfers
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

    if new.type = 'transfer' then
      -- Decrease source wallet
      if new.wallet_id is not null then
        update public.wallets
        set balance = balance - coalesce(new.nominal, 0)
        where id = new.wallet_id
          and public.wallet_matches_transaction_scope(new.wallet_id, new.user_id, new.household_id);
      end if;

      -- Increase target wallet
      if new.target_wallet_id is not null then
        update public.wallets
        set balance = balance + coalesce(new.nominal, 0)
        where id = new.target_wallet_id
          and public.wallet_matches_transaction_scope(new.target_wallet_id, new.user_id, new.household_id);
      end if;

      return new;
    end if;

    delta_amount := case
      when new.type = 'income' then coalesce(new.nominal, 0)
      when new.type = 'expense' then -coalesce(new.nominal, 0)
      else 0
    end;

  elsif tg_op = 'UPDATE' then
    -- Handle transfer type specially
    if new.type = 'transfer' then
      -- Reverse old transfer
      if old.wallet_id is not null then
        update public.wallets
        set balance = balance + coalesce(old.nominal, 0)
        where id = old.wallet_id
          and public.wallet_matches_transaction_scope(old.wallet_id, old.user_id, old.household_id);
      end if;
      if old.target_wallet_id is not null then
        update public.wallets
        set balance = balance - coalesce(old.nominal, 0)
        where id = old.target_wallet_id
          and public.wallet_matches_transaction_scope(old.target_wallet_id, old.user_id, old.household_id);
      end if;

      -- Apply new transfer
      if new.wallet_id is not null then
        update public.wallets
        set balance = balance - coalesce(new.nominal, 0)
        where id = new.wallet_id
          and public.wallet_matches_transaction_scope(new.wallet_id, new.user_id, new.household_id);
      end if;
      if new.target_wallet_id is not null then
        update public.wallets
        set balance = balance + coalesce(new.nominal, 0)
        where id = new.target_wallet_id
          and public.wallet_matches_transaction_scope(new.target_wallet_id, new.user_id, new.household_id);
      end if;

      return new;
    end if;

    -- Non-transfer UPDATE: compute delta
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
    if old.type = 'transfer' then
      -- Reverse transfer: credit source, debit target
      if old.wallet_id is not null then
        update public.wallets
        set balance = balance + coalesce(old.nominal, 0)
        where id = old.wallet_id
          and public.wallet_matches_transaction_scope(old.wallet_id, old.user_id, old.household_id);
      end if;
      if old.target_wallet_id is not null then
        update public.wallets
        set balance = balance - coalesce(old.nominal, 0)
        where id = old.target_wallet_id
          and public.wallet_matches_transaction_scope(old.target_wallet_id, old.user_id, old.household_id);
      end if;

      return old;
    end if;

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

-- 4. Recreate trigger to point to updated function
drop trigger if exists sync_wallet_balance_from_transaction on public.transactions;
create trigger sync_wallet_balance_from_transaction
after insert or update or delete on public.transactions
for each row execute function public.sync_wallet_balance_from_transaction();

commit;
