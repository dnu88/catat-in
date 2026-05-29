# AI Continuation Handoff — Mobile Category-First Budget Sync

Date: 2026-05-29
Repo: `/home/Danu88/catat-in`
Mobile app: `apps/mobile`
Live domain: `https://kaswise.com`

## Latest Relevant Commit

```text
cbb7d26 fix(mobile): sync budgets by transaction category
```

Latest live PWA bundle after deploy:

```text
/_expo/static/js/web/entry-4c3d87480582c0576b8cd8f835690342.js
```

## User Goal

User wants Dompet/Wallet, Budget, and Transactions to sync by the expense category chosen/written in the transaction.

Requested changes:

1. Change transaction flow to **category-first sync**.
2. Budget page should let users choose custom start/end dates, e.g. start date on the 25th and end date on the 24th of the next month.
3. Fix manual transaction edit issue where edited transactions could not be saved.

## Implemented Behavior

### 1. Category-first budget sync

Primary file:

```text
apps/mobile/src/services/budget-envelopes.ts
```

Budget deduction is now category-first:

```text
transaction.categoryName == budget.parent_category_name
```

Backward compatibility remains for old budget wallets without `parent_category_id`:

```text
budget.parent_category_id is null AND budget.name == transaction.categoryName
```

Added helper:

```ts
function envelopeMatchesTransactionCategory(
  categoryName: string | null | undefined,
  envelope: BudgetEnvelope,
)
```

Important behavior changes:

- Expense transactions only allocate to active budgets whose category matches the transaction category.
- Removed the previous fallback that allocated to the only active envelope when no category/keyword matched.
- If no matching budget category exists, no `transaction_envelope_allocations` row is created.
- Budget spending is still calculated from `transaction_envelope_allocations`.

### 2. Budget create/edit now requires category

Primary file:

```text
apps/mobile/app/(tabs)/budgets.tsx
```

New import:

```ts
import { listCategories, type Category } from "../../src/services/categories";
```

New state:

```ts
const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
const [showCategoryOptions, setShowCategoryOptions] = useState(false);
```

Budget screen now loads categories together with envelopes:

```ts
const [envelopes, categories] = await Promise.all([
  listBudgetEnvelopes(supabase, user.id, activeContext),
  listCategories().catch(() => [] as Category[]),
]);
```

Income categories are excluded from budget category selection:

```ts
const expenseCategories = categories.filter(
  (category) => category.type !== "income",
);
```

Create/edit budget now saves:

```ts
parent_category_id: selectedCategoryId
```

Previously, budget creation always saved:

```ts
parent_category_id: null
```

Validation now requires:

```text
name, category, limit, start date, end date
```

UI labels added:

Indonesian:

```text
Kategori pengeluaran
Pilih kategori
Pilih kategori budget
```

English:

```text
Expense category
Select category
Select budget category
```

### 3. Custom daily budget period dropdown

Primary file:

```text
apps/mobile/app/(tabs)/budgets.tsx
```

Previous date dropdown only offered month-based periods:

- start date = first day of a selected month
- end date = last day of a selected month

Now date dropdowns offer daily date options so users can choose periods like:

```text
Start: 25 Mei
End: 24 Juni
```

Implemented with:

```ts
const dateOptions = useMemo(() => {
  const today = new Date();
  const firstOption = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 31,
  );

  return Array.from({ length: 427 }, (_, index) => {
    const date = new Date(
      firstOption.getFullYear(),
      firstOption.getMonth(),
      firstOption.getDate() + index,
    );
    const value = formatLocalDate(date);
    return { label: formatter.format(date), value };
  });
}, [isEn]);
```

Range is approximately:

- 31 days before today
- 395 days after today

The date list is scrollable:

```tsx
<ScrollView nestedScrollEnabled style={styles.dateOptionScroll}>
```

New styles:

```ts
dateOptionScroll: { maxHeight: 220 },
optionHint: { ... }
```

Hint labels:

Indonesian:

```text
Pilih tanggal dan bulan sesuai periode
```

English:

```text
Pick exact day and month
```

### 4. Manual transaction edit save fix

Primary file:

