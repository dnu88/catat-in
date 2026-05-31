-- ============================================================
-- CATAT.IN - Migration 008: Fix group_members RLS recursion
--
-- The old group_members_access policy queried public.group_members from
-- inside a policy on public.group_members. Supabase/Postgres can evaluate
-- that recursively and fail with:
--   infinite recursion detected in policy for relation "group_members"
--
-- This migration moves the membership check into a SECURITY DEFINER
-- function owned by the table owner, then rewrites policies to call it.
-- ============================================================

create or replace function public.is_active_group_member(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
      and gm.status = 'active'
  );
$$;
grant execute on function public.is_active_group_member(uuid, uuid) to anon, authenticated;
drop policy if exists "transactions_own" on public.transactions;
create policy "transactions_own" on public.transactions
  for all using (
    auth.uid() = user_id or
    (
      is_shared = true
      and group_id is not null
      and public.is_active_group_member(group_id, auth.uid())
    )
  );
drop policy if exists "wallets_own_and_group" on public.wallets;
create policy "wallets_own_and_group" on public.wallets
  for select using (
    auth.uid() = user_id or
    (
      is_shared = true
      and group_id is not null
      and public.is_active_group_member(group_id, auth.uid())
    )
  );
drop policy if exists "groups_member_access" on public.groups;
create policy "groups_member_access" on public.groups
  for all using (
    auth.uid() = owner_id or
    public.is_active_group_member(id, auth.uid())
  );
drop policy if exists "group_members_access" on public.group_members;
create policy "group_members_access" on public.group_members
  for all using (
    user_id = auth.uid() or
    public.is_active_group_member(group_id, auth.uid())
  );
