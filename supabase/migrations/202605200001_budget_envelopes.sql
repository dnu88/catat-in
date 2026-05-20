create table if not exists public.budget_envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  parent_category_id uuid null references public.categories(id) on delete set null,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  start_date date not null,
  end_date date not null,
  icon text null,
  color text null,
  notes text null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.transaction_envelope_allocations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  envelope_id uuid not null references public.budget_envelopes(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  confidence numeric(4,3) null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_envelopes_user_status_dates_idx
  on public.budget_envelopes (user_id, status, start_date, end_date);

create index if not exists transaction_envelope_allocations_envelope_idx
  on public.transaction_envelope_allocations (envelope_id);

create index if not exists transaction_envelope_allocations_transaction_idx
  on public.transaction_envelope_allocations (transaction_id);

alter table public.budget_envelopes enable row level security;
alter table public.transaction_envelope_allocations enable row level security;

create policy "Users can read own budget envelopes"
  on public.budget_envelopes for select
  using (auth.uid() = user_id);

create policy "Users can insert own budget envelopes"
  on public.budget_envelopes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budget envelopes"
  on public.budget_envelopes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own budget envelopes"
  on public.budget_envelopes for delete
  using (auth.uid() = user_id);

create policy "Users can read own envelope allocations"
  on public.transaction_envelope_allocations for select
  using (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
  );

create policy "Users can insert own envelope allocations"
  on public.transaction_envelope_allocations for insert
  with check (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create policy "Users can update own envelope allocations"
  on public.transaction_envelope_allocations for update
  using (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
  );
