-- Remove a stale production trigger that reads the legacy transactions.amount column.
-- Current mobile writes nominal/type and the canonical sync_wallet_balance_from_transaction
-- trigger already updates wallet balances safely from nominal.

begin;

drop trigger if exists transaction_balance_trigger on public.transactions;
drop function if exists public.update_wallet_balance();

commit;
