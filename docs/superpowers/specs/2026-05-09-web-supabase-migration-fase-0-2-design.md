# Web Supabase Migration Fase 0–2 Design Spec

**Date:** 2026-05-09  
**Status:** Draft  
**Owner:** ThinkPad  
**Related:** PLAN-003-web-supabase-migration.md, docs/prd/PRD_Kaswise_v1.md

## Executive Summary

This spec defines the detailed design for executing **Fase 0–2** of the `apps/web` migration from Firebase/Firestore to Supabase, following a strict phase-gate approach. The goal is to establish a solid foundation (baseline documentation, Supabase client setup, and repository abstraction) without breaking existing Firebase-based functionality.

**Scope:** Fase 0 (Baseline & Freeze), Fase 1 (Foundation Supabase), Fase 2 (Repository Abstraction).  
**Out of scope:** Auth cutover, read/write path migration, AI integration, UI redesign (covered in later phases).

## Design Principles

1. **No big-bang rewrite:** Migrate incrementally with strict gate verification at each phase.
2. **Rollback-ready:** Provider can be switched via env flag during transition.
3. **UI modernization deferred:** Focus on data/auth/infrastructure only; UI redesign happens after Fase 3+.

## Current State Analysis

### Existing Stack (apps/web)
- **Frontend:** React 18 + Vite + TypeScript + Zustand + Tailwind CSS
- **Backend:** Firebase Auth + Cloud Firestore
- **Data layer:** Direct Firestore calls in `apps/web/src/lib/firestore.ts`
- **State:** Zustand stores (`transaction.store.ts`, `budget.store.ts`, `wallet.store.ts`, `bills.store.ts`, `category.store.ts`, `auth.store.ts`)
- **Tests:** 8 passing tests (3 test files: `web-theme.test.ts`, `firestore.logic.test.ts`, `App.test.tsx`)

### Target State (Supabase)
- **Schema:** Already exists in `supabase/migrations/202605060001_kaswise_base_schema.sql`
  - Tables: profiles, wallets, transactions, categories, budgets, bill_reminders, groups, group_members, monthly_summaries, usage_counters
  - RLS enabled with user-scoped policies
  - Triggers for `updated_at` timestamps
  - Indexes for performance
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Storage:** Supabase Storage buckets for receipts and voice inputs

## Approach Selection

**Selected Approach:** Vertical by phase, strict gate

Execute phases in exact order (Fase 0 → Fase 1 → Fase 2), with each phase requiring gate verification before proceeding.

**Why this approach:**
- Safest migration path with clear rollback points
- Easy to audit progress and verify stability
- Aligns with "no big-bang rewrite" principle
- Minimizes risk of mismatch between provider implementations

**Trade-offs:**
- Slower initial delivery due to upfront documentation and abstraction work
- More ceremony around gate verification
- Acceptable given this is a maintenance-only legacy app with no time pressure

## Architecture Design

### Phase 0: Baseline & Freeze

**Goal:** Document current critical flows and create smoke test checklist as baseline for before/after comparison.

**Deliverable:** Single document `docs/baseline-smoke-checklist.md` containing:
1. **Critical flows:**
   - Login/logout
   - Create/edit/delete transaction
   - Wallet balance updates
   - Budget tracking (spent_amount calculation)
   - Bill reminders
   - Monthly reports
2. **Smoke checklist:** Step-by-step manual test cases for each flow

**Gate criteria:**
- Baseline document exists and is repeatable
- All 8 existing tests pass (`pnpm --filter @kaswise/web test`)

### Phase 1: Foundation Supabase

**Goal:** Add Supabase client infrastructure and provider switch mechanism without cutover.

**File structure:**
```
apps/web/src/
├── lib/
│   ├── supabase.ts          # NEW: Supabase client initialization
│   ├── data-provider.ts     # NEW: Provider selection logic
│   ├── firebase.ts          # EXISTING: Firebase Auth
│   ├── firebase-db.ts       # EXISTING: Firestore DB
│   └── firestore.ts         # EXISTING: Firestore operations
└── types/
    └── database.types.ts    # EXISTING: Supabase types (already present)
```

