-- ============================================================
-- CATAT.IN — Migration 002: Tabel yang belum ada di cloud
-- Jalankan via: Supabase Studio > SQL Editor > paste & run
-- Atau via: supabase db push (jika CLI sudah di-link)
-- ============================================================

-- ── GROUPS ───────────────────────────────────────────────────

create table if not exists public.groups (
  id            uuid primary key default uuid_generate_v4(),
  name          varchar(60) not null,
  description   text,
  owner_id      uuid not null references public.profiles(id),
  invite_code   varchar(8) not null unique,
  invite_link   text not null unique,
  max_members   int not null default 10,
  created_at    timestamptz not null default now()
);

-- Tambah FK group_id ke profiles (idempotent)
do $$
begin
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

-- ── BILL REMINDERS ───────────────────────────────────────────

create table if not exists public.bill_reminders (
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

create table if not exists public.import_logs (
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

-- ── RLS ──────────────────────────────────────────────────────

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.bill_reminders enable row level security;
alter table public.import_logs enable row level security;

-- Groups: user bisa lihat/edit grup di mana mereka adalah member
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

-- Group members: user bisa lihat member dari grup mereka sendiri
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

-- Bill reminders: user hanya bisa akses pengingat sendiri
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'bill_reminders' and policyname = 'bill_reminders_own') then
    create policy "bill_reminders_own" on public.bill_reminders
      for all using (auth.uid() = user_id);
  end if;
end $$;

-- Import logs: user hanya bisa lihat log import sendiri
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'import_logs' and policyname = 'import_logs_own') then
    create policy "import_logs_own" on public.import_logs
      for all using (auth.uid() = user_id);
  end if;
end $$;
