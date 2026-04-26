-- ============================================================
-- CATAT.IN - Migration 006: PRD v3 alignment (fase 1)
-- Menambahkan fondasi kategori backend, currency wallet,
-- dan riwayat pembayaran tagihan.
-- ============================================================

alter table public.wallets
  add column if not exists currency varchar(10) not null default 'IDR';

alter table public.bill_reminders
  add column if not exists payment_history jsonb not null default '[]'::jsonb;

create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        varchar(60) not null,
  type        varchar(10) not null check (type in ('income', 'expense')),
  icon        varchar(10),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists idx_categories_user_type_name
  on public.categories(user_id, type, lower(name));

create index if not exists idx_categories_user_type
  on public.categories(user_id, type);

alter table public.categories enable row level security;

drop policy if exists "categories_own" on public.categories;
create policy "categories_own" on public.categories
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