**New files:**

1. **`apps/web/src/lib/supabase.ts`**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from '../types/database.types'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing Supabase environment variables')
   }

   export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
   ```

2. **`apps/web/src/lib/data-provider.ts`**
   ```typescript
   export type DataProvider = 'firebase' | 'supabase'

   export const currentProvider: DataProvider = 
     (import.meta.env.VITE_DATA_PROVIDER as DataProvider) || 'firebase'

   export function isFirebaseProvider(): boolean {
     return currentProvider === 'firebase'
   }

   export function isSupabaseProvider(): boolean {
     return currentProvider === 'supabase'
   }
   ```

**Environment variables (apps/web/.env.local):**
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-publishable-or-anon-key>

# Data provider (firebase | supabase)
VITE_DATA_PROVIDER=firebase
```

**Dependencies to add:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.43.0"
  }
}
```

**Gate criteria:**
- `pnpm --filter @kaswise/web type-check` passes
- `pnpm --filter @kaswise/web test` passes (all 8 tests)
- `pnpm --filter @kaswise/web build` succeeds
- App runs normally in mode `firebase` (default)
- No runtime errors when Supabase client is initialized (even though not used yet)

### Phase 2: Repository Abstraction

**Goal:** Create repository interface per domain, implement Firebase adapter (wrapping existing behavior), and prepare Supabase stub. Stores consume repository interface instead of direct `firestore.ts`.

**File structure:**
```
apps/web/src/
├── repositories/
│   ├── contracts/
│   │   ├── auth.repository.ts           # NEW: Auth interface
│   │   ├── transactions.repository.ts   # NEW: Transactions interface
│   │   ├── wallets.repository.ts        # NEW: Wallets interface
│   │   ├── budgets.repository.ts        # NEW: Budgets interface
│   │   ├── bills.repository.ts          # NEW: Bills interface
│   │   └── reports.repository.ts        # NEW: Reports interface
│   ├── firebase/
│   │   ├── auth.firebase.ts             # NEW: Firebase auth adapter
│   │   ├── transactions.firebase.ts     # NEW: Firebase transactions adapter
│   │   ├── wallets.firebase.ts          # NEW: Firebase wallets adapter
│   │   ├── budgets.firebase.ts          # NEW: Firebase budgets adapter
│   │   ├── bills.firebase.ts            # NEW: Firebase bills adapter
│   │   └── reports.firebase.ts          # NEW: Firebase reports adapter
│   ├── supabase/
│   │   ├── auth.supabase.ts             # NEW: Supabase auth stub
│   │   ├── transactions.supabase.ts     # NEW: Supabase transactions stub
│   │   ├── wallets.supabase.ts          # NEW: Supabase wallets stub
│   │   ├── budgets.supabase.ts          # NEW: Supabase budgets stub
│   │   ├── bills.supabase.ts            # NEW: Supabase bills stub
│   │   └── reports.supabase.ts          # NEW: Supabase reports stub
│   └── index.ts                         # NEW: Repository factory
└── store/
    ├── auth.store.ts                    # MODIFIED: Use auth repository
    ├── transaction.store.ts             # MODIFIED: Use transactions repository
    ├── wallet.store.ts                  # MODIFIED: Use wallets repository
    ├── budget.store.ts                  # MODIFIED: Use budgets repository
    └── bills.store.ts                   # MODIFIED: Use bills repository
```

**Repository interface pattern (example: transactions):**

```typescript
// apps/web/src/repositories/contracts/transactions.repository.ts
import type { Transaction, TransactionFormData, TransactionFilters } from '@kaswise/shared/types'

export interface TransactionsRepository {
  list(filters: TransactionFilters): Promise<{ data: Transaction[]; total: number }>
  getById(id: string): Promise<Transaction | null>
  create(data: TransactionFormData): Promise<Transaction>
  update(id: string, data: Partial<TransactionFormData>): Promise<void>
  delete(id: string): Promise<void>
}
```

**Firebase adapter pattern (example: transactions):**

```typescript
// apps/web/src/repositories/firebase/transactions.firebase.ts
import type { TransactionsRepository } from '../contracts/transactions.repository'
import { listTransactions, getTransaction, createTransaction, patchTransaction, removeTransaction } from '../../lib/firestore'

