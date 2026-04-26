-- ============================================================
-- CATAT.IN — Migration 003: Fix Schema Gaps
-- Tambahkan kolom yang hilang + buat tabel yang belum ada.
-- Semua pernyataan bersifat idempotent (aman dijalankan berulang).
-- Jalankan via: Supabase Studio > SQL Editor > paste & Run
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "pgcrypto";

-- ── ENUMS (buat jika belum ada) ───────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('income', 'expense');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'transaction_category') then
    create type transaction_category as enum (
      'food', 'transport', 'shopping', 'health',
      'entertainment', 'education', 'housing',
      'salary', 'freelance', 'investment', 'other'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'wallet_type') then
    create type wallet_type as enum ('bank', 'ewallet', 'cash', 'investment');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'transaction_visibility') then
    create type transaction_visibility as enum ('private', 'group', 'admin_only');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'group_role') then
    create type group_role as enum ('admin', 'editor', 'viewer');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'member_status') then
    create type member_status as enum ('pending', 'active', 'left', 'removed');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'plan_type') then
    create type plan_type as enum ('free', 'premium');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'bill_recurrence') then
    create type bill_recurrence as enum ('once', 'monthly', 'yearly');
  end if;
end $$;

-- ── PROFILES — tambah kolom yang mungkin hilang ───────────────

alter table public.profiles
  add column if not exists plan_type    plan_type   not null default 'free',
  add column if not exists plan_expires_at timestamptz,
  add column if not exists group_id     uuid,
  add column if not exists fcm_token    text,
  add column if not exists updated_at   timestamptz not null default now();

-- ── GROUPS ───────────────────────────────────────────────────

create table if not exists public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          varchar(60) not null,
  description   text,
  owner_id      uuid not null references public.profiles(id),
  invite_code   varchar(8) not null unique,
  invite_link   text not null unique,
  max_members   int not null default 10,
  created_at    timestamptz not null default now()
);

-- FK group_id pada profiles (idempotent)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'fk_profiles_group'
  ) then
    alter table public.profiles
      add constraint fk_profiles_group
      foreign key (group_id) references public.groups(id) on delete set null;
  end if;
end $$;

-- ── GROUP MEMBERS ────────────────────────────────────────────

create table if not exists public.group_members (
  id          uuid primary key default gen_random_uuid(),
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

-- ── WALLETS — tambah kolom yang hilang ───────────────────────

alter table public.wallets
  add column if not exists group_id       uuid references public.groups(id) on delete cascade,
  add column if not exists bank_name      varchar(50),
  add column if not exists account_number varchar(30),
  add column if not exists is_shared      boolean not null default false,
  add column if not exists is_active      boolean not null default true;

-- Wallet owner check constraint (idempotent)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'wallet_owner_check'
      and table_name = 'wallets'
  ) then
    alter table public.wallets
      add constraint wallet_owner_check check (
        (user_id is not null and group_id is null) or
        (user_id is null and group_id is not null)
      );
  end if;
end $$;

-- ── TRANSACTIONS — tambah kolom yang hilang ───────────────────

alter table public.transactions
  add column if not exists wallet_id       uuid references public.wallets(id) on delete cascade,
  add column if not exists type            transaction_type,
  add column if not exists note            text,
  add column if not exists created_by      uuid references public.profiles(id),
  add column if not exists merchant       varchar(100),
  add column if not exists receipt_url    text,
  add column if not exists is_shared      boolean not null default false,
  add column if not exists visibility     transaction_visibility not null default 'private',
  add column if not exists group_id       uuid references public.groups(id),
  add column if not exists on_behalf_of   uuid references public.profiles(id),
  add column if not exists is_disputed    boolean not null default false,
  add column if not exists dispute_resolved_at timestamptz,
  add column if not exists ai_extracted   boolean not null default false,
  add column if not exists ai_confidence  decimal(3,2),
  add column if not exists updated_at     timestamptz not null default now();

