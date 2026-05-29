alter table public.categories
  add column if not exists color text,
  add column if not exists visual_locked_by_user boolean not null default false;

comment on column public.categories.icon is 'Kaswise icon name used for category-first visual sync.';
comment on column public.categories.color is 'User-selected category color used by budget wallets, transactions, reports, and dashboard visuals.';
comment on column public.categories.visual_locked_by_user is 'True when user explicitly selected icon/color for this category.';
