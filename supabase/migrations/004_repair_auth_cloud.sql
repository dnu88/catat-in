-- ============================================================
-- CATAT.IN — Migration 004: Repair Cloud Auth Signup
-- Tujuan:
-- 1. Menyamakan bentuk tabel profiles dengan ekspektasi backend
-- 2. Memperbaiki trigger auth.users -> public.profiles
-- 3. Menghindari error signup seperti:
--    "Database error saving new user"
--
-- Aman dijalankan berulang kali.
-- Jalankan via: Supabase Studio > SQL Editor > paste & Run
-- ============================================================

create extension if not exists "pgcrypto";
-- Pastikan enum plan_type tersedia sebelum dipakai di profiles.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_type') then
    create type plan_type as enum ('free', 'premium');
  end if;
end $$;
-- Pastikan kolom penting untuk profile ada.
alter table if exists public.profiles
  add column if not exists avatar_url text,
  add column if not exists plan_type plan_type not null default 'free',
  add column if not exists plan_expires_at timestamptz,
  add column if not exists group_id uuid,
  add column if not exists fcm_token text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
-- Normalisasi tipe kolom plan_type.
-- Beberapa project cloud lama menyimpan plan_type sebagai text, bukan enum.
alter table public.profiles
  alter column plan_type drop default;
alter table public.profiles
  alter column plan_type type plan_type
  using (
    case
      when plan_type is null then 'free'
      when lower(plan_type::text) = 'premium' then 'premium'
      else 'free'
    end::plan_type
  );
-- Backfill nilai null/blank agar insert profile baru tidak jatuh pada constraint lama.
update public.profiles p
set
  email = coalesce(nullif(p.email, ''), u.email, 'unknown@example.com'),
  full_name = coalesce(
    nullif(p.full_name, ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    split_part(coalesce(u.email, p.email, 'user@example.com'), '@', 1),
    'User'
  ),
  avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url'),
  plan_type = coalesce(
    case
      when p.plan_type is null then null
      else p.plan_type::text
    end,
    'free'
  )::plan_type,
  created_at = coalesce(p.created_at, now()),
  updated_at = coalesce(p.updated_at, now())
from auth.users u
where u.id = p.id;
update public.profiles
set
  email = coalesce(nullif(email, ''), 'unknown@example.com'),
  full_name = coalesce(nullif(full_name, ''), split_part(coalesce(email, 'user@example.com'), '@', 1), 'User'),
  plan_type = coalesce(
    case
      when plan_type is null then null
      else plan_type::text
    end,
    'free'
  )::plan_type,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  email is null
  or email = ''
  or full_name is null
  or full_name = ''
  or plan_type is null
  or created_at is null
  or updated_at is null;
alter table public.profiles
  alter column email set not null,
  alter column full_name set not null,
  alter column plan_type set default 'free',
  alter column created_at set default now(),
  alter column updated_at set default now();
-- Trigger helper untuk updated_at.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
-- Ganti function signup agar tidak bergantung pada shape schema lama.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    plan_type,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email, 'unknown@example.com'),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(coalesce(new.email, 'user@example.com'), '@', 1),
      'User'
    ),
    new.raw_user_meta_data->>'avatar_url',
    'free'::plan_type,
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- Verifikasi cepat setelah menjalankan script ini:
-- 1. Coba signup user baru dari app / endpoint /auth/v1/signup
-- 2. Jalankan query ini:
--    select id, email, full_name, plan_type, created_at
--    from public.profiles
--    order by created_at desc
--    limit 5;;
