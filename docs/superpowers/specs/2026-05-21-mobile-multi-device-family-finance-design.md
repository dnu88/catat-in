# Mobile Multi-Device Family Finance Design

## Goal

Enable Kaswise mobile users to use one account across multiple devices and monitor family finances through a shared household space. The mobile app remains the primary client. Web remains maintenance-only and is out of scope unless requested later.

## Product Direction

Kaswise will support two finance contexts:

1. **Pribadi / Personal**: existing behavior. Financial data belongs only to the signed-in user.
2. **Keluarga / Household**: shared family finance space. Financial data belongs to an active household and is visible or mutable according to membership role.

Personal data is never automatically shared into a household. Users must create data while the active context is Household, or later use an explicit move/share flow in a future iteration.

## Scope

### In Scope

- Multi-device support for the same Supabase Auth account.
- Household creation and joining from mobile.
- Household roles: `owner`, `admin`, `member`, `viewer`.
- Active finance context switcher in mobile.
- Household-scoped transactions, wallets, budgets, bills, budget envelopes, and reports.
- Supabase schema and RLS changes required for safe household access.
- Mobile service-layer changes so all reads/writes are context-aware.
- Tests for context filtering and role permissions.

### Out of Scope

- Changes to `apps/web`.
- Child-specific parental controls.
- Approval workflows for member transactions.
- Moving existing personal data into a household in bulk.
- Backend-mediated household writes unless a later security review requires it.

## Users and Roles

### Owner

- Created the household or received ownership transfer.
- Can manage all household data.
- Can invite, remove, and change roles for members.
- Can delete the household or transfer ownership.

### Admin

- Can manage household data.
- Can invite members and manage non-owner roles.
- Cannot delete the household or transfer ownership.

### Member

- Can view household data.
- Can create household transactions.
- Can edit/delete household rows they created.
- Cannot manage members.

### Viewer

- Read-only household access.
- Can view dashboard, reports, wallets, budgets, bills, and transactions.
- Cannot create, update, or delete household data.

## Data Model

Use `household` as the database term. UI copy can still use `Keluarga`.

### New Tables

#### `households`

- `id uuid primary key`
- `name text not null`
- `owner_id uuid not null references auth.users(id)`
- `invite_code text not null unique`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `household_members`

- `id uuid primary key`
- `household_id uuid not null references public.households(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null check (role in ('owner', 'admin', 'member', 'viewer'))`
- `status text not null default 'active' check (status in ('active', 'invited', 'removed'))`
- `joined_at timestamptz default now()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique active membership per `(household_id, user_id)`.

### Existing Financial Tables

Add nullable household ownership fields to household-capable tables:

- `transactions`
- `wallets`
- `budgets`
- `bill_reminders`
- `budget_envelopes`
- `transaction_envelope_allocations` where needed through parent relations

Columns:

- `household_id uuid null references public.households(id) on delete cascade`
- `created_by uuid null references auth.users(id)`
- `updated_by uuid null references auth.users(id)`

Semantics:

- `household_id is null`: personal row.
- `household_id is not null`: household row.
- Personal rows keep existing `user_id = auth.uid()` ownership rules.
- Household rows use `household_id` plus membership role for access.

## RLS and Permissions

### Read Rules

- Personal row: only owner user can read.
- Household row: active household members can read.

### Insert Rules

- Personal row: `user_id = auth.uid()` and `household_id is null`.
- Household row:
  - `owner`, `admin`, `member` can insert.
  - `viewer` cannot insert.
  - `created_by` must equal `auth.uid()`.
  - User must be an active member of the target household.

### Update Rules

- Personal row: existing owner-only behavior.
- Household row:
  - `owner`, `admin` can update all household rows.
  - `member` can update rows where `created_by = auth.uid()`.
  - `viewer` cannot update.
  - `updated_by` should be set to `auth.uid()`.

### Delete Rules

- Personal row: existing owner-only behavior.
- Household row:
  - `owner`, `admin` can delete all household rows.
  - `member` can delete rows where `created_by = auth.uid()`.
  - `viewer` cannot delete.

### Member Management Rules

- Owner can manage all members and transfer ownership.
- Admin can invite/remove/change non-owner members, but cannot modify owner.
- Member and Viewer can leave household by removing/deactivating their own membership.
- No user can self-escalate role through client writes.

## Mobile UX

### Finance Context Switcher

Add a compact context switcher in the Home/Dashboard header:

- Default: `Pribadi`.
- If user belongs to one or more households: show `Keluarga: <name>` options.
- Persist last selected context on device.
- If selected household membership becomes inactive, fall back to `Pribadi`.

### Groups Tab Becomes Family Center

Use the existing Groups area as the family management surface:

- Create household.
- Join household by invite code.
- View household members.
- Copy invite code.
- Update member role where allowed.
- Remove member where allowed.
- Leave household.

### Data Screens

Transactions, wallets, budgets, bills, budget envelopes, and reports follow the active context.

- Personal context shows personal rows only.
- Household context shows rows for the active household only.
- Each screen shows a subtle context badge: `Pribadi` or `Keluarga`.
- Empty household states guide users to add data or invite members.

### Role Restrictions

For Viewer:

- Hide or disable mutation CTAs.
- Show copy: `Akses lihat saja`.
- RLS remains the source of truth. UI restrictions are only UX.

For Member:

- Allow add transaction.
- Limit edit/delete affordances to rows created by the signed-in user.

## Mobile Technical Design

### Finance Context State

Add a small global state module:

```ts
type FinanceContext =
  | { type: "personal" }
  | {
      type: "household";
      householdId: string;
      role: "owner" | "admin" | "member" | "viewer";
    };
