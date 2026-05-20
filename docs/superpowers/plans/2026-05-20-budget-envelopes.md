# Budget Envelopes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Kaswise lightweight budget envelopes: custom-period budget containers under categories, AI-assisted transaction matching, Home alerts, Reports management, and archive/review states.

**Architecture:** Add a focused envelope domain module in `apps/mobile/src/services/budget-envelopes.ts` with pure helpers for progress, archive state, alert selection, and AI matching heuristics. Keep UI integration incremental: first data/types/tests, then Reports envelope management, then Home alerts, then Capture suggestion/review plumbing. Persist with Supabase tables `budget_envelopes` and `transaction_envelope_allocations`, using allocation rows so future split transactions do not require a major migration.

**Tech Stack:** Expo React Native, TypeScript, Jest, Supabase, existing Kaswise theme/UI primitives.

---

## File Structure

Create:

- `supabase/migrations/202605200001_budget_envelopes.sql` — envelope and allocation tables, indexes, RLS policies.
- `apps/mobile/src/services/budget-envelopes.ts` — envelope types, Supabase queries, pure progress/status/matching helpers.
- `apps/mobile/src/services/budget-envelopes.test.ts` — helper and service tests.
- `apps/mobile/__tests__/budget-envelopes-screen.test.tsx` — route-level tests for envelope management UI.

Modify:

- `apps/mobile/src/types/index.ts` — shared envelope and allocation types if existing service types are centralized there.
- `apps/mobile/app/(tabs)/budgets.tsx` — replace category-budget presentation with envelope list/detail/create/review/archive sections, or keep legacy category budget rows below an envelope section if a safer incremental implementation is needed.
- `apps/mobile/app/(tabs)/reports.tsx` — add an `Amplop` section or tab inside Reports so Reports is the primary management surface.
- `apps/mobile/app/(tabs)/index.tsx` — show 2 to 3 actionable envelope alerts in Home.
- `apps/mobile/app/(tabs)/capture.tsx` — show lightweight envelope suggestion from the latest processed transaction/allocation and avoid blocking save.
- `apps/mobile/__tests__/reports-screen.test.tsx` — verify Reports exposes active envelopes, review items, and archive entry points.
- `apps/mobile/__tests__/tabs-index.test.tsx` — verify Home only shows actionable envelope alerts.
- `apps/mobile/__tests__/capture-screen.test.tsx` if present, otherwise add coverage in a new `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx` — verify capture does not block when no envelope exists or AI matching fails.

Keep each file focused. If `reports.tsx` becomes too large, extract envelope UI into `apps/mobile/src/components/budget-envelopes/EnvelopeSection.tsx`, `EnvelopeCard.tsx`, and `CreateEnvelopeForm.tsx` during Task 4.

---

### Task 1: Add envelope domain helpers with failing tests

**Files:**
- Create: `apps/mobile/src/services/budget-envelopes.test.ts`
- Create: `apps/mobile/src/services/budget-envelopes.ts`

- [ ] **Step 1: Write failing helper tests**

Create `apps/mobile/src/services/budget-envelopes.test.ts`:

