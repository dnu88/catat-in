-- Notification preferences per user.
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  daily_reminder_enabled boolean not null default true,
  daily_reminder_time text not null default '20:00',
  budget_alert_enabled boolean not null default true,
  budget_alert_thresholds int[] not null default array[80, 100],
  weekly_summary_enabled boolean not null default true,
  weekly_summary_day int not null default 0,
  weekly_summary_time text not null default '19:00',
  ai_insight_enabled boolean not null default true,
  bill_reminder_enabled boolean not null default false,
  timezone text not null default 'Asia/Jakarta',
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_weekly_day_chk check (weekly_summary_day between 0 and 6),
  constraint notification_preferences_daily_time_chk check (daily_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint notification_preferences_weekly_time_chk check (weekly_summary_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_chk check (type in (
    'budget_threshold',
    'weekly_summary',
    'ai_insight_ready',
    'daily_reminder',
    'bill_reminder',
    'system'
  ))
);

create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create unique index if not exists idx_notifications_user_dedupe
  on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

-- App users should not insert arbitrary notifications from client-side Supabase.
-- Backend writes with service role and bypasses RLS.

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();
