-- Kaswise security hardening phase 1
-- Protect server-managed billing/quota fields from direct client mutation.

create or replace function public.prevent_profile_server_managed_field_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.plan_type is distinct from old.plan_type
     or new.plan_expires_at is distinct from old.plan_expires_at then
    raise exception 'Profile billing fields are server-managed';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_server_managed_field_change on public.profiles;
create trigger prevent_profile_server_managed_field_change
before update on public.profiles
for each row execute function public.prevent_profile_server_managed_field_change();

-- Usage counters drive free-tier quota and must not be mutable by clients.
-- Service role/backend jobs still bypass RLS and can manage these rows.
-- Some live environments may not have this legacy table, so guard with to_regclass.
do $$
begin
  if to_regclass('public.usage_counters') is not null then
    execute 'drop policy if exists "usage_counters_insert_own" on public.usage_counters';
    execute 'drop policy if exists "usage_counters_update_own" on public.usage_counters';
    execute 'drop policy if exists "usage_counters_delete_own" on public.usage_counters';

    -- Ensure the read policy remains present for user-facing quota display.
    execute 'drop policy if exists "usage_counters_select_own" on public.usage_counters';
    execute 'create policy "usage_counters_select_own" on public.usage_counters for select using (auth.uid() = user_id)';
  end if;
end $$;