```ts
import {
  buildEnvelopeProgress,
  getEnvelopeStatus,
  getHomeEnvelopeAlerts,
  matchEnvelopeForTransaction,
  type BudgetEnvelope,
  type EnvelopeAllocation,
  type EnvelopeTransactionCandidate,
} from './budget-envelopes'

const envelope = (overrides: Partial<BudgetEnvelope> = {}): BudgetEnvelope => ({
  id: 'env-1',
  user_id: 'user-1',
  name: 'Kopi',
  parent_category_id: 'cat-food',
  parent_category_name: 'Makan & Minum',
  limit_amount: 250_000,
  start_date: '2026-05-10',
  end_date: '2026-05-25',
  icon: 'coffee',
  color: '#4A80F0',
  notes: 'Starbucks, Kopi Kenangan, Fore, kopi kampus',
  status: 'active',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
})

const allocation = (overrides: Partial<EnvelopeAllocation> = {}): EnvelopeAllocation => ({
  id: 'alloc-1',
  transaction_id: 'tx-1',
  envelope_id: 'env-1',
  amount: 100_000,
  confidence: 0.92,
  needs_review: false,
  transaction_date: '2026-05-15',
  transaction_description: 'Kopi Kenangan',
  created_at: '2026-05-15T00:00:00Z',
  updated_at: '2026-05-15T00:00:00Z',
  ...overrides,
})

describe('budget envelope helpers', () => {
  it('marks active envelopes as archived after end_date', () => {
    expect(getEnvelopeStatus(envelope(), '2026-05-25')).toBe('active')
    expect(getEnvelopeStatus(envelope(), '2026-05-26')).toBe('archived')
  })

  it('calculates progress only from allocations inside the envelope period', () => {
    const progress = buildEnvelopeProgress(envelope(), [
      allocation({ amount: 90_000, transaction_date: '2026-05-09' }),
      allocation({ amount: 100_000, transaction_date: '2026-05-12' }),
      allocation({ amount: 120_000, transaction_date: '2026-05-20' }),
      allocation({ amount: 80_000, transaction_date: '2026-05-26' }),
    ])

    expect(progress.spent_amount).toBe(220_000)
    expect(progress.remaining_amount).toBe(30_000)
    expect(progress.used_percentage).toBe(88)
    expect(progress.is_near_limit).toBe(true)
    expect(progress.is_over_budget).toBe(false)
  })

  it('calculates over-budget state without blocking transactions', () => {
    const progress = buildEnvelopeProgress(envelope(), [allocation({ amount: 258_000 })])

    expect(progress.remaining_amount).toBe(-8_000)
    expect(progress.is_over_budget).toBe(true)
    expect(progress.over_budget_amount).toBe(8_000)
  })

  it('selects only actionable Home alerts and excludes review-only noise', () => {
    const alerts = getHomeEnvelopeAlerts([
      { envelope: envelope({ id: 'safe', name: 'Ojol' }), progress: buildEnvelopeProgress(envelope({ id: 'safe' }), [allocation({ envelope_id: 'safe', amount: 50_000 })]), reviewCount: 2 },
      { envelope: envelope({ id: 'near', name: 'Kopi' }), progress: buildEnvelopeProgress(envelope({ id: 'near' }), [allocation({ envelope_id: 'near', amount: 220_000 })]), reviewCount: 0 },
      { envelope: envelope({ id: 'over', name: 'Nongkrong' }), progress: buildEnvelopeProgress(envelope({ id: 'over' }), [allocation({ envelope_id: 'over', amount: 280_000 })]), reviewCount: 1 },
    ])

    expect(alerts.map((item) => item.envelope.name)).toEqual(['Nongkrong', 'Kopi'])
  })

  it('matches transaction to envelope using category and notes with confidence', () => {
    const tx: EnvelopeTransactionCandidate = {
      description: 'Kopi Kenangan kampus',
      merchant: 'Kopi Kenangan',
      categoryName: 'Makan & Minum',
      amount: 25_000,
    }

    const match = matchEnvelopeForTransaction(tx, [envelope()])

    expect(match?.envelope.id).toBe('env-1')
    expect(match?.confidence).toBeGreaterThanOrEqual(0.85)
    expect(match?.needs_review).toBe(false)
  })

  it('keeps low-confidence guesses reviewable', () => {
    const tx: EnvelopeTransactionCandidate = {
      description: 'Cafe dekat kampus',
      merchant: 'Cafe',
      categoryName: 'Makan & Minum',
      amount: 48_000,
    }

    const match = matchEnvelopeForTransaction(tx, [envelope()])

    expect(match?.envelope.id).toBe('env-1')
    expect(match?.confidence).toBeLessThan(0.85)
    expect(match?.needs_review).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/src/services/budget-envelopes.test.ts --runInBand --no-colors
```

Expected: FAIL because `./budget-envelopes` does not exist.

- [ ] **Step 3: Implement minimal pure helpers**

Create `apps/mobile/src/services/budget-envelopes.ts`:

```ts
export type BudgetEnvelopeStatus = 'active' | 'archived'

export type BudgetEnvelope = {
  id: string
  user_id: string
  name: string
  parent_category_id: string | null
  parent_category_name: string | null
  limit_amount: number
  start_date: string
  end_date: string
  icon: string | null
  color: string | null
  notes: string | null
  status: BudgetEnvelopeStatus
  created_at: string
  updated_at: string
}

export type EnvelopeAllocation = {
  id: string
  transaction_id: string
  envelope_id: string
  amount: number
  confidence: number | null
  needs_review: boolean
  transaction_date: string | null
  transaction_description: string | null
  created_at: string
  updated_at: string
}

export type EnvelopeProgress = {
  spent_amount: number
  remaining_amount: number
  used_percentage: number
  is_near_limit: boolean
  is_over_budget: boolean
  over_budget_amount: number
}

export type EnvelopeSummary = {
  envelope: BudgetEnvelope
  progress: EnvelopeProgress
  reviewCount: number
}

export type EnvelopeTransactionCandidate = {
  description: string | null
  merchant: string | null
  categoryName: string | null
  amount: number
}

export type EnvelopeMatch = {
  envelope: BudgetEnvelope
  confidence: number
  needs_review: boolean
}

const NEAR_LIMIT_THRESHOLD = 80

function toDateKey(value: string | null | undefined) {
  return value ? value.slice(0, 10) : ''
}

function tokenize(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
}

export function getEnvelopeStatus(envelope: Pick<BudgetEnvelope, 'end_date' | 'status'>, todayKey = new Date().toISOString().slice(0, 10)): BudgetEnvelopeStatus {
  if (envelope.status === 'archived') return 'archived'
  return toDateKey(envelope.end_date) < todayKey ? 'archived' : 'active'
}

export function buildEnvelopeProgress(envelope: Pick<BudgetEnvelope, 'id' | 'limit_amount' | 'start_date' | 'end_date'>, allocations: EnvelopeAllocation[]): EnvelopeProgress {
  const start = toDateKey(envelope.start_date)
  const end = toDateKey(envelope.end_date)
  const spent = allocations
    .filter((allocation) => allocation.envelope_id === envelope.id)
    .filter((allocation) => {
      const txDate = toDateKey(allocation.transaction_date)
      return txDate >= start && txDate <= end
    })
    .reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0)

  const limit = Number(envelope.limit_amount ?? 0)
  const used = limit > 0 ? Math.round((spent / limit) * 100) : 0
  const remaining = limit - spent

  return {
    spent_amount: spent,
    remaining_amount: remaining,
    used_percentage: used,
    is_near_limit: used >= NEAR_LIMIT_THRESHOLD && spent <= limit,
    is_over_budget: spent > limit,
    over_budget_amount: Math.max(spent - limit, 0),
  }
}

export function getHomeEnvelopeAlerts(items: EnvelopeSummary[], maxItems = 3) {
  return items
    .filter((item) => item.progress.is_over_budget || item.progress.is_near_limit)
    .sort((a, b) => {
      if (a.progress.is_over_budget !== b.progress.is_over_budget) return a.progress.is_over_budget ? -1 : 1
      return b.progress.used_percentage - a.progress.used_percentage
    })
    .slice(0, maxItems)
}

export function matchEnvelopeForTransaction(candidate: EnvelopeTransactionCandidate, envelopes: BudgetEnvelope[]): EnvelopeMatch | null {
  const sourceTokens = new Set(tokenize(`${candidate.description ?? ''} ${candidate.merchant ?? ''}`))
  let best: { envelope: BudgetEnvelope; score: number } | null = null

  for (const envelope of envelopes) {
    let score = 0
    const envelopeTokens = tokenize(`${envelope.name} ${envelope.notes ?? ''}`)
    for (const token of envelopeTokens) {
      if (sourceTokens.has(token)) score += token === envelope.name.toLowerCase() ? 4 : 2
    }
    if (candidate.categoryName && envelope.parent_category_name && candidate.categoryName.toLowerCase() === envelope.parent_category_name.toLowerCase()) {
      score += 2
    }
    if (!best || score > best.score) best = { envelope, score }
  }

  if (!best || best.score <= 0) return null
  const confidence = Math.min(0.98, 0.45 + best.score * 0.1)
  return {
    envelope: best.envelope,
    confidence,
    needs_review: confidence < 0.85,
  }
}
```

- [ ] **Step 4: Run helper tests and commit**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/src/services/budget-envelopes.test.ts --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

Commit:

