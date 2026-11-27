-- Align the replica's transactions.type with PRODUCTION.
--
-- The live export (tests/live/live-schema-export/kaswise-live-columns.json) shows
-- production's transactions.type is NOT text but USER-DEFINED => the enum
-- public.transaction_type with labels income/expense/transfer.
--
-- Replaying the repo migrations leaves it as text, which means the RPC's
-- `::public.transaction_type` cast was only ever verified statically. This step
-- reproduces the production shape so that cast is exercised at runtime too.

-- The replay leaves a `transactions_type_check` CHECK comparing `type` to text
-- literals. PRODUCTION DOES NOT HAVE IT: the live export only carries
-- transactions_transaction_type_check (a CHECK on the separate text column
-- `transaction_type`). That leftover constraint is repo drift, and it also
-- blocks converting `type` to the enum, so it is removed to match production.
alter table public.transactions drop constraint if exists transactions_type_check;

alter table public.transactions
  alter column type type public.transaction_type
  using type::public.transaction_type;

-- NOTE: production also carries a second naming family on transactions
-- (amount/category/description/date). The replay does not create it, and the
-- entry RPC writes only the `nominal/kategori/catatan/tanggal` family plus the
-- `type` enum, so those extra columns are out of scope for this replica.