```

Responsibilities:

- Load available households after sign-in.
- Persist active context locally.
- Provide helpers: `canCreate`, `canEdit(row)`, `canDelete(row)`, `isReadOnly`.

### Service Layer

Every financial service must accept or derive the active finance context:

- `transactions.ts`
- `wallets.ts`
- `budgets.ts`
- `bills.ts`
- `budget-envelopes.ts`
- report builders in screens/services

Required behavior:

- Personal list query filters `household_id is null` and current user ownership.
- Household list query filters `household_id = active household id`.
- Household create sets `household_id`, `created_by`, and user audit fields.
- Mutation functions reject client-side if role is not allowed, then rely on RLS for enforcement.

### Household Service

Create `apps/mobile/src/services/households.ts`:

- `listMyHouseholds(supabase, userId)`
- `createHousehold(supabase, input)`
- `joinHouseholdByInviteCode(supabase, inviteCode)`
- `listHouseholdMembers(supabase, householdId)`
- `updateHouseholdMemberRole(supabase, householdId, memberId, role)`
- `removeHouseholdMember(supabase, householdId, memberId)`
- `leaveHousehold(supabase, householdId)`

### Multi-Device Sync

Supabase Auth already supports multiple sessions. Add data freshness behavior:

- Refetch active screen on app focus.
- Use Supabase realtime subscriptions for high-value tables where already practical, especially transactions and wallets.
- Ensure service functions do not rely only on local state after mutations.

## Testing Strategy

### SQL/RLS Tests

Cover permission matrix:

- Non-member cannot read household data.
- Viewer can read but cannot insert/update/delete.
- Member can insert and mutate own rows only.
- Admin can mutate household rows but cannot modify owner.
- Owner can manage all household resources.
- Personal rows remain private.

### Mobile Service Tests

- Personal context filters household rows out.
- Household context filters personal rows out.
- Household create includes `household_id` and `created_by`.
- Viewer mutations are rejected before network request where possible.

### Mobile Screen Tests

- Context switcher appears for users with households.
- Groups tab supports create/join/member list states.
- Viewer does not see mutation CTAs.
- Member sees edit/delete only on own rows.
- Empty household state shows add/invite actions.

## Migration and Rollout

1. Add schema and RLS migration.
2. Backfill existing rows with `household_id = null` and `created_by = user_id` where applicable.
3. Add household service and tests.
4. Add finance context state and context switcher.
5. Update one financial vertical first, recommended transactions, to validate model.
6. Expand to wallets, budgets, bills, budget envelopes, and reports.
7. Add realtime/refetch polish.

## Risks

- Query missing context filter could mix personal and household data.
- RLS policy mistakes could expose household or personal rows.
- Wallet balance calculations could mix contexts.
- Role UI may drift from RLS rules.
- Realtime subscriptions may show stale data if context changes quickly.

## Mitigations

- Centralize finance context query helpers.
- Add RLS permission matrix tests before UI rollout.
- Add indexes on `household_id`, `(household_id, created_at)`, and `(household_id, tanggal)`.
- Keep UI role checks generated from the same role helper semantics used by services.
- On context switch, unsubscribe/refetch explicitly.

## Open Decisions for Implementation Plan

- Whether to name UI copy `Keluarga` everywhere or expose `Rumah Tangga` in settings.
- Whether household invite code is enough for MVP or invite links are required.
- Whether Admin can remove other Admins in MVP. Recommended: yes, except owner.
- Whether bills are included in first implementation slice or follow after transactions/wallets/budgets.