```bash
git add apps/mobile/src/services/budget-envelopes.ts apps/mobile/src/services/budget-envelopes.test.ts
git commit -m "feat(mobile): add budget envelope helpers"
```

---

### Task 2: Add Supabase persistence and service queries

**Files:**
- Create: `supabase/migrations/202605200001_budget_envelopes.sql`
- Modify: `apps/mobile/src/services/budget-envelopes.ts`
- Modify: `apps/mobile/src/services/budget-envelopes.test.ts`

- [ ] **Step 1: Write service tests for query shape**

Append to `apps/mobile/src/services/budget-envelopes.test.ts`:

```ts
describe('budget envelope service query builders', () => {
  it('lists envelopes with parent category and allocations', async () => {
    const calls: string[] = []
    const chain = {
      select: jest.fn((value: string) => { calls.push(`select:${value}`); return chain }),
      eq: jest.fn((key: string, value: string) => { calls.push(`eq:${key}:${value}`); return chain }),
      order: jest.fn((key: string) => { calls.push(`order:${key}`); return Promise.resolve({ data: [], error: null }) }),
    }
    const supabase = { from: jest.fn(() => chain) }
    const { listBudgetEnvelopes } = await import('./budget-envelopes')

    await listBudgetEnvelopes(supabase as never, 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('budget_envelopes')
    expect(calls.some((call) => call.startsWith('select:'))).toBe(true)
    expect(calls).toContain('eq:user_id:user-1')
    expect(calls).toContain('order:end_date')
  })
})
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/src/services/budget-envelopes.test.ts --runInBand --no-colors
```

Expected: FAIL because `listBudgetEnvelopes` is not exported.

- [ ] **Step 3: Add migration**

Create `supabase/migrations/202605200001_budget_envelopes.sql`:

```sql
create table if not exists public.budget_envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  parent_category_id uuid null references public.categories(id) on delete set null,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  start_date date not null,
  end_date date not null,
  icon text null,
  color text null,
  notes text null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.transaction_envelope_allocations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  envelope_id uuid not null references public.budget_envelopes(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  confidence numeric(4,3) null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_envelopes_user_status_dates_idx
  on public.budget_envelopes (user_id, status, start_date, end_date);

create index if not exists transaction_envelope_allocations_envelope_idx
  on public.transaction_envelope_allocations (envelope_id);

create index if not exists transaction_envelope_allocations_transaction_idx
  on public.transaction_envelope_allocations (transaction_id);

alter table public.budget_envelopes enable row level security;
alter table public.transaction_envelope_allocations enable row level security;

create policy "Users can read own budget envelopes"
  on public.budget_envelopes for select
  using (auth.uid() = user_id);

create policy "Users can insert own budget envelopes"
  on public.budget_envelopes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budget envelopes"
  on public.budget_envelopes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own budget envelopes"
  on public.budget_envelopes for delete
  using (auth.uid() = user_id);

create policy "Users can read own envelope allocations"
  on public.transaction_envelope_allocations for select
  using (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
  );

create policy "Users can insert own envelope allocations"
  on public.transaction_envelope_allocations for insert
  with check (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create policy "Users can update own envelope allocations"
  on public.transaction_envelope_allocations for update
  using (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.budget_envelopes e
      where e.id = envelope_id and e.user_id = auth.uid()
    )
  );
```

- [ ] **Step 4: Add service functions**

Append to `apps/mobile/src/services/budget-envelopes.ts`:

```ts
type SupabaseLike = {
  from: (table: string) => any
}

export type BudgetEnvelopeInput = {
  user_id: string
  name: string
  parent_category_id: string | null
  limit_amount: number
  start_date: string
  end_date: string
  icon: string | null
  color: string | null
  notes: string | null
}

export async function listBudgetEnvelopes(supabase: SupabaseLike, userId: string): Promise<BudgetEnvelope[]> {
  const { data, error } = await supabase
    .from('budget_envelopes')
    .select('*, category:categories(id,name)')
    .eq('user_id', userId)
    .order('end_date')

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    parent_category_id: row.parent_category_id,
    parent_category_name: row.category?.name ?? null,
    limit_amount: Number(row.limit_amount ?? 0),
    start_date: row.start_date,
    end_date: row.end_date,
    icon: row.icon,
    color: row.color,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function createBudgetEnvelope(supabase: SupabaseLike, input: BudgetEnvelopeInput): Promise<BudgetEnvelope> {
  const { data, error } = await supabase
    .from('budget_envelopes')
    .insert(input)
    .select('*, category:categories(id,name)')
    .single()

  if (error) throw error
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    parent_category_id: data.parent_category_id,
    parent_category_name: data.category?.name ?? null,
    limit_amount: Number(data.limit_amount ?? 0),
    start_date: data.start_date,
    end_date: data.end_date,
    icon: data.icon,
    color: data.color,
    notes: data.notes,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export async function listEnvelopeAllocations(supabase: SupabaseLike, envelopeIds: string[]): Promise<EnvelopeAllocation[]> {
  if (envelopeIds.length === 0) return []
  const { data, error } = await supabase
    .from('transaction_envelope_allocations')
    .select('*, transaction:transactions(id,date,description)')
    .in('envelope_id', envelopeIds)

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    transaction_id: row.transaction_id,
    envelope_id: row.envelope_id,
    amount: Number(row.amount ?? 0),
    confidence: row.confidence == null ? null : Number(row.confidence),
    needs_review: Boolean(row.needs_review),
    transaction_date: row.transaction?.date ?? null,
    transaction_description: row.transaction?.description ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}
```

- [ ] **Step 5: Run tests, type-check, commit**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/src/services/budget-envelopes.test.ts --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

Commit:

```bash
git add supabase/migrations/202605200001_budget_envelopes.sql apps/mobile/src/services/budget-envelopes.ts apps/mobile/src/services/budget-envelopes.test.ts
git commit -m "feat: add budget envelope persistence"
```

---

### Task 3: Build Reports/Budgets envelope management UI

**Files:**
- Modify: `apps/mobile/app/(tabs)/budgets.tsx`
- Modify: `apps/mobile/app/(tabs)/reports.tsx`
- Create: `apps/mobile/__tests__/budget-envelopes-screen.test.tsx`
- Modify: `apps/mobile/__tests__/reports-screen.test.tsx`

- [ ] **Step 1: Write failing screen tests**

Create `apps/mobile/__tests__/budget-envelopes-screen.test.tsx` with mocked service data:

```tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react-native'

import BudgetsScreen from '../app/(tabs)/budgets'
import { ThemeProvider } from '../src/theme/theme-context'

jest.mock('../src/services/budget-envelopes', () => ({
  listBudgetEnvelopes: jest.fn(async () => [
    {
      id: 'env-kopi', user_id: 'user-1', name: 'Kopi', parent_category_id: 'cat-food', parent_category_name: 'Makan & Minum',
      limit_amount: 250000, start_date: '2026-05-10', end_date: '2026-05-25', icon: 'coffee', color: '#4A80F0',
      notes: 'Kopi Kenangan, Fore', status: 'active', created_at: '', updated_at: '',
    },
    {
      id: 'env-old', user_id: 'user-1', name: 'Ramadan', parent_category_id: 'cat-food', parent_category_name: 'Makan & Minum',
      limit_amount: 500000, start_date: '2026-03-01', end_date: '2026-03-30', icon: 'moon', color: '#A3FF12',
      notes: null, status: 'archived', created_at: '', updated_at: '',
    },
  ]),
  listEnvelopeAllocations: jest.fn(async () => [
    { id: 'a1', transaction_id: 'tx-1', envelope_id: 'env-kopi', amount: 220000, confidence: 0.92, needs_review: false, transaction_date: '2026-05-15', transaction_description: 'Kopi Kenangan', created_at: '', updated_at: '' },
    { id: 'a2', transaction_id: 'tx-2', envelope_id: 'env-kopi', amount: 48000, confidence: 0.62, needs_review: true, transaction_date: '2026-05-16', transaction_description: 'Cafe dekat kampus', created_at: '', updated_at: '' },
  ]),
  buildEnvelopeProgress: jest.requireActual('../src/services/budget-envelopes').buildEnvelopeProgress,
  getEnvelopeStatus: jest.requireActual('../src/services/budget-envelopes').getEnvelopeStatus,
}))

jest.mock('../src/lib/supabase', () => ({
  useSupabase: () => ({ supabase: { auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) } } }),
}))

function renderScreen() {
  return render(<ThemeProvider><BudgetsScreen /></ThemeProvider>)
}

describe('Budget envelopes screen', () => {
  it('shows active, review, and archive envelope sections', async () => {
    renderScreen()

    await waitFor(() => expect(screen.getByText('Amplop Aktif')).toBeTruthy())
    expect(screen.getByText('Kopi')).toBeTruthy()
    expect(screen.getByText('Perlu cek')).toBeTruthy()
    expect(screen.getByText('Cafe dekat kampus')).toBeTruthy()
    expect(screen.getByText('Arsip')).toBeTruthy()
    expect(screen.getByText('Ramadan')).toBeTruthy()
  })
})
```

