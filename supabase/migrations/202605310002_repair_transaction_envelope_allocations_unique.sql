-- Re-apply transaction/envelope allocation uniqueness on live databases that
-- were baselined before 202605290001 actually created the index.
-- This keeps budget deductions idempotent for each transaction + budget wallet.

begin;

delete from public.transaction_envelope_allocations a
using public.transaction_envelope_allocations b
where a.transaction_id = b.transaction_id
  and a.envelope_id = b.envelope_id
  and a.id > b.id;

create unique index if not exists transaction_envelope_allocations_tx_env_uidx
  on public.transaction_envelope_allocations(transaction_id, envelope_id);

commit;