```text
apps/mobile/app/(tabs)/transaction-new.tsx
```

Issue:

- In edit mode, some old transactions had a `wallet_id` that was no longer active/valid in the current finance context.
- The form kept the stale wallet id.
- The submit button/validation blocked saving because the selected wallet was invalid.

Fix:

When loading an existing transaction, the screen now replaces a stale wallet with the first active wallet in the current context:

```ts
const nextWalletId = activeWallets.some(
  (wallet) => wallet.id === transaction?.wallet_id,
)
  ? (transaction.wallet_id ?? null)
  : (activeWallets[0]?.id ?? null);

setWalletId(nextWalletId);
```

This lets edited transactions save successfully even if the old wallet is no longer available.

## Tests Updated

### Budget screen

File:

```text
apps/mobile/__tests__/budget-envelopes-screen.test.tsx
```

Updates:

- Mocked `listCategories`.
- Create budget now expects:

```ts
parent_category_id: "cat-food"
```

- Edit budget expectation includes:

```ts
parent_category_id: "cat-food"
```

### Budget envelope service

File:

```text
apps/mobile/src/services/budget-envelopes.test.ts
```

Updates:

- Old fallback test changed to category-first behavior.
- If no category matches, allocation calls should be empty:

```ts
expect(calls).toEqual([]);
```

### Transaction edit mode

File:

```text
apps/mobile/__tests__/transaction-new-edit-mode.test.tsx
```

Updated stale-wallet test:

```text
replaces a stale edit wallet with an active wallet so edits can be saved
```

Expected update payload:

```ts
expect(mockUpdateTransaction).toHaveBeenCalledWith(
  "tx-1",
  expect.objectContaining({ wallet_id: "wallet-current" }),
  { type: "personal" },
);
```

## Validation Already Run

Type-check:

```bash
corepack pnpm --filter mobile type-check
```

Result:

```text
PASS
```

Full Jest:

```bash
corepack pnpm --filter mobile test -- --runInBand
```

Result:

```text
34 suites passed
220 tests passed
```

PWA export:

```bash
corepack pnpm --filter mobile export:pwa
```

Result:

```text
export_exit=0
```

PWA deploy:

```bash
corepack pnpm --filter mobile deploy:pwa
```

Result:

```text
deploy_exit=0
Deployed mobile PWA dist to /home/Danu88/nginx-proxy-manager/placeholder
```

## Notes for Next Model

1. **Budget sync now depends on category consistency.**
   If transaction category names differ from category names in `categories`, budget deduction will not happen.

2. **Budget old data may need backfill.**
   Existing budgets with `parent_category_id = null` only sync when budget name exactly matches the transaction category. Consider a migration/backfill:

   ```text
   budget_envelopes.name -> categories.name -> budget_envelopes.parent_category_id
   ```

3. **Capture AI categories should be reviewed.**
   Capture AI currently infers categories like:

   ```text
   Makanan & Minuman
   Transportasi
   Belanja
   ```

   These must match DB category names for category-first budget sync to work.

4. **Manual transaction fallback categories may not exist in DB.**
   Manual transaction form merges DB categories with fallback categories. If a user selects a fallback category that does not exist as a DB category, new budget category matching may not work as expected.

5. **Live Go Live Playwright was not rerun after this specific change.**
   Already run after prior mobile go-live work, but not after `cbb7d26`. If continuing validation, run:

   ```bash
   corepack pnpm --filter mobile test:golive
   ```

6. **Unique allocation migration from previous work may still need live verification.**
   File:

   ```text
   supabase/migrations/202605290001_unique_transaction_envelope_allocations.sql
   ```

   It creates a unique index for:

   ```text
   transaction_id, envelope_id
   ```

## Related Files Changed in Commit `cbb7d26`

```text
apps/mobile/__tests__/budget-envelopes-screen.test.tsx
apps/mobile/__tests__/transaction-new-edit-mode.test.tsx
apps/mobile/app/(tabs)/budgets.tsx
apps/mobile/app/(tabs)/transaction-new.tsx
apps/mobile/src/services/budget-envelopes.test.ts
apps/mobile/src/services/budget-envelopes.ts
```