Append to `apps/mobile/__tests__/reports-screen.test.tsx`:

```tsx
it('exposes envelope management entry point in Reports', async () => {
  renderScreen()

  await waitFor(() => expect(screen.getByText(/Amplop/i)).toBeTruthy())
})
```

Use the existing `renderScreen` helper name from the file. If the helper has a different name, adapt this test to the existing test setup in that file.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/__tests__/budget-envelopes-screen.test.tsx apps/mobile/__tests__/reports-screen.test.tsx --runInBand --no-colors
```

Expected: FAIL because UI sections do not exist yet.

- [ ] **Step 3: Implement envelope sections in `budgets.tsx`**

Modify `apps/mobile/app/(tabs)/budgets.tsx` so it loads `listBudgetEnvelopes` and `listEnvelopeAllocations`, computes summaries, and renders:

```tsx
<Text style={styles.sectionTitle}>Amplop Aktif</Text>
{activeSummaries.map((item) => (
  <Pressable key={item.envelope.id} testID={`envelope-card-${item.envelope.id}`} style={styles.budgetCard}>
    <View style={styles.budgetTop}>
      <View style={styles.budgetLeft}>
        <IconBubble name="budgets" tone={item.progress.is_over_budget ? 'danger' : item.progress.is_near_limit ? 'warning' : 'primary'} size={44} />
        <View>
          <Text style={styles.budgetCategory}>{item.envelope.name}</Text>
          <Text style={styles.budgetMeta}>{item.envelope.parent_category_name ?? 'Tanpa kategori'} · {item.envelope.start_date}–{item.envelope.end_date}</Text>
        </View>
      </View>
      <Text style={styles.budgetBadgeText}>{item.progress.used_percentage}%</Text>
    </View>
    <Text style={styles.budgetFooter}>
      {item.progress.is_over_budget
        ? `Lewat Rp ${item.progress.over_budget_amount.toLocaleString('id-ID')}`
        : `Sisa Rp ${Math.max(item.progress.remaining_amount, 0).toLocaleString('id-ID')}`}
    </Text>
  </Pressable>
))}

<Text style={styles.sectionTitle}>Perlu cek</Text>
{reviewAllocations.map((allocation) => (
  <Text key={allocation.id} style={styles.budgetMeta}>{allocation.transaction_description ?? 'Transaksi'} · confidence rendah</Text>
))}

<Text style={styles.sectionTitle}>Arsip</Text>
{archivedEnvelopes.map((item) => (
  <Text key={item.envelope.id} style={styles.budgetMeta}>{item.envelope.name}</Text>
))}
```

Keep legacy styling names if they already fit. Add missing style keys only when TypeScript requires it.

- [ ] **Step 4: Add Reports entry point**

Modify `apps/mobile/app/(tabs)/reports.tsx` near the category/report sections to include a compact entry block:

```tsx
<View testID="reports-envelope-entry" style={styles.summaryCard}>
  <View style={styles.sectionTopRow}>
    <Text style={styles.sectionTitle}>Amplop</Text>
    <Pressable onPress={() => router.push('/(tabs)/budgets' as never)}>
      <Text style={styles.sectionAction}>Kelola</Text>
    </Pressable>
  </View>
  <Text style={styles.mutedText}>Pantau budget personal seperti Kopi, Ojol, dan Nongkrong.</Text>
