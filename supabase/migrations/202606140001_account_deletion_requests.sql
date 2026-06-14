create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  reason text,
  details text,
  review_notes text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_requests_status_chk check (status in ('pending', 'in_review', 'completed', 'rejected', 'cancelled'))
);

create index if not exists idx_account_deletion_requests_user_requested
  on public.account_deletion_requests (user_id, requested_at desc);

create unique index if not exists idx_account_deletion_requests_user_active
  on public.account_deletion_requests (user_id)
  where status in ('pending', 'in_review');

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own on public.account_deletion_requests
  for select using (auth.uid() = user_id);

drop trigger if exists set_account_deletion_requests_updated_at on public.account_deletion_requests;
create trigger set_account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();
