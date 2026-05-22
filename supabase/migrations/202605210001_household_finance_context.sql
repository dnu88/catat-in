-- Household finance context: schema, helpers, invite-code RPC, and RLS

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique constraint households_invite_code_normalized check (
    invite_code = upper(btrim(invite_code))
    and invite_code ~ '^[A-Z0-9]{6,12}$'
  ),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  joined_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(household_id, user_id)
);

alter table public.transactions add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.transactions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.transactions add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.wallets add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.wallets add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.wallets add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.budgets add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.budgets add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.budgets add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.bill_reminders add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.bill_reminders add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.bill_reminders add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.budget_envelopes add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.budget_envelopes add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.budget_envelopes add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.transactions set created_by = user_id where created_by is null;
update public.transactions set updated_by = user_id where updated_by is null;
update public.wallets set created_by = user_id where created_by is null;
update public.wallets set updated_by = user_id where updated_by is null;
update public.budgets set created_by = user_id where created_by is null;
update public.budgets set updated_by = user_id where updated_by is null;
update public.bill_reminders set created_by = user_id where created_by is null;
update public.bill_reminders set updated_by = user_id where updated_by is null;
update public.budget_envelopes set created_by = user_id where created_by is null;
update public.budget_envelopes set updated_by = user_id where updated_by is null;

update public.households
set invite_code = upper(btrim(invite_code))
where invite_code is distinct from upper(btrim(invite_code));

alter table public.households drop constraint if exists households_invite_code_normalized;
alter table public.households add constraint households_invite_code_normalized check (
  invite_code = upper(btrim(invite_code))
  and invite_code ~ '^[A-Z0-9]{6,12}$'
);

create index if not exists idx_households_owner_id on public.households(owner_id);
create index if not exists idx_households_invite_code on public.households(invite_code);
create index if not exists idx_household_members_household_id on public.household_members(household_id);
create index if not exists idx_household_members_user_id on public.household_members(user_id);
create index if not exists idx_transactions_household_date on public.transactions(household_id, tanggal desc);
create index if not exists idx_wallets_household_id on public.wallets(household_id);
create index if not exists idx_budgets_household_id on public.budgets(household_id);
create index if not exists idx_bill_reminders_household_id on public.bill_reminders(household_id);
create index if not exists idx_budget_envelopes_household_id on public.budget_envelopes(household_id);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

create or replace function public.household_role(target_household_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select hm.role
  from public.household_members hm
  where hm.household_id = target_household_id
    and hm.user_id = auth.uid()
    and hm.status = 'active'
  limit 1;
$$;

create or replace function public.can_write_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.household_role(target_household_id) in ('owner', 'admin', 'member'), false);
$$;

create or replace function public.can_admin_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.household_role(target_household_id) in ('owner', 'admin'), false);
$$;

create or replace function public.transaction_wallet_matches_scope(
  target_wallet_id uuid,
  target_user_id uuid,
  target_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_wallet_id is null
    or exists (
      select 1
      from public.wallets w
      where w.id = target_wallet_id
        and (
          (
            target_household_id is null
            and w.household_id is null
            and w.user_id = target_user_id
            and target_user_id = auth.uid()
          )
          or (
            target_household_id is not null
            and w.household_id = target_household_id
          )
        )
    );
$$;

create or replace function public.set_financial_audit_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(auth.uid(), new.created_by, new.user_id);
    new.updated_by = coalesce(auth.uid(), new.updated_by, new.created_by, new.user_id);
  elsif tg_op = 'UPDATE' then
    new.updated_by = coalesce(auth.uid(), new.updated_by);
  end if;

  return new;
end;
$$;

create or replace function public.prevent_financial_scope_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Cannot change financial row user scope';
  end if;

  if new.household_id is distinct from old.household_id then
    raise exception 'Cannot change financial row household scope';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'Cannot change financial row creator scope';
  end if;

  return new;
end;
$$;

create or replace function public.create_owner_household_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.household_members (household_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active')
  on conflict (household_id, user_id)
  do update set role = 'owner', status = 'active', updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

create or replace function public.join_household_by_invite_code(invite_code_input text)
returns table(household_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
  joining_user_id uuid := auth.uid();
  normalized_invite_code text := upper(btrim(invite_code_input));
begin
  if joining_user_id is null then
    raise exception 'Authentication required';
  end if;

  if normalized_invite_code is null or normalized_invite_code !~ '^[A-Z0-9]{6,12}$' then
    raise exception 'Invalid invite code';
  end if;

  select h.id into target_household_id
  from public.households h
  where h.invite_code = normalized_invite_code;

  if target_household_id is null then
    raise exception 'Invite code not found';
  end if;

  insert into public.household_members (household_id, user_id, role, status)
  values (target_household_id, joining_user_id, 'member', 'active')
  on conflict (household_id, user_id)
  do update set
    status = 'active',
    role = case
      when public.household_members.role = 'owner'
        and exists (
          select 1
          from public.households h
          where h.id = target_household_id
            and h.owner_id = joining_user_id
        )
        then 'owner'
      else 'member'
    end,
    updated_at = timezone('utc'::text, now());

  return query select target_household_id;
end;
$$;

do $$
begin
  if pg_get_functiondef('public.join_household_by_invite_code(text)'::regprocedure) like '%role in (''owner'', ''admin'')%' then
    raise exception 'join_household_by_invite_code must not preserve admin role on invite rejoin';
  end if;

  if pg_get_functiondef('public.join_household_by_invite_code(text)'::regprocedure) not like '%h.owner_id = joining_user_id%' then
    raise exception 'join_household_by_invite_code must only preserve owner role for owner self-recovery';
  end if;
end;
$$;

drop trigger if exists set_households_updated_at on public.households;
create trigger set_households_updated_at
before update on public.households
for each row execute function public.set_updated_at();

drop trigger if exists create_owner_household_membership on public.households;
create trigger create_owner_household_membership
after insert on public.households
for each row execute function public.create_owner_household_membership();

drop trigger if exists set_household_members_updated_at on public.household_members;
create trigger set_household_members_updated_at
before update on public.household_members
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_audit_fields on public.transactions;
create trigger set_transactions_audit_fields
before insert or update on public.transactions
for each row execute function public.set_financial_audit_fields();

drop trigger if exists set_wallets_audit_fields on public.wallets;
create trigger set_wallets_audit_fields
before insert or update on public.wallets
for each row execute function public.set_financial_audit_fields();

drop trigger if exists set_budgets_audit_fields on public.budgets;
create trigger set_budgets_audit_fields
before insert or update on public.budgets
for each row execute function public.set_financial_audit_fields();

drop trigger if exists set_bill_reminders_audit_fields on public.bill_reminders;
create trigger set_bill_reminders_audit_fields
before insert or update on public.bill_reminders
for each row execute function public.set_financial_audit_fields();

drop trigger if exists set_budget_envelopes_audit_fields on public.budget_envelopes;
create trigger set_budget_envelopes_audit_fields
before insert or update on public.budget_envelopes
for each row execute function public.set_financial_audit_fields();

drop trigger if exists prevent_transactions_scope_change on public.transactions;
create trigger prevent_transactions_scope_change
before update on public.transactions
for each row execute function public.prevent_financial_scope_change();

drop trigger if exists prevent_wallets_scope_change on public.wallets;
create trigger prevent_wallets_scope_change
before update on public.wallets
for each row execute function public.prevent_financial_scope_change();

drop trigger if exists prevent_budgets_scope_change on public.budgets;
create trigger prevent_budgets_scope_change
before update on public.budgets
for each row execute function public.prevent_financial_scope_change();

drop trigger if exists prevent_bill_reminders_scope_change on public.bill_reminders;
create trigger prevent_bill_reminders_scope_change
before update on public.bill_reminders
for each row execute function public.prevent_financial_scope_change();

drop trigger if exists prevent_budget_envelopes_scope_change on public.budget_envelopes;
create trigger prevent_budget_envelopes_scope_change
before update on public.budget_envelopes
for each row execute function public.prevent_financial_scope_change();

insert into public.household_members (household_id, user_id, role, status)
select h.id, h.owner_id, 'owner', 'active'
from public.households h
on conflict (household_id, user_id)
do update set role = 'owner', status = 'active', updated_at = timezone('utc'::text, now());

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.budgets enable row level security;
alter table public.bill_reminders enable row level security;
alter table public.budget_envelopes enable row level security;
alter table public.transaction_envelope_allocations enable row level security;

drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select using (public.is_household_member(id) or owner_id = auth.uid());

drop policy if exists "households_insert_owner" on public.households;
create policy "households_insert_owner" on public.households
  for insert with check (owner_id = auth.uid());

drop policy if exists "households_update_owner" on public.households;
create policy "households_update_owner" on public.households
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "households_delete_owner" on public.households;
create policy "households_delete_owner" on public.households
  for delete using (owner_id = auth.uid());

drop policy if exists "household_members_select_active_peer" on public.household_members;
create policy "household_members_select_active_peer" on public.household_members
  for select using (
    public.can_admin_household(household_id)
    or (status = 'active' and public.is_household_member(household_id))
  );

drop policy if exists "household_members_insert_admin" on public.household_members;
create policy "household_members_insert_admin" on public.household_members
  for insert with check (
    (
      public.can_admin_household(household_id)
      and role in ('admin', 'member', 'viewer')
    )
    or (
      role = 'owner'
      and user_id = auth.uid()
      and exists (
        select 1
        from public.households h
        where h.id = household_id
          and h.owner_id = auth.uid()
      )
    )
  );

drop policy if exists "household_members_update_admin" on public.household_members;
create policy "household_members_update_admin" on public.household_members
  for update using (
    public.can_admin_household(household_id)
    and role <> 'owner'
  ) with check (
    public.can_admin_household(household_id)
    and role in ('admin', 'member', 'viewer')
  );

drop policy if exists "household_members_delete_admin_or_self" on public.household_members;
create policy "household_members_delete_admin_or_self" on public.household_members
  for delete using (
    user_id = auth.uid()
    or (public.can_admin_household(household_id) and role <> 'owner')
  );

-- Financial table RLS policies support personal rows (household_id is null) and household rows.

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;
drop policy if exists "transactions_select_personal_or_household" on public.transactions;
drop policy if exists "transactions_insert_personal_or_household" on public.transactions;
drop policy if exists "transactions_update_personal_or_household" on public.transactions;
drop policy if exists "transactions_delete_personal_or_household" on public.transactions;

create policy "transactions_select_personal_or_household" on public.transactions
  for select using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "transactions_insert_personal_or_household" on public.transactions
  for insert with check (
    public.transaction_wallet_matches_scope(wallet_id, user_id, household_id)
    and (
      (
        household_id is null
        and user_id = auth.uid()
        and created_by = auth.uid()
        and updated_by = auth.uid()
      )
      or (
        household_id is not null
        and user_id = auth.uid()
        and created_by = auth.uid()
        and public.can_write_household(household_id)
      )
    )
  );

create policy "transactions_update_personal_or_household" on public.transactions
  for update using (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  ) with check (
    public.transaction_wallet_matches_scope(wallet_id, user_id, household_id)
    and (
      (
        household_id is null
        and user_id = auth.uid()
        and created_by = auth.uid()
        and updated_by = auth.uid()
      )
      or (
        household_id is not null
        and updated_by = auth.uid()
        and (
          public.can_admin_household(household_id)
          or (created_by = auth.uid() and public.household_role(household_id) = 'member')
        )
      )
    )
  );

create policy "transactions_delete_personal_or_household" on public.transactions
  for delete using (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

drop policy if exists "wallets_select_own" on public.wallets;
drop policy if exists "wallets_insert_own" on public.wallets;
drop policy if exists "wallets_update_own" on public.wallets;
drop policy if exists "wallets_delete_own" on public.wallets;
drop policy if exists "wallets_select_personal_or_household" on public.wallets;
drop policy if exists "wallets_insert_personal_or_household" on public.wallets;
drop policy if exists "wallets_update_personal_or_household" on public.wallets;
drop policy if exists "wallets_delete_personal_or_household" on public.wallets;

create policy "wallets_select_personal_or_household" on public.wallets
  for select using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "wallets_insert_personal_or_household" on public.wallets
  for insert with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and public.can_write_household(household_id)
    )
  );

create policy "wallets_update_personal_or_household" on public.wallets
  for update using (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  ) with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and updated_by = auth.uid()
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

create policy "wallets_delete_personal_or_household" on public.wallets
  for delete using (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

drop policy if exists "budgets_select_own" on public.budgets;
drop policy if exists "budgets_insert_own" on public.budgets;
drop policy if exists "budgets_update_own" on public.budgets;
drop policy if exists "budgets_delete_own" on public.budgets;
drop policy if exists "budgets_select_personal_or_household" on public.budgets;
drop policy if exists "budgets_insert_personal_or_household" on public.budgets;
drop policy if exists "budgets_update_personal_or_household" on public.budgets;
drop policy if exists "budgets_delete_personal_or_household" on public.budgets;

create policy "budgets_select_personal_or_household" on public.budgets
  for select using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "budgets_insert_personal_or_household" on public.budgets
  for insert with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and public.can_write_household(household_id)
    )
  );

create policy "budgets_update_personal_or_household" on public.budgets
  for update using (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  ) with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and updated_by = auth.uid()
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

create policy "budgets_delete_personal_or_household" on public.budgets
  for delete using (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

drop policy if exists "bill_reminders_select_own" on public.bill_reminders;
drop policy if exists "bill_reminders_insert_own" on public.bill_reminders;
drop policy if exists "bill_reminders_update_own" on public.bill_reminders;
drop policy if exists "bill_reminders_delete_own" on public.bill_reminders;
drop policy if exists "bill_reminders_select_personal_or_household" on public.bill_reminders;
drop policy if exists "bill_reminders_insert_personal_or_household" on public.bill_reminders;
drop policy if exists "bill_reminders_update_personal_or_household" on public.bill_reminders;
drop policy if exists "bill_reminders_delete_personal_or_household" on public.bill_reminders;

create policy "bill_reminders_select_personal_or_household" on public.bill_reminders
  for select using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "bill_reminders_insert_personal_or_household" on public.bill_reminders
  for insert with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and public.can_write_household(household_id)
    )
  );

