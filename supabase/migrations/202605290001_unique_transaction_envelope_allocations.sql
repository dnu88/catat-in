-- Prevent duplicate budget deductions for the same transaction and budget wallet.

begin;

delete from public.transaction_envelope_allocations a
using public.transaction_envelope_allocations b
where a.transaction_id = b.transaction_id
  and a.envelope_id = b.envelope_id
  and a.id > b.id;

create unique index if not exists transaction_envelope_allocations_tx_env_uidx
  on public.transaction_envelope_allocations(transaction_id, envelope_id);

commit;
