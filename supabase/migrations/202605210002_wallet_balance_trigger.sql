-- Move transaction-driven wallet balance maintenance into the database.
-- The trigger applies atomic balance deltas after transaction mutations so clients do not
-- perform non-atomic wallet read-modify-write updates.

create or replace function public.wallet_matches_transaction_scope(
  target_wallet_id uuid,
  target_user_id uuid,
  target_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wallets w
    where w.id = target_wallet_id
      and (
        (
          target_household_id is null
          and w.household_id is null
          and w.user_id = target_user_id
        )
        or (
          target_household_id is not null
          and w.household_id = target_household_id
        )
      )
  );
$$;

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

drop trigger if exists sync_wallet_balance_from_transaction on public.transactions;
create trigger sync_wallet_balance_from_transaction
after insert or update or delete on public.transactions
for each row execute function public.sync_wallet_balance_from_transaction();