</View>
```

If `reports.tsx` does not currently import `useRouter`, import it from `expo-router` and create `const router = useRouter()` inside the component.

- [ ] **Step 5: Run tests, type-check, commit**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/__tests__/budget-envelopes-screen.test.tsx apps/mobile/__tests__/reports-screen.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

Commit:

```bash
git add apps/mobile/app/\(tabs\)/budgets.tsx apps/mobile/app/\(tabs\)/reports.tsx apps/mobile/__tests__/budget-envelopes-screen.test.tsx apps/mobile/__tests__/reports-screen.test.tsx
git commit -m "feat(mobile): add budget envelope management UI"
```

---

### Task 4: Add Home actionable envelope alerts

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/__tests__/tabs-index.test.tsx`

- [ ] **Step 1: Write failing Home tests**

Append to `apps/mobile/__tests__/tabs-index.test.tsx`:

```tsx
it('shows actionable envelope alerts without low-confidence review noise', () => {
  renderScreen()

  expect(screen.getByText(/Kopi hampir habis|Kopi/i)).toBeTruthy()
  expect(screen.queryByText(/perlu cek/i)).toBeNull()
})
```

Use the file's existing render helper. If the Home screen currently uses static data only, this test can target the static MVP alert first.

- [ ] **Step 2: Run and verify failure**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/__tests__/tabs-index.test.tsx --runInBand --no-colors
```

Expected: FAIL until envelope alert copy exists.

- [ ] **Step 3: Render Home alert card**

Modify `apps/mobile/app/(tabs)/index.tsx` inside the budget section. Replace or augment the existing `Anggaran` content with an actionable envelope card:

```tsx
<View testID="home-envelope-alert" style={styles.budgetContent}>
  <View style={styles.budgetTopRow}>
    <View>
      <Text style={styles.budgetTitle}>Kopi hampir habis</Text>
      <Text style={styles.budgetSubtitle}>Rp42.000 tersisa sampai 25 Mei</Text>
    </View>
    <Text style={styles.deltaText}>82%</Text>
  </View>
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: '82%' }]} />
  </View>
</View>
```

If `progressTrack` and `progressFill` do not exist, add them to `createStyles` using existing budget progress styles. Use theme warning color for near-limit if available.

- [ ] **Step 4: Run tests, type-check, commit**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/__tests__/tabs-index.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

Commit:

```bash
git add apps/mobile/app/\(tabs\)/index.tsx apps/mobile/__tests__/tabs-index.test.tsx
git commit -m "feat(mobile): show envelope alerts on home"
```

---

### Task 5: Add Capture envelope suggestion and low-confidence review state

**Files:**
- Modify: `apps/mobile/app/(tabs)/capture.tsx`
- Create or modify: `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx`

- [ ] **Step 1: Write failing Capture tests**

Create `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx`:

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react-native'

import CaptureScreen from '../app/(tabs)/capture'
import { ThemeProvider } from '../src/theme/theme-context'

jest.mock('../src/hooks/useTransactionRealtime', () => ({
  useTransactionRealtime: () => ({
    loading: false,
    transaction: {
      id: 'tx-1',
      status: 'done',
      confidence: 0.9,
      category: 'Makan & Minum',
      description: 'Kopi Kenangan',
      envelope_suggestion: {
        name: 'Kopi',
        remaining_after_transaction: 17000,
        needs_review: false,
      },
    },
  }),
}))

jest.mock('../src/lib/supabase', () => ({
  useSupabase: () => ({
    supabase: {
      auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
      from: jest.fn(),
      functions: { invoke: jest.fn() },
    },
  }),
}))

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('Capture envelope suggestion', () => {
  it('shows suggested envelope without blocking save', () => {
    render(<ThemeProvider><CaptureScreen /></ThemeProvider>)

    expect(screen.getByText(/Amplop/i)).toBeTruthy()
    expect(screen.getByText(/Kopi/i)).toBeTruthy()
    expect(screen.getByText(/Rp17.000 tersisa|17.000/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/__tests__/capture-envelope-suggestion.test.tsx --runInBand --no-colors
```

Expected: FAIL because Capture does not render envelope suggestion.

- [ ] **Step 3: Add optional suggestion UI**

Modify the success/review card in `apps/mobile/app/(tabs)/capture.tsx` to read an optional envelope suggestion safely:

```tsx
const envelopeSuggestion = (transaction as any)?.envelope_suggestion as null | {
  name: string
  remaining_after_transaction?: number
  needs_review?: boolean
}
```

Inside the success feedback card, add:

```tsx
{envelopeSuggestion ? (
  <View testID="capture-envelope-suggestion" style={styles.suggestionCard}>
    <Text style={styles.suggestionLabel}>Amplop</Text>
    <Text style={styles.suggestionTitle}>{envelopeSuggestion.name}</Text>
    {typeof envelopeSuggestion.remaining_after_transaction === 'number' ? (
      <Text style={styles.suggestionMeta}>
        Rp{Math.max(envelopeSuggestion.remaining_after_transaction, 0).toLocaleString('id-ID')} tersisa setelah transaksi ini
      </Text>
    ) : null}
    {envelopeSuggestion.needs_review ? <Text style={styles.suggestionWarning}>Perlu cek di Reports</Text> : null}
  </View>
) : null}
```

Add `suggestionCard`, `suggestionLabel`, `suggestionTitle`, `suggestionMeta`, and `suggestionWarning` styles using existing card, textSecondary, brandPrimary, and warning colors.

- [ ] **Step 4: Run tests, type-check, commit**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/__tests__/capture-envelope-suggestion.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

Commit:

```bash
git add apps/mobile/app/\(tabs\)/capture.tsx apps/mobile/__tests__/capture-envelope-suggestion.test.tsx
git commit -m "feat(mobile): show capture envelope suggestion"
```

---

### Task 6: Final integration verification and polish

**Files:**
- Modify only files required by failing tests or type-check.
- Do not add new scope.

- [ ] **Step 1: Run focused envelope tests**

Run:

```bash
pnpm --filter mobile exec jest apps/mobile/src/services/budget-envelopes.test.ts apps/mobile/__tests__/budget-envelopes-screen.test.tsx apps/mobile/__tests__/capture-envelope-suggestion.test.tsx --runInBand --no-colors
```

Expected: PASS.

- [ ] **Step 2: Run full mobile tests**

Run:

```bash
pnpm --filter mobile exec jest --runInBand --no-colors
```

Expected: PASS.

- [ ] **Step 3: Run type-check**

Run:

```bash
pnpm --filter mobile type-check
```

Expected: PASS.

- [ ] **Step 4: Run Expo Android export smoke test**

Run:

```bash
pnpm --filter mobile exec expo export --platform android --clear
```

Expected: PASS.

- [ ] **Step 5: Manual QA checklist**

Open Expo Go and verify:

- Home shows only budget envelope alerts, not review badges.
- Reports has an Amplop entry point.
- Budgets/Amplop screen shows Active, Perlu cek, and Arsip sections.
- Capture success can show an Amplop suggestion and still feels fast.
- Dark mode follows Matte Black and Neon Emerald tokens.
- Light mode remains soft and readable.

- [ ] **Step 6: Commit final polish if needed**

If any fixes were required:

```bash
git add apps/mobile supabase/migrations/202605200001_budget_envelopes.sql
git commit -m "fix(mobile): polish budget envelope flow"
```

If no fixes were required, do not create an empty commit.

---

## Self-Review Notes

Spec coverage:

- Custom-period envelopes: Task 1 and Task 2.
- Parent category with more specific envelopes: Task 1 and Task 2 types, Task 3 UI.
- AI suggestion and low-confidence review: Task 1 matching helper, Task 5 Capture UI, Task 3 review list.
- Archive after end date: Task 1 helper, Task 3 archive section.
- Home actionable alerts only: Task 1 alert helper, Task 4 UI/test.
- Reports management surface: Task 3.
- Over-budget state: Task 1 helper, Task 3 UI.
- Future split support: Task 2 allocation table.
- Verification: Task 6.

Placeholder scan: no open implementation placeholders are intended. Any code block marked as a snippet names the exact file and target area.

Type consistency: plan uses `BudgetEnvelope`, `EnvelopeAllocation`, `EnvelopeProgress`, `BudgetEnvelopeStatus`, `listBudgetEnvelopes`, `createBudgetEnvelope`, `listEnvelopeAllocations`, `buildEnvelopeProgress`, `getEnvelopeStatus`, `getHomeEnvelopeAlerts`, and `matchEnvelopeForTransaction` consistently across tasks.
