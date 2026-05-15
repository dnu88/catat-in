-- Harden group member RLS: prevent users from self-joining arbitrary groups
-- or escalating their own role. Existing groups owners remain responsible for
-- adding/updating members; members may only remove themselves.

drop policy if exists "group_members_insert_admin_or_owner" on public.group_members;
drop policy if exists "group_members_update_admin_or_owner" on public.group_members;
drop policy if exists "group_members_delete_admin_or_owner" on public.group_members;
drop policy if exists "group_members_insert_owner" on public.group_members;
drop policy if exists "group_members_update_owner" on public.group_members;
drop policy if exists "group_members_delete_owner_or_self" on public.group_members;

create policy "group_members_insert_owner" on public.group_members
  for insert with check (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

create policy "group_members_update_owner" on public.group_members
  for update using (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

create policy "group_members_delete_owner_or_self" on public.group_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );
