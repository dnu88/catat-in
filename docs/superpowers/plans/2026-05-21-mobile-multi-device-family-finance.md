# Mobile Multi-Device Family Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mobile-first multi-device and household finance support with personal/household contexts, role-based permissions, and Supabase RLS protection.

**Architecture:** Implement the feature in vertical slices: database/RLS first, then household services, finance context state, context-aware financial services, and mobile screens. The mobile app remains the active client; `apps/web` is not modified. Household rows reuse existing financial tables through `household_id`, `created_by`, and `updated_by`, while personal rows remain `household_id is null`.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase JS client, Supabase PostgreSQL/RLS migrations, Jest, @testing-library/react-native.

---

## File Structure

### Create

- `supabase/migrations/202605210001_household_finance_context.sql`  
  Adds households, household_members, household scope columns, indexes, helper functions, and RLS policies.
- `apps/mobile/src/services/households.ts`  
  Household CRUD, invite join, member list, role update, remove/leave operations.
- `apps/mobile/src/services/households.test.ts`  
  Unit tests for household service payloads and role-safe operations.
- `apps/mobile/src/state/finance-context.tsx`  
  React provider and hook for active `personal | household` finance context.
- `apps/mobile/src/state/finance-context.test.tsx`  
  Tests for active context fallback, permission helpers, and persisted selection behavior.
- `apps/mobile/src/services/finance-context-query.ts`  
  Small pure helper functions that apply context filters and build household audit fields.
- `apps/mobile/src/services/finance-context-query.test.ts`  
  Tests that personal and household query helpers never overlap.
- `apps/mobile/src/components/FinanceContextSwitcher.tsx`  
  Mobile header switcher for Pribadi/Keluarga.
- `apps/mobile/__tests__/family-context-switcher.test.tsx`  
  Screen-level tests for context switcher behavior.

### Modify

- `apps/mobile/app/_layout.tsx`  
  Wrap app with `FinanceContextProvider` after auth/theme providers.
- `apps/mobile/app/(tabs)/index.tsx`  
  Show context switcher and context badge on dashboard.
- `apps/mobile/app/(tabs)/groups.tsx`  
  Replace mock groups with Family Center backed by `households.ts`.
- `apps/mobile/app/(tabs)/transactions.tsx`  
  Use active context for list and mutation affordances.
- `apps/mobile/app/(tabs)/transaction-new.tsx`  
  Create transactions in active personal/household context.
- `apps/mobile/app/(tabs)/wallets.tsx`  
  Use active context and role gates.
- `apps/mobile/app/(tabs)/budgets.tsx`  
  Use active context and role gates for budget wallets.
- `apps/mobile/app/(tabs)/bills.tsx`  
  Use active context and role gates if current bills service is active.
- `apps/mobile/app/(tabs)/reports.tsx`  
  Filter report data by active context and show household badge.
- `apps/mobile/src/services/transactions.ts`  
  Accept finance context, apply filters, set audit fields, enforce role helper preconditions.
- `apps/mobile/src/services/wallets.ts`  
  Accept finance context, apply filters, set audit fields, enforce role helper preconditions.
- `apps/mobile/src/services/budgets.ts`  
  Accept finance context, apply filters, set audit fields.
- `apps/mobile/src/services/bills.ts`  
  Accept finance context, apply filters, set audit fields.
- `apps/mobile/src/services/budget-envelopes.ts`  
  Accept finance context for envelope list/create and allocation reads.
- Existing tests in `apps/mobile/__tests__` and `apps/mobile/src/services/*.test.ts`  
  Add household-context regression coverage.

---

## Task 1: Supabase Household Schema and RLS

**Files:**

- Create: `supabase/migrations/202605210001_household_finance_context.sql`
- Test/Verify: run migration in Supabase local or SQL editor; if no local Supabase is available, run SQL lint by applying to a scratch database before merge.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/202605210001_household_finance_context.sql` with this content:

```sql
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
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
alter table public.budget_envelopes add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.transactions set created_by = user_id where created_by is null;
update public.wallets set created_by = user_id where created_by is null;
update public.budgets set created_by = user_id where created_by is null;
update public.bill_reminders set created_by = user_id where created_by is null;
update public.budget_envelopes set created_by = user_id where created_by is null;

create index if not exists idx_households_owner_id on public.households(owner_id);
create index if not exists idx_households_invite_code on public.households(invite_code);
create index if not exists idx_household_members_household_id on public.household_members(household_id);
create index if not exists idx_household_members_user_id on public.household_members(user_id);
create index if not exists idx_transactions_household_date on public.transactions(household_id, date desc);
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

create trigger set_households_updated_at
before update on public.households
for each row execute function public.set_updated_at();

create trigger set_household_members_updated_at
before update on public.household_members
for each row execute function public.set_updated_at();

alter table public.households enable row level security;
alter table public.household_members enable row level security;

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
  for select using (public.is_household_member(household_id));

drop policy if exists "household_members_insert_admin" on public.household_members;
create policy "household_members_insert_admin" on public.household_members
  for insert with check (
    public.can_admin_household(household_id)
    and role in ('admin', 'member', 'viewer')
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

-- Financial table RLS policies are replaced per table to support both personal and household rows.
-- Example for transactions. Repeat the same shape for wallets, budgets, bill_reminders, and budget_envelopes.
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_personal_or_household" on public.transactions
  for select using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and public.is_household_member(household_id))
  );

create policy "transactions_insert_personal_or_household" on public.transactions
  for insert with check (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and user_id = auth.uid()
      and created_by = auth.uid()
      and public.can_write_household(household_id)
    )
  );

create policy "transactions_update_personal_or_household" on public.transactions
  for update using (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
      )
    )
  ) with check (
    (household_id is null and user_id = auth.uid())
    or (
      household_id is not null
      and updated_by = auth.uid()
      and (
        public.can_admin_household(household_id)
        or (created_by = auth.uid() and public.household_role(household_id) = 'member')
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
```

- [ ] **Step 2: Extend the migration for the remaining financial tables**

In the same migration, add the same personal-or-household RLS policy pattern for `wallets`, `budgets`, `bill_reminders`, and `budget_envelopes`. Use these table-specific ownership columns:

```sql
-- wallets: user_id, household_id, created_by, updated_by
-- budgets: user_id, household_id, created_by, updated_by
-- bill_reminders: user_id, household_id, created_by, updated_by
-- budget_envelopes: user_id, household_id, created_by, updated_by
```

Use policy names in this exact shape:

```sql
wallets_select_personal_or_household
wallets_insert_personal_or_household
wallets_update_personal_or_household
wallets_delete_personal_or_household
budgets_select_personal_or_household
budgets_insert_personal_or_household
budgets_update_personal_or_household
budgets_delete_personal_or_household
bill_reminders_select_personal_or_household
bill_reminders_insert_personal_or_household
bill_reminders_update_personal_or_household
bill_reminders_delete_personal_or_household
budget_envelopes_select_personal_or_household
budget_envelopes_insert_personal_or_household
budget_envelopes_update_personal_or_household
budget_envelopes_delete_personal_or_household
```

- [ ] **Step 3: Verify migration syntax**

Run from repo root if Supabase local CLI is configured:

```bash
supabase db reset
```

Expected: migration completes without SQL syntax errors.

If Supabase local is not configured, apply the migration to a scratch Supabase project SQL editor and capture the output. Expected: success with tables, functions, indexes, triggers, and policies created.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202605210001_household_finance_context.sql
git commit -m "feat(db): add household finance context"
```

---

## Task 2: Finance Context Query Helpers

**Files:**

- Create: `apps/mobile/src/services/finance-context-query.ts`
- Create: `apps/mobile/src/services/finance-context-query.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/services/finance-context-query.test.ts`:

```ts
import {
  applyFinanceContextFilter,
  buildFinanceInsertAudit,
  canCreateInContext,
  canDeleteInContext,
  canUpdateInContext,
  type FinanceContext,
} from "./finance-context-query";

function makeQueryRecorder() {
  const calls: Array<[string, string, unknown?]> = [];
  const query = {
    is(column: string, value: unknown) {
      calls.push(["is", column, value]);
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
  };
  return { query, calls };
}

describe("finance context query helpers", () => {
  it("filters personal rows to household_id is null", () => {
    const { query, calls } = makeQueryRecorder();

    applyFinanceContextFilter(query, { type: "personal" });

    expect(calls).toEqual([["is", "household_id", null]]);
  });

  it("filters household rows by active household id", () => {
    const { query, calls } = makeQueryRecorder();

    applyFinanceContextFilter(query, {
      type: "household",
      householdId: "hh-1",
      role: "member",
    });

    expect(calls).toEqual([["eq", "household_id", "hh-1"]]);
  });

  it("builds personal insert audit fields without household_id", () => {
    expect(buildFinanceInsertAudit({ type: "personal" }, "user-1")).toEqual({
      user_id: "user-1",
      household_id: null,
      created_by: "user-1",
      updated_by: "user-1",
    });
  });

  it("builds household insert audit fields with household id", () => {
    expect(
      buildFinanceInsertAudit(
        { type: "household", householdId: "hh-1", role: "admin" },
        "user-1",
      ),
    ).toEqual({
      user_id: "user-1",
      household_id: "hh-1",
      created_by: "user-1",
      updated_by: "user-1",
    });
  });

  it("allows owner/admin/member to create but viewer cannot create", () => {
    expect(canCreateInContext({ type: "personal" })).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "owner",
      }),
    ).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "admin",
      }),
    ).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "member",
      }),
    ).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "viewer",
      }),
    ).toBe(false);
  });

  it("limits member update/delete to rows they created", () => {
    const member: FinanceContext = {
      type: "household",
      householdId: "hh-1",
      role: "member",
    };
    const ownRow = { household_id: "hh-1", created_by: "user-1" };
    const otherRow = { household_id: "hh-1", created_by: "user-2" };

    expect(canUpdateInContext(member, ownRow, "user-1")).toBe(true);
    expect(canDeleteInContext(member, ownRow, "user-1")).toBe(true);
    expect(canUpdateInContext(member, otherRow, "user-1")).toBe(false);
    expect(canDeleteInContext(member, otherRow, "user-1")).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/services/finance-context-query.test.ts --silent
```

Expected: FAIL because `finance-context-query.ts` does not exist.

- [ ] **Step 3: Implement helper**

Create `apps/mobile/src/services/finance-context-query.ts`:

```ts
export type HouseholdRole = "owner" | "admin" | "member" | "viewer";

export type FinanceContext =
  | { type: "personal" }
  | { type: "household"; householdId: string; role: HouseholdRole };

type FilterableQuery<TQuery> = TQuery & {
  is(column: string, value: unknown): TQuery;
  eq(column: string, value: unknown): TQuery;
};

export function applyFinanceContextFilter<TQuery>(
  query: FilterableQuery<TQuery>,
  context: FinanceContext,
): TQuery {
  if (context.type === "personal") {
    return query.is("household_id", null);
  }

  return query.eq("household_id", context.householdId);
}

export function buildFinanceInsertAudit(
  context: FinanceContext,
  userId: string,
) {
  return {
    user_id: userId,
    household_id: context.type === "household" ? context.householdId : null,
    created_by: userId,
    updated_by: userId,
  };
}

export function buildFinanceUpdateAudit(userId: string) {
  return { updated_by: userId };
}

export function canCreateInContext(context: FinanceContext) {
  return context.type === "personal" || context.role !== "viewer";
}

export function canUpdateInContext(
  context: FinanceContext,
  row: { household_id?: string | null; created_by?: string | null },
  userId: string,
) {
  if (context.type === "personal") return row.household_id == null;
  if (context.role === "owner" || context.role === "admin")
    return row.household_id === context.householdId;
  if (context.role === "member")
    return (
      row.household_id === context.householdId && row.created_by === userId
    );
  return false;
}

export function canDeleteInContext(
  context: FinanceContext,
  row: { household_id?: string | null; created_by?: string | null },
  userId: string,
) {
  return canUpdateInContext(context, row, userId);
}
```

- [ ] **Step 4: Run passing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/services/finance-context-query.test.ts --silent
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/services/finance-context-query.ts apps/mobile/src/services/finance-context-query.test.ts
git commit -m "feat(mobile): add finance context query helpers"
```

---

## Task 3: Household Service

**Files:**

- Create: `apps/mobile/src/services/households.ts`
- Create: `apps/mobile/src/services/households.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `apps/mobile/src/services/households.test.ts` with a Supabase query-chain mock that records `.from()`, `.insert()`, `.update()`, `.eq()`, and `.select()` calls. Include these tests:

```ts
import {
  createHousehold,
  joinHouseholdByInviteCode,
  listMyHouseholds,
  removeHouseholdMember,
  updateHouseholdMemberRole,
} from "./households";

const mockSingle = jest.fn();
const mockSelect = jest.fn(() => chain);
const mockInsert = jest.fn(() => chain);
const mockUpdate = jest.fn(() => chain);
const mockEq = jest.fn(() => chain);
const mockOrder = jest.fn(() => chain);
const mockFrom = jest.fn(() => chain);

const chain = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
};

const supabase = { from: mockFrom } as any;

describe("household service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { id: "hh-1", name: "Keluarga Budi", invite_code: "ABC123" },
      error: null,
    });
  });

  it("creates household with owner membership", async () => {
    await createHousehold(supabase, {
      name: "Keluarga Budi",
      ownerId: "user-1",
    });

    expect(mockFrom).toHaveBeenCalledWith("households");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Keluarga Budi",
        owner_id: "user-1",
      }),
    );
  });

  it("lists active memberships for current user", async () => {
    await listMyHouseholds(supabase, "user-1");

    expect(mockFrom).toHaveBeenCalledWith("household_members");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockEq).toHaveBeenCalledWith("status", "active");
  });

  it("joins household by invite code through RPC", async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: { household_id: "hh-1" }, error: null });
    await joinHouseholdByInviteCode({ rpc } as any, "ABC123");

    expect(rpc).toHaveBeenCalledWith("join_household_by_invite_code", {
      invite_code_input: "ABC123",
    });
  });

  it("updates member role without allowing owner role", async () => {
    await updateHouseholdMemberRole(supabase, "member-1", "admin");

    expect(mockFrom).toHaveBeenCalledWith("household_members");
    expect(mockUpdate).toHaveBeenCalledWith({ role: "admin" });
    expect(mockEq).toHaveBeenCalledWith("id", "member-1");
  });

  it("rejects role update to owner from client service", async () => {
    await expect(
      updateHouseholdMemberRole(supabase, "member-1", "owner" as any),
    ).rejects.toThrow("Owner transfer is not supported from this action");
  });

  it("removes member by marking status removed", async () => {
    await removeHouseholdMember(supabase, "member-1");

    expect(mockUpdate).toHaveBeenCalledWith({ status: "removed" });
    expect(mockEq).toHaveBeenCalledWith("id", "member-1");
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/services/households.test.ts --silent
```

Expected: FAIL because `households.ts` does not exist.

- [ ] **Step 3: Implement household service**

Create `apps/mobile/src/services/households.ts`:

```ts
export type HouseholdRole = "owner" | "admin" | "member" | "viewer";

export type Household = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: "active" | "invited" | "removed";
  joined_at: string;
  households?: Household;
};

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createHousehold(
  supabase: any,
  input: { name: string; ownerId: string },
) {
  const { data: household, error } = await supabase
    .from("households")
    .insert({
      name: input.name.trim(),
      owner_id: input.ownerId,
      invite_code: generateInviteCode(),
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: input.ownerId,
      role: "owner",
      status: "active",
    });

  if (memberError) throw memberError;
  return household as Household;
}

export async function listMyHouseholds(
  supabase: any,
  userId: string,
): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("*, households(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as HouseholdMember[];
}

export async function joinHouseholdByInviteCode(
  supabase: any,
  inviteCode: string,
) {
  const { data, error } = await supabase.rpc("join_household_by_invite_code", {
    invite_code_input: inviteCode.trim().toUpperCase(),
  });
  if (error) throw error;
  return data;
}

export async function listHouseholdMembers(
  supabase: any,
  householdId: string,
): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as HouseholdMember[];
}

export async function updateHouseholdMemberRole(
  supabase: any,
  memberId: string,
  role: Exclude<HouseholdRole, "owner">,
) {
  if (role === "owner")
    throw new Error("Owner transfer is not supported from this action");

  const { data, error } = await supabase
    .from("household_members")
    .update({ role })
    .eq("id", memberId)
    .select("*")
    .single();

  if (error) throw error;
  return data as HouseholdMember;
}

export async function removeHouseholdMember(supabase: any, memberId: string) {
  const { error } = await supabase
    .from("household_members")
    .update({ status: "removed" })
    .eq("id", memberId);

  if (error) throw error;
}

export async function leaveHousehold(supabase: any, memberId: string) {
  return removeHouseholdMember(supabase, memberId);
}
```

- [ ] **Step 4: Add RPC migration for join-by-code**

Append to `supabase/migrations/202605210001_household_finance_context.sql`:

```sql
create or replace function public.join_household_by_invite_code(invite_code_input text)
returns table(household_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  select h.id into target_household_id
  from public.households h
  where h.invite_code = upper(trim(invite_code_input));

  if target_household_id is null then
    raise exception 'Invite code not found';
  end if;

  insert into public.household_members (household_id, user_id, role, status)
  values (target_household_id, auth.uid(), 'member', 'active')
  on conflict (household_id, user_id)
  do update set status = 'active', role = 'member', updated_at = timezone('utc'::text, now());

  return query select target_household_id;
end;
$$;
```

- [ ] **Step 5: Run tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/services/households.test.ts --silent
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/services/households.ts apps/mobile/src/services/households.test.ts supabase/migrations/202605210001_household_finance_context.sql
git commit -m "feat(mobile): add household service"
```

---

## Task 4: Finance Context Provider

**Files:**

- Create: `apps/mobile/src/state/finance-context.tsx`
- Create: `apps/mobile/src/state/finance-context.test.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Write failing provider tests**

Create `apps/mobile/src/state/finance-context.test.tsx`:

```tsx
import React from "react";
import { Text, Pressable } from "react-native";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";

import { FinanceContextProvider, useFinanceContext } from "./finance-context";

const memberships = [
  {
    id: "m1",
    household_id: "hh-1",
    role: "admin",
    status: "active",
    households: {
      id: "hh-1",
      name: "Keluarga Budi",
      invite_code: "ABC123",
      owner_id: "user-1",
      created_at: "",
      updated_at: "",
    },
  },
];

function Harness() {
  const {
    activeContext,
    memberships,
    setActiveHousehold,
    setPersonalContext,
    canCreate,
  } = useFinanceContext();
  return (
    <>
      <Text testID="context-type">{activeContext.type}</Text>
      <Text testID="membership-count">{memberships.length}</Text>
      <Text testID="can-create">{canCreate ? "yes" : "no"}</Text>
      <Pressable
        testID="set-household"
        onPress={() => setActiveHousehold("hh-1")}
      >
        <Text>Household</Text>
      </Pressable>
      <Pressable testID="set-personal" onPress={setPersonalContext}>
        <Text>Personal</Text>
      </Pressable>
    </>
  );
}

describe("FinanceContextProvider", () => {
  it("loads memberships and switches contexts", async () => {
    render(
      <FinanceContextProvider loadMemberships={async () => memberships as any}>
        <Harness />
      </FinanceContextProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("membership-count").props.children).toBe(1),
    );
    expect(screen.getByTestId("context-type").props.children).toBe("personal");

    fireEvent.press(screen.getByTestId("set-household"));
    expect(screen.getByTestId("context-type").props.children).toBe("household");

    fireEvent.press(screen.getByTestId("set-personal"));
    expect(screen.getByTestId("context-type").props.children).toBe("personal");
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/state/finance-context.test.tsx --silent
```

Expected: FAIL because provider does not exist.

- [ ] **Step 3: Implement provider**

Create `apps/mobile/src/state/finance-context.tsx` with:

```tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSupabase } from "../lib/supabase";
import { getCurrentUserId } from "../services/currentUser";
import {
  canCreateInContext,
  type FinanceContext,
} from "../services/finance-context-query";
import { listMyHouseholds, type HouseholdMember } from "../services/households";

type FinanceContextValue = {
  activeContext: FinanceContext;
  memberships: HouseholdMember[];
  loading: boolean;
  canCreate: boolean;
  refreshMemberships: () => Promise<void>;
  setPersonalContext: () => void;
  setActiveHousehold: (householdId: string) => void;
};

const Context = createContext<FinanceContextValue | null>(null);

export function FinanceContextProvider({
  children,
  loadMemberships,
}: {
  children: React.ReactNode;
  loadMemberships?: () => Promise<HouseholdMember[]>;
}) {
  const { supabase } = useSupabase();
  const [activeContext, setActiveContext] = useState<FinanceContext>({
    type: "personal",
  });
  const [memberships, setMemberships] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const rows = loadMemberships
        ? await loadMemberships()
        : await listMyHouseholds(supabase, await getCurrentUserId());
      setMemberships(rows);
      if (
        activeContext.type === "household" &&
        !rows.some((row) => row.household_id === activeContext.householdId)
      ) {
        setActiveContext({ type: "personal" });
      }
    } finally {
      setLoading(false);
    }
  }, [activeContext, loadMemberships, supabase]);

  useEffect(() => {
    refreshMemberships();
  }, []);

  const setActiveHousehold = useCallback(
    (householdId: string) => {
      const membership = memberships.find(
        (row) => row.household_id === householdId,
      );
      if (!membership) return;
      setActiveContext({
        type: "household",
        householdId,
        role: membership.role,
      });
    },
    [memberships],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      activeContext,
      memberships,
      loading,
      canCreate: canCreateInContext(activeContext),
      refreshMemberships,
      setPersonalContext: () => setActiveContext({ type: "personal" }),
      setActiveHousehold,
    }),
    [
      activeContext,
      loading,
      memberships,
      refreshMemberships,
      setActiveHousehold,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFinanceContext() {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      "useFinanceContext must be used within FinanceContextProvider",
    );
  return value;
}
```

- [ ] **Step 4: Wrap app layout**

Modify `apps/mobile/app/_layout.tsx` so `FinanceContextProvider` wraps the tab app inside existing providers:

```tsx
import { FinanceContextProvider } from "../src/state/finance-context";
```

Then nest:

```tsx
<FinanceContextProvider>
  {/* existing Slot/Stack content */}
</FinanceContextProvider>
```

- [ ] **Step 5: Run tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/state/finance-context.test.tsx --silent
corepack pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/state/finance-context.tsx apps/mobile/src/state/finance-context.test.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add finance context provider"
```

---

## Task 5: Context-Aware Transactions and Wallets First Slice

**Files:**

- Modify: `apps/mobile/src/services/transactions.ts`
- Modify: `apps/mobile/src/services/transactions.test.ts`
- Modify: `apps/mobile/src/services/wallets.ts`
- Modify: `apps/mobile/src/services/wallets.test.ts`

- [ ] **Step 1: Add failing transaction tests**

In `apps/mobile/src/services/transactions.test.ts`, add tests asserting:

```ts
it("lists personal transactions with household_id is null", async () => {
  await listTransactions(undefined, { type: "personal" });
  expect(mockIs).toHaveBeenCalledWith("household_id", null);
});

it("lists household transactions by household_id", async () => {
  await listTransactions(undefined, {
    type: "household",
    householdId: "hh-1",
    role: "member",
  });
  expect(mockEq).toHaveBeenCalledWith("household_id", "hh-1");
});

it("creates household transaction with audit fields", async () => {
  await createTransaction(
    {
      transaction_type: "expense",
      amount: 10000,
      category: "Makan",
      description: "Bakso",
    },
    { type: "household", householdId: "hh-1", role: "member" },
  );
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      household_id: "hh-1",
      created_by: "user-1",
      updated_by: "user-1",
    }),
  );
});
```

- [ ] **Step 2: Add failing wallet tests**

In `apps/mobile/src/services/wallets.test.ts`, add tests asserting:

```ts
it("lists personal wallets with household_id is null", async () => {
  await listWallets({ type: "personal" });
  expect(mockIs).toHaveBeenCalledWith("household_id", null);
});

it("creates household wallet with audit fields", async () => {
  await createWallet(
    { name: "Kas Rumah", type: "cash" },
    { type: "household", householdId: "hh-1", role: "admin" },
  );
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      household_id: "hh-1",
      created_by: "user-1",
      updated_by: "user-1",
    }),
  );
});
```

- [ ] **Step 3: Run failing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/services/transactions.test.ts src/services/wallets.test.ts --silent
```

Expected: FAIL because service signatures do not accept context and do not apply filters.

- [ ] **Step 4: Update service signatures**

In `transactions.ts`:

```ts
import {
  applyFinanceContextFilter,
  buildFinanceInsertAudit,
  buildFinanceUpdateAudit,
  canCreateInContext,
  type FinanceContext,
} from "./finance-context-query";

const defaultContext: FinanceContext = { type: "personal" };

export async function createTransaction(
  tx: TransactionCreate,
  context: FinanceContext = defaultContext,
): Promise<Transaction> {
  if (!canCreateInContext(context)) throw new Error("Akses lihat saja");
  const userId = await getCurrentUserId();
  const payload = {
    ...buildInsertPayload(tx, userId),
    ...buildFinanceInsertAudit(context, userId),
  };
  // existing insert uses payload
}

export async function listTransactions(
  filters?: Filters,
  context: FinanceContext = defaultContext,
): Promise<Transaction[]> {
  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });
  query = applyFinanceContextFilter(query, context) as typeof query;
  // existing filters remain
}

export async function updateTransaction(
  id: string,
  updates: Partial<TransactionCreate>,
  context: FinanceContext = defaultContext,
): Promise<Transaction> {
  const userId = await getCurrentUserId();
  const payload = { ...updates, ...buildFinanceUpdateAudit(userId) };
  // existing update uses payload
}
```

