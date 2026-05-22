# AI Handoff — Household Finance Context (2026-05-21)

## Summary

Implemented mobile-first household finance support alongside existing personal finance rows. The app now scopes financial data by an active finance context:

- Personal: `household_id = null`
- Household: `household_id = <active household id>`

Household access is enforced by Supabase RLS roles: `owner`, `admin`, `member`, and `viewer`.

## Schema migration

- `supabase/migrations/202605210001_household_finance_context.sql`
  - Adds `households` and `household_members`.
  - Adds `household_id`, `created_by`, and/or `updated_by` audit/scope columns to financial tables.
  - Adds helper functions for household membership and role checks.
  - Adds personal-or-household RLS policies for financial tables.
  - Adds `join_household_by_invite_code` RPC.

## Service files

New household/context services:

- `apps/mobile/src/services/households.ts`
- `apps/mobile/src/services/finance-context-query.ts`

Context-aware financial services updated:

- `apps/mobile/src/services/transactions.ts`
- `apps/mobile/src/services/wallets.ts`
- `apps/mobile/src/services/budgets.ts`
- `apps/mobile/src/services/bills.ts`
- `apps/mobile/src/services/budget-envelopes.ts`

## Provider and UI

- `apps/mobile/src/state/finance-context.tsx` provides the active personal/household context and permission helpers.
- `apps/mobile/src/components/FinanceContextSwitcher.tsx` provides the mobile context switcher.
- `apps/mobile/app/_layout.tsx` wraps the app in `FinanceContextProvider`.

## Screens changed

- `apps/mobile/app/(tabs)/index.tsx` — dashboard context switcher/badge.
- `apps/mobile/app/(tabs)/groups.tsx` — Family Center for create/join/list household flows.
- `apps/mobile/app/(tabs)/transactions.tsx` — context-aware transaction reads/writes.
- `apps/mobile/app/(tabs)/transaction-new.tsx` — creates transactions in the active context.
- `apps/mobile/app/(tabs)/wallets.tsx` — context-aware wallets and role gates.
- `apps/mobile/app/(tabs)/budgets.tsx` — context-aware budgets and role gates.
- `apps/mobile/app/(tabs)/bills.tsx` — context-aware bills and role gates.
- `apps/mobile/app/(tabs)/reports.tsx` — report data filtered by active context.
- `apps/mobile/app/(tabs)/capture.tsx` — envelope suggestion flow aligned with active context.

## Multi-device freshness

- `apps/mobile/src/hooks/useTransactionRealtime.ts` now uses context-specific realtime channel names and refetch behavior for personal vs household data.

## Verification

From repository root:

```bash
corepack pnpm --filter mobile test -- --runInBand --silent
```

Output summary:

```txt
Test Suites: 28 passed, 28 total
Tests:       155 passed, 155 total
Snapshots:   0 total
Time:        48.326 s
```

```bash
corepack pnpm --filter mobile type-check
```

Output summary:

```txt
> mobile@0.1.0 type-check .../apps/mobile
> tsc --noEmit
```

Exit code: 0.

Supabase CLI check:

```bash
command -v supabase && supabase --version
```

Output: no executable found; Supabase CLI unavailable in this environment, so `supabase db reset` was not run.

## Known follow-ups

- Invite links/deep links for household invite codes.
- Ownership transfer UI and safe owner handoff policy.
- Bulk move/copy personal rows into a household context.