create policy "bill_reminders_update_personal_or_household" on public.bill_reminders
  for update using (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  ) with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and updated_by = auth.uid()
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

create policy "bill_reminders_delete_personal_or_household" on public.bill_reminders
  for delete using (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

drop policy if exists "Users can read own budget envelopes" on public.budget_envelopes;
drop policy if exists "Users can insert own budget envelopes" on public.budget_envelopes;
drop policy if exists "Users can update own budget envelopes" on public.budget_envelopes;
drop policy if exists "Users can delete own budget envelopes" on public.budget_envelopes;
drop policy if exists "budget_envelopes_select_personal_or_household" on public.budget_envelopes;
drop policy if exists "budget_envelopes_insert_personal_or_household" on public.budget_envelopes;
drop policy if exists "budget_envelopes_update_personal_or_household" on public.budget_envelopes;
drop policy if exists "budget_envelopes_delete_personal_or_household" on public.budget_envelopes;

create policy "budget_envelopes_select_personal_or_household" on public.budget_envelopes
  for select using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "budget_envelopes_insert_personal_or_household" on public.budget_envelopes
  for insert with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
      and (
        parent_category_id is null
        or exists (
          select 1 from public.categories c
          where c.id = parent_category_id and c.user_id = auth.uid()
        )
      )
    )
    or (
      household_id is not null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and public.can_write_household(household_id)
      and (
        parent_category_id is null
        or exists (
          select 1 from public.categories c
          where c.id = parent_category_id and c.user_id = auth.uid()
        )
      )
    )
  );

