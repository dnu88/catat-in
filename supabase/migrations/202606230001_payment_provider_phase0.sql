-- Phase 0: provider-neutral payment columns while keeping Midtrans behavior intact.
alter table public.payments
  add column if not exists provider text,
  add column if not exists provider_order_id text,
  add column if not exists provider_transaction_id text,
  add column if not exists provider_status text;

update public.payments
set provider = coalesce(provider, 'midtrans'),
    provider_order_id = coalesce(provider_order_id, order_id)
where provider is null or provider_order_id is null;

alter table public.payments
  alter column provider set default 'midtrans',
  alter column provider set not null;

create index if not exists payments_provider_order_idx
  on public.payments (provider, provider_order_id);
