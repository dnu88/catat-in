-- Security hardening: remove legacy permissive RLS policies if they exist.
-- Context: SECURITY_AUDIT_FULL_2026-06-12 H2.
-- Postgres combines permissive policies with OR; stale legacy policies can widen access.

do $$
begin
  if to_regclass('public.transactions') is not null then
    execute 'drop policy if exists transactions_own on public.transactions';
  end if;

  if to_regclass('public.wallets') is not null then
    execute 'drop policy if exists wallets_own_and_group on public.wallets';
  end if;

  if to_regclass('public.groups') is not null then
    execute 'drop policy if exists groups_member_access on public.groups';
  end if;

  if to_regclass('public.group_members') is not null then
    execute 'drop policy if exists group_members_access on public.group_members';
  end if;

  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists profiles_own on public.profiles';
  end if;
end $$;