In `wallets.ts`, mirror the same context default, filter, audit fields, and viewer create rejection.

- [ ] **Step 5: Run passing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/services/transactions.test.ts src/services/wallets.test.ts --silent
corepack pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/services/transactions.ts apps/mobile/src/services/transactions.test.ts apps/mobile/src/services/wallets.ts apps/mobile/src/services/wallets.test.ts
git commit -m "feat(mobile): scope transactions and wallets by finance context"
```

---

## Task 6: Context Switcher UI

**Files:**

- Create: `apps/mobile/src/components/FinanceContextSwitcher.tsx`
- Create: `apps/mobile/__tests__/family-context-switcher.test.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Write failing UI test**

Create `apps/mobile/__tests__/family-context-switcher.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

import { FinanceContextSwitcher } from "../src/components/FinanceContextSwitcher";

const mockSetPersonalContext = jest.fn();
const mockSetActiveHousehold = jest.fn();

jest.mock("../src/state/finance-context", () => ({
  useFinanceContext: () => ({
    activeContext: { type: "personal" },
    memberships: [
      {
        household_id: "hh-1",
        role: "admin",
        households: { name: "Keluarga Budi" },
      },
    ],
    setPersonalContext: mockSetPersonalContext,
    setActiveHousehold: mockSetActiveHousehold,
  }),
}));

describe("FinanceContextSwitcher", () => {
  it("shows personal and household choices", () => {
    render(<FinanceContextSwitcher />);

    expect(screen.getByText("Pribadi")).toBeTruthy();
    fireEvent.press(screen.getByTestId("finance-context-switcher"));
    expect(screen.getByText("Keluarga Budi")).toBeTruthy();
    fireEvent.press(screen.getByText("Keluarga Budi"));
    expect(mockSetActiveHousehold).toHaveBeenCalledWith("hh-1");
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd apps/mobile
corepack pnpm jest --runInBand __tests__/family-context-switcher.test.tsx --silent
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement component**

Create `apps/mobile/src/components/FinanceContextSwitcher.tsx` with a compact Pressable dropdown that uses `useFinanceContext()`, shows current label, and lists Personal plus household memberships.

Required testIDs:

```tsx
testID="finance-context-switcher"
testID="finance-context-option-personal"
testID={`finance-context-option-${membership.household_id}`}
```

- [ ] **Step 4: Add switcher to Home**

Modify `apps/mobile/app/(tabs)/index.tsx` to render `<FinanceContextSwitcher />` in the dashboard header action area or directly below the header if the current header component does not accept custom content.

- [ ] **Step 5: Run tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand __tests__/family-context-switcher.test.tsx __tests__/tabs-index.test.tsx --silent
corepack pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/FinanceContextSwitcher.tsx apps/mobile/__tests__/family-context-switcher.test.tsx apps/mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): add finance context switcher"
```

