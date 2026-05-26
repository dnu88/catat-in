-- Align drifted production transactions table with current Expo mobile/PWA payloads.
-- Safe to re-run on both drifted production schemas and fresh schemas.

begin;

insert into public.profiles (id, email, full_name)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
on conflict (id) do nothing;

do $$
declare
  legacy_column text;
begin
  foreach legacy_column in array array['amount', 'category', 'description', 'transaction_type', 'date']
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'transactions'
        and column_name = legacy_column
    ) then
      execute format('alter table public.transactions alter column %I drop not null', legacy_column);
    end if;
  end loop;
end $$;

commit;