create policy "budget_envelopes_update_personal_or_household" on public.budget_envelopes
  for update using (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  ) with check (
    (
      household_id is null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and updated_by = auth.uid()
      and (
        parent_category_id is null
        or exists (
          select 1 from public.categories c
          where c.id = parent_category_id and c.user_id = auth.uid()
        )
      )
    )
    or (
      household_id is not null
      and updated_by = auth.uid()
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
      and (
        parent_category_id is null
        or exists (
          select 1 from public.categories c
          where c.id = parent_category_id and c.user_id = auth.uid()
        )
      )
    )
  );

create policy "budget_envelopes_delete_personal_or_household" on public.budget_envelopes
  for delete using (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  );

drop policy if exists "Users can read own envelope allocations" on public.transaction_envelope_allocations;
drop policy if exists "Users can insert own envelope allocations" on public.transaction_envelope_allocations;
drop policy if exists "Users can update own envelope allocations" on public.transaction_envelope_allocations;
drop policy if exists "Users can delete own envelope allocations" on public.transaction_envelope_allocations;
drop policy if exists "transaction_envelope_allocations_select_personal_or_household" on public.transaction_envelope_allocations;
drop policy if exists "transaction_envelope_allocations_insert_personal_or_household" on public.transaction_envelope_allocations;
drop policy if exists "transaction_envelope_allocations_update_personal_or_household" on public.transaction_envelope_allocations;
drop policy if exists "transaction_envelope_allocations_delete_personal_or_household" on public.transaction_envelope_allocations;