---

## Task 7: Family Center Screen

**Files:**

- Modify: `apps/mobile/app/(tabs)/groups.tsx`
- Create/Modify: `apps/mobile/__tests__/groups-family-center.test.tsx`

- [ ] **Step 1: Write failing screen tests**

Create `apps/mobile/__tests__/groups-family-center.test.tsx` with tests that mock `households.ts` and assert:

```tsx
it("renders family center copy and active household list", async () => {
  renderGroupsScreen();
  expect(await screen.findByText("Keluarga")).toBeTruthy();
  expect(screen.getByText("Keluarga Budi")).toBeTruthy();
  expect(screen.getByText("Admin")).toBeTruthy();
});

it("creates a household from the form", async () => {
  renderGroupsScreen();
  fireEvent.press(screen.getByText("Buat"));
  fireEvent.changeText(
    screen.getByPlaceholderText("Nama keluarga"),
    "Keluarga Budi",
  );
  fireEvent.press(screen.getByText("Simpan keluarga"));
  await waitFor(() =>
    expect(mockCreateHousehold).toHaveBeenCalledWith(expect.anything(), {
      name: "Keluarga Budi",
      ownerId: "user-1",
    }),
  );
});

it("joins household by invite code", async () => {
  renderGroupsScreen();
  fireEvent.press(screen.getByText("Gabung"));
  fireEvent.changeText(screen.getByPlaceholderText("Kode undangan"), "ABC123");
  fireEvent.press(screen.getByText("Gabung keluarga"));
  await waitFor(() =>
    expect(mockJoinHouseholdByInviteCode).toHaveBeenCalledWith(
      expect.anything(),
      "ABC123",
    ),
  );
});
```

