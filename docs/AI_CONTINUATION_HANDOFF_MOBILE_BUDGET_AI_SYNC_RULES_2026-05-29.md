# AI Continuation Handoff — Mobile Budget Sync Rules and AI Classification

Date: 2026-05-29
Repo: `/home/Danu88/catat-in`
Mobile app: `apps/mobile`
Live domain: `https://kaswise.com`

## Latest Relevant Commit

```text
737498b fix(mobile): sync budget cycles and AI categories
```

Latest live PWA bundle after deploy:

```text
/_expo/static/js/web/entry-3ca6df331e7c5be146d23803d686bcb3.js
```

## User Goal

User requested follow-up fixes for the mobile/PWA go-live flow:

1. Budget wallets must sync automatically with matching transactions.
   - If a budget already exists, new matching transactions should immediately deduct from it.
   - If a budget is created after transactions already exist, old matching transactions should backfill into that budget automatically.
   - If a user records a transaction before any budget exists, behavior should remain non-blocking as before.
2. Saved budget wallet cards must display the user-selected icon.
3. Budget wallet periods must follow one shared cycle rule, e.g. if one budget uses day `25 → 24`, all active budgets should follow the same cycle.
4. AI text capture must classify income keywords like `pendapatan`, `gaji`, and `penghasilan` as income.
5. AI classification between `Groceries` and `Food & Beverage (F&B)` must follow strict rules:
   - Groceries = raw ingredients, household stock, staple goods, supermarket/minimarket/pasar/e-grocery purchases.
   - F&B = ready-to-eat/drink food, restaurants, cafés, coffee shops, warteg, street food, food delivery.
   - Mixed inputs with separate amounts should be split into multiple transactions.

## Implemented Behavior

### 1. Budget backfill sync when budget is created or edited

Primary files:

```text
apps/mobile/src/services/budget-envelopes.ts
apps/mobile/app/(tabs)/budgets.tsx
```

Added service-level sync helper:

```ts
syncEnvelopeAllocationsForBudgetEnvelope(...)
```

Behavior:

- On budget create/edit, Kaswise now queries existing transactions in the active finance context.
- Matching expense transactions inside the budget period are inserted into `transaction_envelope_allocations`.
- Matching is still category-first via:

```text
transaction.categoryName == budget.parent_category_name
```

- Non-matching categories are ignored.
- Existing allocation rows for the edited/created envelope are deleted first, then rebuilt.
- If no matching transactions exist, no allocation row is created.

This complements existing transaction-time sync:

```ts
syncEnvelopeAllocationForTransaction(...)
```

So the system now syncs in both directions:

```text
transaction created/edited → matching budget allocation
budget created/edited → existing matching transaction allocations
```

### 2. Budget wallet icon now uses the selected icon

Primary file:

```text
apps/mobile/app/(tabs)/budgets.tsx
```

Before:

```tsx
<IconBubble name="budgets" ... />
```

Now budget cards resolve and display the saved envelope icon:

```ts
function resolveBudgetIconName(value: string | null | undefined): KaswiseIconName
```

Budget row uses:

```tsx
<IconBubble name={rowIcon} ... />
```

This fixes the issue where users selected icons like `food`, `groceries`, `transport`, etc., but the saved budget card still showed the generic budget icon.

### 3. Shared budget cycle rule

Primary file:

```text
apps/mobile/app/(tabs)/budgets.tsx
```

Added shared cycle helper:

```ts
const getSharedBudgetCycleDays = () => { ... }
```

Behavior:

- Creating a new budget defaults to the existing active budget cycle when available.
- Saving a budget aligns other active budgets to the same start/end day cycle.
- Example:

```text
Budget cycle set to day 25 → day 24
All active budget wallets are updated to follow 25 → 24
```

Implementation updates other active envelopes with:

```ts
updateBudgetEnvelope(..., { start_date: cycle.start, end_date: cycle.end }, ...)
```

Then each affected budget is resynced using:

```ts
syncEnvelopeAllocationsForBudgetEnvelope(...)
```

### 4. AI income keyword classification

Primary file:

```text
apps/mobile/src/services/transaction-classifier.ts
```

Income inference now includes:

```text
pendapatan
penghasilan
gaji
```

Regex was expanded to include:

```ts
/\b(gaji|bonus|freelance|dibayar|bayaran|pemasukan|pendapatan|penghasilan|income|terima|masuk|thr)\b/i
```

The `salary` concept aliases/keywords also include:

```text
pendapatan
penghasilan
```

Result examples:

```text
"pendapatan proyek 2jt" → income / Salary
"penghasilan bulan ini 4jt" → income
"gaji Rp1.500.000" → income / Salary
```

### 5. Strict Groceries vs Food & Beverage classification

Primary file:

```text
apps/mobile/src/services/transaction-classifier.ts
```

#### Groceries

Represents household needs / fixed needs / stock purchases.

Strong signals added:

```text
belanja bulanan
kebutuhan rumah
bahan pokok
bahan mentah
stok rumah
kopi bubuk
kopi saset / sachet
susu kotak / susu UHT
mi instan / mie instan
aqua galon
gas LPG
minyak goreng
daging mentah
beras, telur, sayur, buah, sabun, detergen, tisu
```

Merchant signals:

```text
Indomaret
Alfamart
Alfamidi
Superindo
Hypermart
Ranch Market
Lotte Mart
Astro
Sayurbox
```

Example:

