-- Kaswise v1.0 Base Schema
-- Phase 0.2: Supabase project bootstrap

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  plan_type text not null default 'free' check (plan_type in ('free', 'premium')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'ewallet', 'investment')),
  balance numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  bank_name text,
  account_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  group_id uuid,
  input_type text not null default 'manual' check (input_type in ('manual', 'text', 'image', 'voice', 'import')),
  raw_input text,
  status text not null default 'done' check (status in ('processing', 'done', 'error')),
  error_message text,
  nominal numeric(14,2),
  type text check (type in ('income', 'expense')),
  kategori text,
  merchant text,
  tanggal date,
  catatan text,
  receipt_url text,
  is_verified boolean not null default false,
  review_required boolean not null default false,
  confidence numeric(5,4),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  is_default boolean not null default false,
  budget_limit numeric(14,2),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid,
  category text not null,
  limit_amount numeric(14,2) not null,
  spent_amount numeric(14,2) not null default 0,
  period text not null default 'monthly' check (period in ('monthly', 'weekly')),
  period_start date not null,
  notify_at_percent numeric(5,2) not null default 80,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.bill_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  due_day integer not null check (due_day between 1 and 31),
  recurrence text not null check (recurrence in ('monthly', 'yearly', 'once')),
  next_due_date date not null,
  notify_before_days integer not null default 3,
  is_paid boolean not null default false,
  payment_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  max_members integer not null default 10,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  joined_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(group_id, user_id)
);

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bulan integer not null check (bulan between 1 and 12),
  tahun integer not null,
  total_pengeluaran numeric(14,2) not null default 0,
  total_pemasukan numeric(14,2) not null default 0,
  by_kategori jsonb not null default '{}'::jsonb,
  ai_insight text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, bulan, tahun)
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  ai_text_count integer not null default 0,
  voice_count integer not null default 0,
  import_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, month, year)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_wallets_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger set_budgets_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

create trigger set_bill_reminders_updated_at
before update on public.bill_reminders
for each row execute function public.set_updated_at();

create trigger set_groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create trigger set_group_members_updated_at
before update on public.group_members
for each row execute function public.set_updated_at();

create trigger set_monthly_summaries_updated_at
before update on public.monthly_summaries
for each row execute function public.set_updated_at();

create trigger set_usage_counters_updated_at
before update on public.usage_counters
for each row execute function public.set_updated_at();

create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_transactions_user_id_created_at on public.transactions(user_id, created_at desc);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_input_type on public.transactions(input_type);
create index if not exists idx_transactions_wallet_id on public.transactions(wallet_id);
create index if not exists idx_transactions_tanggal on public.transactions(tanggal desc);
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_budgets_user_id_period_start on public.budgets(user_id, period_start desc);
create index if not exists idx_bill_reminders_user_id_next_due_date on public.bill_reminders(user_id, next_due_date asc);
create index if not exists idx_groups_owner_id on public.groups(owner_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_monthly_summaries_user_id_year_month on public.monthly_summaries(user_id, tahun desc, bulan desc);
create index if not exists idx_usage_counters_user_id_year_month on public.usage_counters(user_id, year desc, month desc);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.bill_reminders enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.monthly_summaries enable row level security;
alter table public.usage_counters enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id);
create policy "wallets_insert_own" on public.wallets
  for insert with check (auth.uid() = user_id);
create policy "wallets_update_own" on public.wallets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wallets_delete_own" on public.wallets
  for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

create policy "bill_reminders_select_own" on public.bill_reminders
  for select using (auth.uid() = user_id);
create policy "bill_reminders_insert_own" on public.bill_reminders
  for insert with check (auth.uid() = user_id);
create policy "bill_reminders_update_own" on public.bill_reminders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bill_reminders_delete_own" on public.bill_reminders
  for delete using (auth.uid() = user_id);

create policy "groups_select_member_or_owner" on public.groups
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );
create policy "groups_insert_owner" on public.groups
  for insert with check (auth.uid() = owner_id);
create policy "groups_update_owner" on public.groups
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "groups_delete_owner" on public.groups
  for delete using (auth.uid() = owner_id);

create policy "group_members_select_member" on public.group_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );
create policy "group_members_insert_admin_or_owner" on public.group_members
  for insert with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );
create policy "group_members_update_admin_or_owner" on public.group_members
  for update using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );
create policy "group_members_delete_admin_or_owner" on public.group_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

create policy "monthly_summaries_select_own" on public.monthly_summaries
  for select using (auth.uid() = user_id);
create policy "monthly_summaries_insert_own" on public.monthly_summaries
  for insert with check (auth.uid() = user_id);
create policy "monthly_summaries_update_own" on public.monthly_summaries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "monthly_summaries_delete_own" on public.monthly_summaries
  for delete using (auth.uid() = user_id);

create policy "usage_counters_select_own" on public.usage_counters
  for select using (auth.uid() = user_id);
create policy "usage_counters_insert_own" on public.usage_counters
  for insert with check (auth.uid() = user_id);
create policy "usage_counters_update_own" on public.usage_counters
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usage_counters_delete_own" on public.usage_counters
  for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();