export class FirebaseTransactionsRepository implements TransactionsRepository {
  async list(filters: TransactionFilters) {
    return listTransactions(filters)
  }

  async getById(id: string) {
    return getTransaction(id)
  }

  async create(data: TransactionFormData) {
    return createTransaction(data)
  }

  async update(id: string, data: Partial<TransactionFormData>) {
    return patchTransaction(id, data)
  }

  async delete(id: string) {
    return removeTransaction(id)
  }
}
```

**Supabase stub pattern (example: transactions):**

```typescript
// apps/web/src/repositories/supabase/transactions.supabase.ts
import type { TransactionsRepository } from '../contracts/transactions.repository'

export class SupabaseTransactionsRepository implements TransactionsRepository {
  async list(filters: TransactionFilters) {
    throw new Error('Supabase transactions.list not implemented yet')
  }

  async getById(id: string) {
    throw new Error('Supabase transactions.getById not implemented yet')
  }

  async create(data: TransactionFormData) {
    throw new Error('Supabase transactions.create not implemented yet')
  }

  async update(id: string, data: Partial<TransactionFormData>) {
    throw new Error('Supabase transactions.update not implemented yet')
  }

  async delete(id: string) {
    throw new Error('Supabase transactions.delete not implemented yet')
  }
}
```

**Repository factory:**

```typescript
// apps/web/src/repositories/index.ts
import { currentProvider } from '../lib/data-provider'
import type { AuthRepository } from './contracts/auth.repository'
import type { TransactionsRepository } from './contracts/transactions.repository'
import type { WalletsRepository } from './contracts/wallets.repository'
import type { BudgetsRepository } from './contracts/budgets.repository'
import type { BillsRepository } from './contracts/bills.repository'
import type { ReportsRepository } from './contracts/reports.repository'

import { FirebaseAuthRepository } from './firebase/auth.firebase'
import { FirebaseTransactionsRepository } from './firebase/transactions.firebase'
import { FirebaseWalletsRepository } from './firebase/wallets.firebase'
import { FirebaseBudgetsRepository } from './firebase/budgets.firebase'
import { FirebaseBillsRepository } from './firebase/bills.firebase'
import { FirebaseReportsRepository } from './firebase/reports.firebase'

import { SupabaseAuthRepository } from './supabase/auth.supabase'
import { SupabaseTransactionsRepository } from './supabase/transactions.supabase'
import { SupabaseWalletsRepository } from './supabase/wallets.supabase'
import { SupabaseBudgetsRepository } from './supabase/budgets.supabase'
import { SupabaseBillsRepository } from './supabase/bills.supabase'
import { SupabaseReportsRepository } from './supabase/reports.supabase'

export interface Repositories {
  auth: AuthRepository
  transactions: TransactionsRepository
  wallets: WalletsRepository
  budgets: BudgetsRepository
  bills: BillsRepository
  reports: ReportsRepository
}

export function getRepositories(): Repositories {
  if (currentProvider === 'supabase') {
    return {
      auth: new SupabaseAuthRepository(),
      transactions: new SupabaseTransactionsRepository(),
      wallets: new SupabaseWalletsRepository(),
      budgets: new SupabaseBudgetsRepository(),
      bills: new SupabaseBillsRepository(),
      reports: new SupabaseReportsRepository(),
    }
  }

  // Default: firebase
  return {
    auth: new FirebaseAuthRepository(),
    transactions: new FirebaseTransactionsRepository(),
    wallets: new FirebaseWalletsRepository(),
    budgets: new FirebaseBudgetsRepository(),
    bills: new FirebaseBillsRepository(),
    reports: new FirebaseReportsRepository(),
  }
}
```

**Store modification pattern (example: transaction.store.ts):**

```typescript
// Before (direct firestore import):
import { listTransactions, createTransaction, patchTransaction, removeTransaction } from '../lib/firestore'