```text
"beli kopi bubuk dan susu UHT di indomaret 85rb" → Groceries
```

#### Food & Beverage

Represents ready-to-consume food/drinks, lifestyle, or convenience spend.

Strong signals added:

```text
siap saji
siap santap
pesan antar
makan siang
makan malam
sarapan
kopi latte
latte
cappuccino
americano
espresso
boba
jajanan
nasi goreng
mie ayam
ayam geprek
bento
warteg
warung makan
resto / restoran / restaurant
cafe / kafe / coffee shop
GoFood / GrabFood / ShopeeFood
```

Merchant signals:

```text
Kopi Kenangan
Fore Coffee
Starbucks
Janji Jiwa
Mixue
McD
KFC
GoFood
GrabFood
ShopeeFood
```

Example:

```text
"beli kopi latte siap minum di Kopi Kenangan 35rb" → Food & Beverage
```

### 6. Split transaction support for mixed Groceries + F&B inputs

Primary files:

```text
apps/mobile/src/services/transaction-classifier.ts
apps/mobile/app/(tabs)/capture.tsx
```

Added batch classifier:

```ts
classifyTransactionTextBatch(...)
```

Behavior:

- If one text input contains multiple amount mentions, Kaswise segments the text around those amounts.
- If segmented results contain both `food_beverage` and `groceries`, the input is split into multiple transactions.
- If it is not clearly a Groceries + F&B mix, the classifier falls back to one transaction.

Example:

```text
"belanja beras 100rb dan kopi latte siap minum 35rb"
```

Creates two drafts:

```text
1. Groceries — Rp100.000
2. Food & Beverage — Rp35.000
```

Capture screen now uses:

```ts
classifyTransactionTextBatch(...)
```

and creates transactions with:

```ts
Promise.all(quickDrafts.map((draft) => createTransaction(...)))
```

If more than one transaction is created, the queued message says:

```text
2 transaksi langsung disimpan dari satu catatan.
```

## Important Files Changed

```text
apps/mobile/app/(tabs)/budgets.tsx
apps/mobile/app/(tabs)/capture.tsx
apps/mobile/src/services/budget-envelopes.ts
apps/mobile/src/services/transaction-classifier.ts
apps/mobile/__tests__/budget-envelopes-screen.test.tsx
apps/mobile/src/services/budget-envelopes.test.ts
apps/mobile/src/services/transaction-classifier.test.ts
```

## Tests Updated

### Budget envelope tests

File:

```text
apps/mobile/src/services/budget-envelopes.test.ts
```

Added coverage for:

- Backfilling existing transactions when a budget is created later.
- Only matching category transactions are allocated.
- Non-matching transactions are ignored.

### Budget screen tests

File:

```text
apps/mobile/__tests__/budget-envelopes-screen.test.tsx
```

Added/updated coverage for:

- Saved budget card displays the selected icon.
- Saving a budget triggers allocation backfill/sync.
- Editing budget also triggers sync.

### Transaction classifier tests

File:

```text
apps/mobile/src/services/transaction-classifier.test.ts
```

Added coverage for:

- `pendapatan`, `gaji`, `penghasilan` as income.
- Stock goods like `kopi bubuk`, `susu UHT`, and minimarket purchases as Groceries.
- Ready-to-drink coffee like `kopi latte siap minum` as F&B.
- Mixed notes with separate amounts are split into Groceries + F&B.

## Validation Run

Type check:

```bash
corepack pnpm --filter mobile type-check
```

Result:

```text
✅ passed
```

Targeted tests:

```bash
corepack pnpm --filter mobile test -- --runTestsByPath \
  src/services/transaction-classifier.test.ts \
  src/services/budget-envelopes.test.ts \
  __tests__/budget-envelopes-screen.test.tsx \
  __tests__/capture-envelope-suggestion.test.tsx
```

Result:

```text
✅ 4 suites passed
✅ 34 tests passed
```

Full mobile test suite:

```bash
corepack pnpm --filter mobile test
```

Result:

```text
✅ 35 suites passed
✅ 233 tests passed
```

PWA export:

```bash
corepack pnpm --filter mobile export:pwa
```

Result:

```text
✅ Exported: dist
```

PWA deploy:

```bash
corepack pnpm --filter mobile deploy:pwa
```

Result:

```text
✅ Deployed mobile PWA dist to /home/Danu88/nginx-proxy-manager/placeholder
```

## Deployment State

Live bundle referenced by deployed `index.html`:

```text
entry-3ca6df331e7c5be146d23803d686bcb3.js
```

Deploy target:

```text
/home/Danu88/nginx-proxy-manager/placeholder
```

## Known Notes / Follow-up

1. Budget sync relies on `transaction_envelope_allocations`.
2. Unique allocation migration should remain applied in live DB:

```text
supabase/migrations/202605290001_unique_transaction_envelope_allocations.sql
```

3. `syncEnvelopeAllocationsForBudgetEnvelope(...)` currently rebuilds allocations for one envelope by deleting existing rows for that envelope and inserting matching rows again.
4. The classifier intentionally treats ambiguous `kopi` as F&B unless explicit stock/grocery terms are present, e.g. `kopi bubuk`, `kopi saset`, `kopi sachet`.
5. Mixed transaction splitting only happens when there are multiple recognizable amounts and the split clearly contains both Groceries and F&B.

## Git State

Committed and pushed:

```text
737498b fix(mobile): sync budget cycles and AI categories
```