-- Backfill type dari kolom legacy transaction_type jika ada
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'transaction_type'
  ) then
    update public.transactions
    set type = case
      when transaction_type in ('income', 'expense')
        then transaction_type::transaction_type
      else null
    end
    where type is null;
  end if;
end $$;

-- Indexes (idempotent via IF NOT EXISTS)
create index if not exists idx_transactions_user_date
  on public.transactions(user_id, date desc);
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'wallet_id'
  ) then
    create index if not exists idx_transactions_wallet
      on public.transactions(wallet_id, date desc);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'group_id'
  ) then
    create index if not exists idx_transactions_group
      on public.transactions(group_id, date desc) where group_id is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'category'
  ) then
    create index if not exists idx_transactions_category
      on public.transactions(user_id, category, date desc);
  end if;
end $$;

-- ── BUDGETS — tambah kolom yang hilang ───────────────────────

alter table public.budgets
  add column if not exists group_id         uuid references public.groups(id) on delete cascade,
  add column if not exists notify_at_percent int not null default 80,
  add column if not exists is_active         boolean not null default true;

-- ── BILL REMINDERS ───────────────────────────────────────────

create table if not exists public.bill_reminders (
  id                  uuid primary key default gen_random_uuid(),
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

create table if not exists public.import_logs (
  id                uuid primary key default gen_random_uuid(),
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

-- ── ROW LEVEL SECURITY ────────────────────────────────────────

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.bill_reminders enable row level security;
alter table public.import_logs enable row level security;

-- PROFILES policy
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_own') then
    create policy "profiles_own" on public.profiles
      for all using (auth.uid() = id);
  end if;
end $$;

-- TRANSACTIONS policy
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'transactions' and policyname = 'transactions_own') then
    create policy "transactions_own" on public.transactions
      for all using (
        auth.uid() = user_id or
        (is_shared = true and group_id in (
          select group_id from public.group_members
          where user_id = auth.uid() and status = 'active'
        ))
      );
  end if;
end $$;

-- WALLETS policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'wallets' and policyname = 'wallets_own_and_group') then
    create policy "wallets_own_and_group" on public.wallets
      for select using (
        auth.uid() = user_id or
        (is_shared = true and group_id in (
          select group_id from public.group_members
          where user_id = auth.uid() and status = 'active'
        ))
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'wallets' and policyname = 'wallets_own_write') then
    create policy "wallets_own_write" on public.wallets
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'wallets' and policyname = 'wallets_own_update') then
    create policy "wallets_own_update" on public.wallets
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- GROUPS policy
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'groups' and policyname = 'groups_member_access') then
    create policy "groups_member_access" on public.groups
      for all using (
        auth.uid() = owner_id or
        id in (
          select group_id from public.group_members
          where user_id = auth.uid() and status = 'active'
        )
      );
  end if;
end $$;

-- GROUP MEMBERS policy
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'group_members' and policyname = 'group_members_access') then
    create policy "group_members_access" on public.group_members
      for all using (
        user_id = auth.uid() or
        group_id in (
          select group_id from public.group_members
          where user_id = auth.uid() and status = 'active'
        )
      );
  end if;
end $$;

-- BILL REMINDERS policy
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'bill_reminders' and policyname = 'bill_reminders_own') then
    create policy "bill_reminders_own" on public.bill_reminders
      for all using (auth.uid() = user_id);
  end if;
end $$;

-- IMPORT LOGS policy
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'import_logs' and policyname = 'import_logs_own') then
    create policy "import_logs_own" on public.import_logs
      for all using (auth.uid() = user_id);
  end if;
end $$;

-- ── FUNCTIONS & TRIGGERS ─────────────────────────────────────

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger transactions
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_transactions_updated_at') then
    create trigger trg_transactions_updated_at
      before update on public.transactions
      for each row execute function update_updated_at();
  end if;
end $$;

-- Trigger profiles
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_profiles_updated_at') then
    create trigger trg_profiles_updated_at
      before update on public.profiles
      for each row execute function update_updated_at();
  end if;
end $$;

-- Auto-create profile on new user (idempotent - replace)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function handle_new_user();
  end if;
end $$;