// After (repository injection):
import { getRepositories } from '../repositories'

const repos = getRepositories()

// Usage in store actions:
async fetchTransactions(filters: TransactionFilters) {
  const { data, total } = await repos.transactions.list(filters)
  // ... rest of store logic
}
```

**Gate criteria:**
- All repository interfaces defined for 6 domains (auth, transactions, wallets, budgets, bills, reports)
- All Firebase adapters implemented (wrapping existing `firestore.ts` functions)
- All Supabase stubs created (throwing "not implemented" errors)
- Factory returns correct repository set based on `VITE_DATA_PROVIDER`
- All stores modified to use repository interface (no direct `firestore.ts` imports from stores/UI)
- `pnpm --filter @kaswise/web type-check` passes
- `pnpm --filter @kaswise/web test` passes (all 8 tests)
- `pnpm --filter @kaswise/web build` succeeds
- App runs normally in mode `firebase` via repository abstraction
- Smoke test checklist from Fase 0 passes

## Data Flow

### Runtime Flow (Fase 2 complete)

1. **App start:**
   - Read `VITE_DATA_PROVIDER` from env (default: `firebase`)
   - Initialize Firebase client (existing)
   - Initialize Supabase client (new, but not used yet)

2. **Store initialization:**
   - Call `getRepositories()` to get repository set
   - Factory returns Firebase adapters (since provider is `firebase`)

3. **User action (e.g., create transaction):**
   - UI calls store action: `transactionStore.createTransaction(data)`
   - Store calls: `repos.transactions.create(data)`
   - Repository routes to: `FirebaseTransactionsRepository.create(data)`
   - Adapter calls: `createTransaction(data)` from `firestore.ts`
   - Firestore operation executes (existing behavior)

4. **Provider switch (future):**
   - Change `VITE_DATA_PROVIDER=supabase` in env
   - Restart app
   - Factory returns Supabase adapters
   - Same store action now routes to `SupabaseTransactionsRepository.create(data)`
   - Supabase operation executes (once implemented in later phases)

## Verification Strategy

### Per-Phase Verification

**Fase 0:**
- Baseline document created and committed
- Manual smoke test checklist executable
- All 8 existing tests pass

**Fase 1:**
- Type-check passes
- All tests pass
- Build succeeds
- App runs without errors in `firebase` mode
- Supabase client initializes without errors (even though unused)

**Fase 2:**
- Type-check passes
- All tests pass
- Build succeeds
- No direct `firestore.ts` imports from stores/UI (verified via grep)
- App runs normally in `firebase` mode via repository abstraction
- Smoke test checklist from Fase 0 passes

### Automated Verification Commands

```bash
# Type check
pnpm --filter @kaswise/web type-check

# Run tests
pnpm --filter @kaswise/web test

# Build
pnpm --filter @kaswise/web build

