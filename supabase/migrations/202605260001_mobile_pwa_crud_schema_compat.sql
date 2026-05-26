-- Align production schema drift with the current Expo mobile/PWA CRUD services.
-- Safe to re-run on both drifted production schemas and fresh schemas.

begin;

alter table public.budgets add column if not exists category text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets' and column_name = 'category_id'
  ) then
    execute $sql$
      update public.budgets b
      set category = coalesce(c.name, 'Uncategorized')
      from public.categories c
      where b.category_id = c.id and b.category is null
    $sql$;
  end if;
end $$;

update public.budgets set category = 'Uncategorized' where category is null;
alter table public.budgets alter column category set not null;

alter table public.budgets add column if not exists period_start date;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets' and column_name = 'start_date'
  ) then
    execute $sql$
      update public.budgets
      set period_start = coalesce(period_start, start_date, current_date)
    $sql$;
  else
    update public.budgets set period_start = coalesce(period_start, current_date);
  end if;
end $$;

alter table public.budgets alter column period_start set default current_date;
alter table public.budgets alter column period_start set not null;

alter table public.budgets add column if not exists spent_amount numeric(14,2) not null default 0;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets' and column_name = 'category_id'
  ) then
    alter table public.budgets alter column category_id drop not null;
  end if;
end $$;

alter table public.bill_reminders alter column notify_before_days drop default;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bill_reminders'
      and column_name = 'notify_before_days'
      and udt_name = '_int4'
  ) then
    alter table public.bill_reminders
      alter column notify_before_days type integer
      using coalesce(notify_before_days[1], 3);
  end if;
end $$;
alter table public.bill_reminders alter column notify_before_days set default 3;
alter table public.bill_reminders alter column notify_before_days set not null;
alter table public.bill_reminders add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

commit;
