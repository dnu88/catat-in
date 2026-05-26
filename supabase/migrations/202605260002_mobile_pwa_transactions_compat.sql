-- Align drifted production transactions table with current Expo mobile/PWA payloads.
-- The app stores current fields in nominal/kategori/catatan/type/tanggal and also creates
-- processing draft rows with only input_type/status/raw_input. Older production columns must be nullable.

begin;

insert into public.profiles (id, email, full_name)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
on conflict (id) do nothing;

alter table public.transactions alter column amount drop not null;
alter table public.transactions alter column category drop not null;
alter table public.transactions alter column description drop not null;
alter table public.transactions alter column transaction_type drop not null;
alter table public.transactions alter column date drop not null;

commit;