create policy "transaction_envelope_allocations_select_personal_or_household" on public.transaction_envelope_allocations
  for select using (
    exists (
      select 1
      from public.transactions t
      join public.budget_envelopes e on e.id = envelope_id
      where t.id = transaction_id
        and (
          (
            t.household_id is null
            and e.household_id is null
            and t.user_id = auth.uid()
            and e.user_id = auth.uid()
          )
          or (
            t.household_id is not null
            and e.household_id = t.household_id
            and public.is_household_member(t.household_id)
          )
        )
    )
  );

create policy "transaction_envelope_allocations_insert_personal_or_household" on public.transaction_envelope_allocations
  for insert with check (
    exists (
      select 1
      from public.transactions t
      join public.budget_envelopes e on e.id = envelope_id
      where t.id = transaction_id
        and (
          (
            t.household_id is null
            and e.household_id is null
            and t.user_id = auth.uid()
            and e.user_id = auth.uid()
          )
          or (
            t.household_id is not null
            and e.household_id = t.household_id
            and (
              public.can_admin_household(t.household_id)
              or (t.created_by = auth.uid() and public.household_role(t.household_id) = 'member')
            )
          )
        )
    )
  );

create policy "transaction_envelope_allocations_update_personal_or_household" on public.transaction_envelope_allocations
  for update using (
    exists (
      select 1
      from public.transactions t
      join public.budget_envelopes e on e.id = envelope_id
      where t.id = transaction_id
        and (
          (
            t.household_id is null
            and e.household_id is null
            and t.user_id = auth.uid()
            and e.user_id = auth.uid()
          )
          or (
            t.household_id is not null
            and e.household_id = t.household_id
            and (
              public.can_admin_household(t.household_id)
              or (t.created_by = auth.uid() and public.household_role(t.household_id) = 'member')
            )
          )
        )
    )
  ) with check (
    exists (
      select 1
      from public.transactions t
      join public.budget_envelopes e on e.id = envelope_id
      where t.id = transaction_id
        and (
          (
            t.household_id is null
            and e.household_id is null
            and t.user_id = auth.uid()
            and e.user_id = auth.uid()
          )
          or (
            t.household_id is not null
            and e.household_id = t.household_id
            and (
              public.can_admin_household(t.household_id)
              or (t.created_by = auth.uid() and public.household_role(t.household_id) = 'member')
            )
          )
        )
    )
  );

create policy "transaction_envelope_allocations_delete_personal_or_household" on public.transaction_envelope_allocations
  for delete using (
    exists (
      select 1
      from public.transactions t
      join public.budget_envelopes e on e.id = envelope_id
      where t.id = transaction_id
        and (
          (
            t.household_id is null
            and e.household_id is null
            and t.user_id = auth.uid()
            and e.user_id = auth.uid()
          )
          or (
            t.household_id is not null
            and e.household_id = t.household_id
            and (
              public.can_admin_household(t.household_id)
              or (t.created_by = auth.uid() and public.household_role(t.household_id) = 'member')
            )
          )
        )
    )
  );