# Verify no direct firestore imports from stores
grep -r "from.*firestore" apps/web/src/store/ apps/web/src/pages/ apps/web/src/components/
# Should return no results after Fase 2
```

## Risk Mitigation

### Risk 1: RLS rejects valid queries
**Mitigation:** Test user-scoped queries in Supabase local environment before deploying. Verify RLS policies match expected access patterns.

**When:** Fase 3+ (auth cutover and read path migration)

### Risk 2: Dual provider adds complexity
**Mitigation:** Limit transition period. Cutover quickly after gate criteria met. Remove Firebase dependency after Fase 7.

**When:** Throughout migration, especially Fase 3–6

### Risk 3: Interface mismatch between Firebase and Supabase
**Mitigation:** Use shared types from `@kaswise/shared/types` for consistency. Repository interface enforces contract.

**When:** Fase 2 (repository abstraction)

### Risk 4: Scope creep from UI redesign
**Mitigation:** Defer UI redesign until after Fase 3 or full cutover. Focus only on data/auth/infrastructure in Fase 0–2.

**When:** Throughout migration

## Execution Order

1. **Fase 0 (1 day):**
   - Document critical flows (login, transactions, wallet, budget, bills, reports)
   - Create smoke test checklist
   - Verify baseline tests pass
   - **Gate:** Baseline document committed, tests pass

2. **Fase 1 (1–2 days):**
   - Add `@supabase/supabase-js` dependency
   - Create `apps/web/src/lib/supabase.ts`
   - Create `apps/web/src/lib/data-provider.ts`
   - Add Supabase env variables to `.env.local`
   - **Gate:** Type-check, tests, build pass; app runs in `firebase` mode

3. **Fase 2 (2 days):**
   - Create repository interfaces (6 domains)
   - Implement Firebase adapters (wrap existing `firestore.ts` functions)
   - Create Supabase stubs (throw "not implemented")
   - Create repository factory
   - Modify stores to use repository interface
   - Remove direct `firestore.ts` imports from stores/UI
   - **Gate:** Type-check, tests, build pass; app runs in `firebase` mode via abstraction; smoke test passes

## Success Criteria

**Fase 0–2 complete when:**
- Baseline documentation exists and is repeatable
- Supabase client infrastructure in place
- Repository abstraction layer implemented
- All stores use repository interface (no direct Firestore imports)
- App runs stably in `firebase` mode via repository abstraction
- All 8 existing tests pass
- Type-check and build succeed
- Smoke test checklist passes
- Ready to proceed to Fase 3 (auth cutover)

## Next Steps (Out of Scope)

After Fase 0–2 completion:
- **Fase 3:** Auth cutover (migrate `auth.store.ts` to Supabase Auth)
- **Fase 4:** Read path migration (profile, transactions, wallets, budgets, bills, reports)
- **Fase 5:** Write path migration (create/update/delete operations)
- **Fase 6:** AI + Realtime + Premium gate (Edge Functions integration)
- **Fase 7:** Cutover & cleanup (set default provider to `supabase`, remove Firebase dependency)

## Appendix: Repository Interface Contracts

### AuthRepository
```typescript
export interface AuthRepository {
  getCurrentUser(): Promise<User | null>
  signIn(email: string, password: string): Promise<User>
  signUp(email: string, password: string, fullName: string): Promise<User>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updateProfile(data: Partial<User>): Promise<void>
}
```

### TransactionsRepository
```typescript
export interface TransactionsRepository {
  list(filters: TransactionFilters): Promise<{ data: Transaction[]; total: number }>
  getById(id: string): Promise<Transaction | null>
  create(data: TransactionFormData): Promise<Transaction>
  update(id: string, data: Partial<TransactionFormData>): Promise<void>
  delete(id: string): Promise<void>
}
```

### WalletsRepository
```typescript
export interface WalletsRepository {
  list(): Promise<Wallet[]>
  getById(id: string): Promise<Wallet | null>
  create(data: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>): Promise<Wallet>
  update(id: string, data: Partial<Wallet>): Promise<void>
  delete(id: string): Promise<void>
  recalculateBalances(): Promise<void>
}
```

### BudgetsRepository
```typescript
export interface BudgetsRepository {
  list(): Promise<Budget[]>
  getById(id: string): Promise<Budget | null>
  create(data: BudgetFormData): Promise<Budget>
  update(id: string, data: Partial<BudgetFormData>): Promise<void>
  delete(id: string): Promise<void>
}
```

### BillsRepository
```typescript
export interface BillsRepository {
  list(): Promise<BillReminder[]>
  getById(id: string): Promise<BillReminder | null>
  create(data: BillFormData): Promise<BillReminder>
  update(id: string, data: Partial<BillFormData>): Promise<void>
  delete(id: string): Promise<void>
  markAsPaid(id: string): Promise<void>
}
```

### ReportsRepository
```typescript
export interface ReportsRepository {
  buildMonthlyReport(year: number, month: number): Promise<MonthlyReport>
  getInsight(year: number, month: number): Promise<string | null>
}
```

## Document History

- **2026-05-09:** Initial draft (Fase 0–2 design)
