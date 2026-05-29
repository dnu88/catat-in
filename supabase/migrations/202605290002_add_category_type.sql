-- Keep category classification compatible across fresh and drifted live schemas.

begin;

alter table public.categories
  add column if not exists type text check (type in ('income', 'expense'));

commit;
