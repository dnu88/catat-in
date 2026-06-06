create table if not exists public.report_period_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  rule_type text not null default 'monthly_cycle' check (rule_type in ('monthly_cycle')),
  start_day integer not null check (start_day between 1 and 31),
  end_day integer not null check (end_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_period_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  context_type text not null default 'personal' check (context_type in ('personal', 'household')),
  context_key text not null,
  active_type text not null default 'preset' check (active_type in ('preset', 'custom', 'saved_rule')),
  preset_type text check (preset_type in ('month', '3month', '6month', 'year')),
  active_rule_id uuid references public.report_period_rules(id) on delete set null,
  custom_start_date date,
  custom_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (active_type = 'preset' and preset_type is not null)
    or (active_type = 'custom' and custom_start_date is not null and custom_end_date is not null)
    or (active_type = 'saved_rule' and active_rule_id is not null)
  )
);

create unique index if not exists report_period_preferences_context_unique
  on public.report_period_preferences(user_id, context_key);

create index if not exists report_period_rules_user_context_idx
  on public.report_period_rules(user_id, household_id, created_at desc);

alter table public.report_period_rules enable row level security;
alter table public.report_period_preferences enable row level security;

create policy "Users can manage their report period rules"
  on public.report_period_rules
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their report period preferences"
  on public.report_period_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