- [ ] **Step 2: Run failing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand __tests__/groups-family-center.test.tsx --silent
```

Expected: FAIL because current Groups screen is static mock UI.

- [ ] **Step 3: Implement Family Center**

Replace static `groups` array in `apps/mobile/app/(tabs)/groups.tsx` with state loaded from `listMyHouseholds`. Add create and join inline cards. Preserve design-system components: `SectionHeader`, `Card`, `IconBubble`, existing radius and color tokens.

Required user-facing copy:

```txt
Keluarga
Pantau keuangan keluarga dari satu ruang bersama.
Buat
Gabung
Nama keluarga
Simpan keluarga
Kode undangan
Gabung keluarga
Anggota
Akses lihat saja
```

- [ ] **Step 4: Run tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand __tests__/groups-family-center.test.tsx --silent
corepack pnpm type-check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/'(tabs)'/groups.tsx apps/mobile/__tests__/groups-family-center.test.tsx
git commit -m "feat(mobile): build family center"
```

---

## Task 8: Expand Context to Budgets, Bills, Envelopes, and Reports

**Files:**

- Modify: `apps/mobile/src/services/budgets.ts`
- Modify: `apps/mobile/src/services/bills.ts`
- Modify: `apps/mobile/src/services/budget-envelopes.ts`
- Modify: `apps/mobile/app/(tabs)/budgets.tsx`
- Modify: `apps/mobile/app/(tabs)/bills.tsx`
- Modify: `apps/mobile/app/(tabs)/reports.tsx`
- Modify tests for these modules/screens.

