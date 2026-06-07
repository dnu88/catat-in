-- Kaswise freemium: tabel kuota AI (ai_usage) + pembayaran (payments).
-- ai_usage: counter per user per bulan (period_ym), reset implisit.
-- payments: order Midtrans Snap + idempotensi (Plan 2).

-- ── ai_usage ────────────────────────────────────────────────
create table if not exists public.ai_usage (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  period_ym   text        not null,           -- 'YYYY-MM'
  chat_count  int         not null default 0,
  photo_count int         not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, period_ym)
);

alter table public.ai_usage enable row level security;

drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select using (auth.uid() = user_id);
-- Tulis hanya via service role (backend) / RPC di bawah.

-- Increment atomik. Dipanggil backend dgn service role -> p_user_id eksplisit.
create or replace function public.increment_ai_usage(
  p_user_id uuid, p_period text, p_kind text
) returns public.ai_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.ai_usage;
begin
  if p_kind not in ('chat', 'photo') then
    raise exception 'invalid p_kind: %', p_kind;
  end if;
  insert into public.ai_usage (user_id, period_ym, chat_count, photo_count)
  values (
    p_user_id, p_period,
    case when p_kind = 'chat'  then 1 else 0 end,
    case when p_kind = 'photo' then 1 else 0 end
  )
  on conflict (user_id, period_ym) do update set
    chat_count  = public.ai_usage.chat_count  + (case when p_kind = 'chat'  then 1 else 0 end),
    photo_count = public.ai_usage.photo_count + (case when p_kind = 'photo' then 1 else 0 end),
    updated_at  = now()
  returning * into rec;
  return rec;
end;
$$;

revoke all on function public.increment_ai_usage(uuid, text, text) from public, anon, authenticated;
grant execute on function public.increment_ai_usage(uuid, text, text) to service_role;

-- ── payments ────────────────────────────────────────────────
create table if not exists public.payments (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  order_id        text        not null unique,
  plan            text        not null check (plan in ('monthly','yearly')),
  amount          int         not null,
  price_tier      text        not null check (price_tier in ('promo','normal')),
  method          text,
  midtrans_status text,
  status          text        not null default 'pending'
                              check (status in ('pending','paid','failed','expired')),
  paid_at         timestamptz,
  granted_until   timestamptz,
  raw_payload     jsonb,
  created_at      timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select using (auth.uid() = user_id);
-- Tulis hanya via service role (backend).

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);
