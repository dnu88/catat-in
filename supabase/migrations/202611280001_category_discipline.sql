-- Category discipline: FK-backed categorization + merchant→category rules.
--
-- 1. `transactions.category_id` — nullable FK to `public.categories`. The text
--    column `kategori` is NOT touched: legacy rows keep their text value while
--    `normalize_legacy_categories.py` backfills `category_id`.
--    `ON DELETE SET NULL` so deleting a custom category never blocks on
--    transactions; the surviving `kategori` text keeps the row meaningful.
-- 2. `merchant_category_rules` — per-user/household learned mapping
--    merchant → category. `merchant_norm` must already be lowercase/trimmed.
--    RLS follows the transactions pattern: personal rows (household_id null)
--    belong to user_id only; household rows require household membership
--    (write for owner/admin/member, mutate/delete for owner/admin).
--
-- Idempotent: every statement is guarded with if not exists / drop-if-exists.

alter table public.transactions
  add column if not exists category_id uuid
    references public.categories(id) on delete set null;

create index if not exists idx_transactions_category_id
  on public.transactions (category_id);

create table if not exists public.merchant_category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  merchant_norm text not null check (merchant_norm = lower(btrim(merchant_norm))),
  category_id uuid not null references public.categories(id) on delete cascade,
  source text not null default 'user_correction',
  hits integer not null default 1 check (hits >= 1),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_merchant_category_rules_user_id
  on public.merchant_category_rules (user_id);
create index if not exists idx_merchant_category_rules_household_id
  on public.merchant_category_rules (household_id);
create index if not exists idx_merchant_category_rules_category_id
  on public.merchant_category_rules (category_id);

-- Same rule per user+scope must not be duplicated. Null household rows collapse
-- onto the all-zero uuid so a unique index can treat both scopes uniformly.
create unique index if not exists merchant_category_rules_user_scope_merchant_uniq
  on public.merchant_category_rules
    (user_id, coalesce(household_id, '00000000-0000-0000-0000-000000000000'::uuid), merchant_norm);

alter table public.merchant_category_rules enable row level security;

drop trigger if exists set_merchant_category_rules_updated_at
  on public.merchant_category_rules;
create trigger set_merchant_category_rules_updated_at
before update on public.merchant_category_rules
for each row execute function public.set_updated_at();

drop policy if exists "merchant_category_rules_select_personal_or_household"
  on public.merchant_category_rules;
create policy "merchant_category_rules_select_personal_or_household"
  on public.merchant_category_rules
  for select using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.is_household_member(household_id))
  );

drop policy if exists "merchant_category_rules_insert_personal_or_household"
  on public.merchant_category_rules;
create policy "merchant_category_rules_insert_personal_or_household"
  on public.merchant_category_rules
  for insert with check (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and user_id = auth.uid()
      and public.can_write_household(household_id)
    )
  );

drop policy if exists "merchant_category_rules_update_personal_or_household"
  on public.merchant_category_rules;
create policy "merchant_category_rules_update_personal_or_household"
  on public.merchant_category_rules
  for update using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.can_admin_household(household_id))
  ) with check (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and (
        -- admin may touch any household rule (incl. member-owned rows);
        -- members may only touch their own rows in households they write.
        public.can_admin_household(household_id)
        or (user_id = auth.uid() and public.can_write_household(household_id))
      )
    )
  );

drop policy if exists "merchant_category_rules_delete_personal_or_household"
  on public.merchant_category_rules;
create policy "merchant_category_rules_delete_personal_or_household"
  on public.merchant_category_rules
  for delete using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.can_admin_household(household_id))
  );