- [ ] **Step 1: Add failing service tests**

For each service, add one personal filter and one household filter test:

```ts
await listBudgets(supabase, userId, { type: "personal" });
expect(mockIs).toHaveBeenCalledWith("household_id", null);

await listBudgets(supabase, userId, {
  type: "household",
  householdId: "hh-1",
  role: "admin",
});
expect(mockEq).toHaveBeenCalledWith("household_id", "hh-1");
```

Repeat with actual function signatures for bills and budget envelopes.

- [ ] **Step 2: Run failing tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/services/budgets.test.ts src/services/bills.test.ts src/services/budget-envelopes.test.ts --silent
```

Expected: FAIL until services apply finance context.

- [ ] **Step 3: Update services**

Import and use:

```ts
import {
  applyFinanceContextFilter,
  buildFinanceInsertAudit,
  buildFinanceUpdateAudit,
  canCreateInContext,
  type FinanceContext,
} from "./finance-context-query";
```

Every list function applies `applyFinanceContextFilter`. Every create function adds `buildFinanceInsertAudit`. Every update function adds `buildFinanceUpdateAudit`. Viewer creates throw `new Error('Akses lihat saja')`.

- [ ] **Step 4: Update screens**

Use `const { activeContext, canCreate } = useFinanceContext()` in Budgets, Bills, Reports, and any screen with mutation actions.

- Pass `activeContext` into service calls.
- Disable/hide create buttons when `!canCreate`.
- Show context badge using copy `Pribadi` or `Keluarga`.

- [ ] **Step 5: Run tests**

```bash
cd apps/mobile
corepack pnpm test -- --runInBand __tests__/reports-screen.test.tsx __tests__/budget-envelopes-screen.test.tsx __tests__/wallets-screen.test.tsx --silent
corepack pnpm jest --runInBand src/services/budgets.test.ts src/services/bills.test.ts src/services/budget-envelopes.test.ts --silent
corepack pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/services/budgets.ts apps/mobile/src/services/bills.ts apps/mobile/src/services/budget-envelopes.ts apps/mobile/app/'(tabs)'/budgets.tsx apps/mobile/app/'(tabs)'/bills.tsx apps/mobile/app/'(tabs)'/reports.tsx apps/mobile/src/services/*.test.ts apps/mobile/__tests__/*.test.tsx
git commit -m "feat(mobile): scope remaining finance screens by context"
```

---

## Task 9: Multi-Device Freshness

**Files:**

- Modify: `apps/mobile/src/hooks/useTransactionRealtime.ts`
- Modify: screens that already load financial data.

- [ ] **Step 1: Add or update realtime test seam**

If `useTransactionRealtime.ts` has tests, add a test that subscribes to a context-specific channel name:

```ts
expect(channelName).toBe("transactions:household:hh-1");
```

If no hook test exists, add a small pure helper in the hook file:

```ts
export function transactionChannelName(context: FinanceContext) {
  return context.type === "household"
    ? `transactions:household:${context.householdId}`
    : "transactions:personal";
}
```

and test that helper.

- [ ] **Step 2: Implement context-aware realtime/refetch**

Use active context in realtime subscriptions:

- Personal: filter `household_id=is.null` where Supabase realtime filter supports it, or subscribe then refetch on event.
- Household: filter `household_id=eq.${householdId}`.
- On context switch, unsubscribe previous channel and refetch.

- [ ] **Step 3: Run tests**

```bash
cd apps/mobile
corepack pnpm jest --runInBand src/hooks/useTransactionRealtime.test.ts --silent
corepack pnpm type-check
```

Expected: PASS. If there is no hook test file yet, run the new helper test file created in Step 1.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useTransactionRealtime.ts apps/mobile/src/hooks/*.test.ts
git commit -m "feat(mobile): refresh finance data across devices"
```

---

## Task 10: Final Verification and Documentation

**Files:**

- Modify: `CLAUDE.md`
- Modify or create: `docs/AI_HANDOFF_FAMILY_FINANCE_2026-05-21.md`

- [ ] **Step 1: Update project context docs**

Add a section to `CLAUDE.md` under Active Stack data architecture:

```md
### Household finance context

Mobile supports two finance contexts: personal rows with `household_id = null`, and household rows with `household_id` set. Household access is controlled by `households`, `household_members`, and RLS roles `owner/admin/member/viewer`. Mobile service functions must apply the active finance context to every financial query.
```

- [ ] **Step 2: Write handoff doc**

Create `docs/AI_HANDOFF_FAMILY_FINANCE_2026-05-21.md` summarizing:

- schema migration name
- new service files
- active context provider
- screens changed
- verification commands and outputs
- known follow-up items: invite links, ownership transfer UI, bulk move personal data to household

- [ ] **Step 3: Run complete verification**

```bash
cd apps/mobile
corepack pnpm test -- --runInBand --silent
corepack pnpm type-check
```

Expected: all mobile tests pass and TypeScript emits no errors.

If Supabase local is configured:

```bash
cd ../..
supabase db reset
```

Expected: database reset completes with all migrations applied.

- [ ] **Step 4: Commit docs**

```bash
git add CLAUDE.md docs/AI_HANDOFF_FAMILY_FINANCE_2026-05-21.md
git commit -m "docs: document household finance context"
```

---

## Self-Review Notes

Spec coverage:

- Multi-device session support: Task 9.
- Household schema and RLS: Task 1.
- Household service: Task 3.
- Finance context provider: Task 4.
- Context switcher UX: Task 6.
- Family Center: Task 7.
- Context-aware financial data: Tasks 5 and 8.
- Testing and verification: every task plus Task 10.

Implementation order is intentionally vertical. Stop after Task 7 if a smaller MVP is needed: users will be able to create/join households and switch context, with transactions/wallets scoped first. Continue Tasks 8-10 for full feature coverage.
