-- Seed Kartu Kredit (Credit Card) as a default expense category
-- for all existing users who don't already have it.
-- Safe to re-run — uses ON CONFLICT DO NOTHING.

insert into public.categories (user_id, name, icon, is_default, type)
select p.id, 'Kartu Kredit', 'creditCard', true, 'expense'
from public.profiles p
where not exists (
  select 1 from public.categories c
  where c.user_id = p.id
    and c.name = 'Kartu Kredit'
);

-- Also seed the English version
insert into public.categories (user_id, name, icon, is_default, type)
select p.id, 'Credit Card', 'creditCard', true, 'expense'
from public.profiles p
where not exists (
  select 1 from public.categories c
  where c.user_id = p.id
    and c.name = 'Credit Card'
);
