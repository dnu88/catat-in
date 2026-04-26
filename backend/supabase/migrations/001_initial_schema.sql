-- ============================================================
-- CATAT.IN — Database Schema
-- Migration: 001_initial_schema.sql
-- Jalankan via: supabase db push
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- Untuk full-text search

-- ── ENUMS ────────────────────────────────────────────────────

create type transaction_type as enum ('income', 'expense');

create type transaction_category as enum (
  'food', 'transport', 'shopping', 'health',
  'entertainment', 'education', 'housing',
  'salary', 'freelance', 'investment', 'other'
);

create type wallet_type as enum ('bank', 'ewallet', 'cash', 'investment');

create type transaction_visibility as enum ('private', 'group', 'admin_only');

create type group_role as enum ('admin', 'editor', 'viewer');

create type member_status as enum ('pending', 'active', 'left', 'removed');

create type plan_type as enum ('free', 'premium');

create type bill_recurrence as enum ('once', 'monthly', 'yearly');

-- ── PROFILES (extends auth.users) ────────────────────────────

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  full_name         text not null,
  avatar_url        text,
  plan_type         plan_type not null default 'free',
  plan_expires_at   timestamptz,
  group_id          uuid,  -- FK ditambah setelah table groups dibuat
  fcm_token         text,  -- Firebase push notification token
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── GROUPS ───────────────────────────────────────────────────

create table public.groups (
  id            uuid primary key default uuid_generate_v4(),
  name          varchar(60) not null,
  description   text,
  owner_id      uuid not null references public.profiles(id),
  invite_code   varchar(8) not null unique,
  invite_link   text not null unique,
  max_members   int not null default 10,
  created_at    timestamptz not null default now()
);

-- Tambah FK group_id ke profiles setelah groups dibuat
alter table public.profiles
  add constraint fk_profiles_group
  foreign key (group_id) references public.groups(id) on delete set null;

-- ── GROUP MEMBERS ────────────────────────────────────────────

create table public.group_members (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        group_role not null default 'viewer',
  nickname    varchar(30),
  status      member_status not null default 'pending',
  invited_by  uuid references public.profiles(id),
  joined_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique(group_id, user_id)
);

-- ── WALLETS ──────────────────────────────────────────────────

create table public.wallets (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.profiles(id) on delete cascade,
  group_id       uuid references public.groups(id) on delete cascade,
  name           varchar(60) not null,
  type           wallet_type not null default 'bank',
  balance        decimal(15,2) not null default 0,
  bank_name      varchar(50),
  account_number varchar(30),
  is_shared      boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  -- Wallet harus milik user ATAU group, tidak keduanya dan tidak keduanya null
  constraint wallet_owner_check check (
    (user_id is not null and group_id is null) or
    (user_id is null and group_id is not null)
  )
);

-- ── TRANSACTIONS ─────────────────────────────────────────────

create table public.transactions (
  id               uuid primary key default uuid_generate_v4(),
  wallet_id        uuid not null references public.wallets(id) on delete cascade,
  user_id          uuid not null references public.profiles(id),
  type             transaction_type not null,
  amount           decimal(15,2) not null check (amount > 0),
  category         transaction_category not null,
  note             text,
  merchant         varchar(100),
  date             date not null default current_date,
  receipt_url      text,
  is_shared        boolean not null default false,
  visibility       transaction_visibility not null default 'private',
  group_id         uuid references public.groups(id),
  on_behalf_of     uuid references public.profiles(id),
  created_by       uuid not null references public.profiles(id),
  is_disputed      boolean not null default false,
  dispute_resolved_at timestamptz,
  ai_extracted     boolean not null default false,
  ai_confidence    decimal(3,2),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Indexes untuk performa query yang sering
create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_wallet on public.transactions(wallet_id, date desc);
create index idx_transactions_group on public.transactions(group_id, date desc) where group_id is not null;
create index idx_transactions_category on public.transactions(user_id, category, date desc);

-- ── BUDGETS ──────────────────────────────────────────────────

create table public.budgets (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.profiles(id) on delete cascade,
  group_id            uuid references public.groups(id) on delete cascade,
  category            transaction_category not null,
  limit_amount        decimal(15,2) not null check (limit_amount > 0),
  period              varchar(10) not null default 'monthly',
  period_start        date not null,
  notify_at_percent   int not null default 80 check (notify_at_percent between 1 and 100),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  constraint budget_owner_check check (
    (user_id is not null) or (group_id is not null)
  )
);

-- ── BILL REMINDERS ───────────────────────────────────────────

create table public.bill_reminders (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  name                varchar(100) not null,
  amount              decimal(15,2) not null check (amount > 0),
  due_day             int not null check (due_day between 1 and 31),
  recurrence          bill_recurrence not null default 'monthly',
  next_due_date       date not null,
  icon                varchar(10) default '📄',
  notify_before_days  int[] not null default '{3,1}',
  is_active           boolean not null default true,
  is_paid             boolean not null default false,
  paid_at             timestamptz,
  auto_record_wallet  uuid references public.wallets(id),
  created_at          timestamptz not null default now()
);

-- ── IMPORT LOGS ──────────────────────────────────────────────

create table public.import_logs (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id),
  bank_name         varchar(50),
  file_name         varchar(255),
  total_rows        int not null default 0,
  imported_rows     int not null default 0,
  skipped_rows      int not null default 0,
  duplicate_rows    int not null default 0,
  status            varchar(20) not null default 'pending',
  error_message     text,
  created_at        timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY (RLS) ─────────────────────────────────

-- Enable RLS pada semua tabel
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.bill_reminders enable row level security;
alter table public.import_logs enable row level security;

-- PROFILES: user hanya bisa akses profile sendiri
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

-- TRANSACTIONS: user bisa lihat transaksi sendiri + transaksi grup yang dishare
create policy "transactions_own" on public.transactions
  for all using (
    auth.uid() = user_id or
    (is_shared = true and group_id in (
      select group_id from public.group_members
      where user_id = auth.uid() and status = 'active'
    ))
  );

-- WALLETS: user bisa akses wallet sendiri + wallet bersama dari grup
create policy "wallets_own_and_group" on public.wallets
  for select using (
    auth.uid() = user_id or
    (is_shared = true and group_id in (
      select group_id from public.group_members
      where user_id = auth.uid() and status = 'active'
    ))
  );

create policy "wallets_own_write" on public.wallets
  for insert with check (auth.uid() = user_id);

create policy "wallets_own_update" on public.wallets
  for update using (auth.uid() = user_id);

-- ── FUNCTIONS ────────────────────────────────────────────────

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function update_updated_at();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- Auto-create profile setelah user daftar via Supabase Auth
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
