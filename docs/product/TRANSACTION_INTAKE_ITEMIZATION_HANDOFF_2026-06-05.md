# Transaction Intake Itemization & Category Handoff — 2026-06-05

Status: **live and working on `https://kaswise.com`**.

This document records the manual transaction date picker, AI text intake, itemized receipt, and item-level category improvements shipped after the Photo Receipt MVP.

## Scope shipped

This release improves every active transaction intake path that is currently exposed in the mobile/PWA app:

```text
Manual transaction → iOS-style date wheel → save/edit transaction
Capture AI → Teks/Text → parse one or more transactions → save transactions
Capture AI → Foto/Photo → OCR receipt → itemized preview → confirm → save one transaction per item
```

Current behavior:

- Manual transaction date input is now an iOS-style wheel picker.
- AI text capture can parse explicit dates and multiple transactions from one note.
- Receipt photo capture no longer saves only the receipt total when items are available.
- Receipt items are converted into separate transaction drafts.
- Item-level categories are inferred from product names before merchant fallback.
- Convenience-store merchants such as Indomaret/Alfamart no longer force every item into Groceries/Belanja Bulanan.
- New default category **Household & Personal Care / Rumah & Perawatan** is available in manual transactions and budget wallet/category visual menus.

## Main files

- `apps/mobile/app/(tabs)/transaction-new.tsx`
  - Manual transaction create/edit form.
  - iOS-style date wheel picker: **Year/Tahun | Month/Bulan | Date/Tanggal**.
  - New category fallback/icon support for Household & Personal Care.
- `apps/mobile/app/(tabs)/capture.tsx`
  - Text capture multi-transaction save flow.
  - Receipt preview now renders multiple item drafts.
  - Receipt confirm now saves all item drafts as separate image transactions.
- `apps/mobile/src/services/transaction-classifier.ts`
  - Local AI text classifier.
  - Explicit date parsing and date stripping.
  - Multi-transaction segmentation.
  - Household/personal-care and convenience-store product keyword rules.
- `apps/mobile/src/services/receipt-intake.ts`
  - Receipt extraction normalization.
  - Itemized draft conversion.
  - Quantity/price/total handling.
  - Receipt total reconciliation.
  - Product-category normalization hook.
- `apps/mobile/src/services/receipt-item-categorizer.ts`
  - Item-level category rules used by receipt flow.
  - Merchant fallback only when product name is unclear.
- `apps/mobile/src/services/category-taxonomy.ts`
  - Canonical category list.
  - New `household_personal_care` category.
- `apps/mobile/src/components/icons/kaswise-icons.tsx`
  - New `household` icon alias.
- `apps/mobile/src/theme/category-visuals.ts`
  - Visual metadata for Household & Personal Care.
- `apps/mobile/app/(tabs)/budgets.tsx`
  - Budget wallet icon/category menu includes Household & Personal Care.
- `backend/app/services/ai_service.py`
  - Backend AI prompts updated for item-level receipt categories.
  - Backend local fallback updated to canonical category ids and minimarket item rules.

## Product behavior details

### 1. Manual transaction date wheel

The previous manual date text field was replaced with a wheel picker that matches the requested iOS timer-picker style:

- Three independent wheels.
- Order: **Year/Tahun | Month/Bulan | Date/Tanggal**.
- Center highlight row.
- Opacity and font-size tiers around the selected row.
- Smooth snap scrolling.
- Repeated wheel values to approximate infinite scrolling.
- Date is still stored as ISO `YYYY-MM-DD`.
- Day values clamp correctly when month/year changes.

Primary file:

- `apps/mobile/app/(tabs)/transaction-new.tsx`

### 2. AI text dates and multiple transactions

Text capture now supports date mentions and multiple transaction drafts from one input.

Examples:

```text
Beli kopi 30rb di Indomaret point tanggal 01 Juni 2026
→ date: 2026-06-01
→ description/note: Beli kopi di Indomaret point
→ amount: 30000
```

```text
Sarapan Bubur Ayam 20rb dan makan siang di warteg 25rb
→ creates 2 transactions
```

Supported date forms include:

- `01 Juni 2026`
- `tanggal 01 Juni 2026`
- `tgl 2/6/2026`
- `2/6/2026`

Important normalization behavior:

- Parsed amounts are removed from description/note.
- Parsed dates are removed from description/note.
- Date-year numbers are not treated as transaction amounts.
- Merchant inference still supports `di`, `ke`, and `dari` phrases.

Primary files:

- `apps/mobile/src/services/transaction-classifier.ts`
- `apps/mobile/src/services/transaction-classifier.test.ts`
- `apps/mobile/app/(tabs)/capture.tsx`

### 3. Receipt itemization

Receipt photo capture now prefers itemized transactions when OCR returns item lines.

Previous behavior:

```text
Receipt total → one transaction
```

New behavior:

```text
Receipt items → one transaction per item
```

Each item draft includes:

- item name as transaction description
- amount
- quantity when available
- item-level category
- merchant
- date
- receipt metadata fields
- AI confidence/review fields

Total reconciliation:

- If OCR returns `total_amount`, the sum of item transactions is reconciled to match the receipt total.
- If item line totals and unit prices differ, the client chooses the interpretation closest to the receipt total.
- Any remaining difference is applied to the largest item so total saved transactions match the receipt total.

Primary files:

- `apps/mobile/src/services/receipt-intake.ts`
- `apps/mobile/src/services/receipt-intake.test.ts`
- `apps/mobile/app/(tabs)/capture.tsx`

### 4. Item-level category rules

A new receipt item categorizer was added so category selection starts from the product name, not from the merchant.

Examples for Indomaret/Alfamart/minimarket receipts:

| Item text | Category |
|---|---|
| `AQUA 600ML`, `Teh Pucuk`, `Sari Roti`, `Chitato`, `Indomie`, `Susu` | Food & Beverage / Makan & Minum |
| `Sabun Lifebuoy`, `Shampoo`, `Odol`, `Deterjen`, `Tisu`, `Pembalut`, `Popok` | Household & Personal Care / Rumah & Perawatan |
| `OBH Combi`, `Vitamin`, `Panadol`, `Hansaplast` | Health / Kesehatan |
| `Pulsa`, `Token Listrik`, `Paket Data` | Bills / Tagihan |
| `Beras`, `Minyak Goreng`, `Telur`, `Gula`, `Bahan Dapur` | Groceries / Belanja Bulanan |

Fallback order:

```text
item keyword → AI item category → receipt fallback category → minimarket merchant fallback → Other expenses
```

Security/product intent:

- Merchant is no longer allowed to override clear item-level product signals.
- Minimarket merchant fallback remains useful only when item names are unclear.
- Unclear/fallback cases remain reviewable through existing confidence/review fields.

Primary files:

- `apps/mobile/src/services/receipt-item-categorizer.ts`
- `apps/mobile/src/services/receipt-item-categorizer.test.ts`
- `apps/mobile/src/services/receipt-intake.ts`
- `backend/app/services/ai_service.py`

## Category taxonomy changes

### New category

Canonical id:

```text
household_personal_care
```

Labels:

- Indonesian: `Rumah & Perawatan`
- English: `Household & Personal Care`

Purpose:

- Cleaning supplies.
- Toiletries.
- Household hygiene.
- Personal-care daily needs.

Examples:

- soap/sabun
- shampoo/sampo
- toothpaste/odol/pasta gigi
- detergent/deterjen/detergen
- tissue/tisu
- pads/pembalut
- diapers/popok

Icon:

```text
household
```

The category is default-taxonomy backed, so it is inserted for users via the existing `listCategories()` missing-default sync path.

### Menus updated

The category/icon is available in:

- Manual transaction create/edit category chips.
- Budget wallet category selection.
- Budget wallet icon picker.
- Category visual resolver.

## Backend AI prompt changes

Backend AI prompts now use the canonical mobile category ids:

```text
food_beverage, groceries, household_personal_care, personal_shopping,
transport, bills, health, entertainment, education, sport,
gifts_donations, other_expenses, salary, bonus, freelance
```

Receipt prompt now explicitly instructs the model:

- Extract all receipt line items, not only total.
- Add a category for each item.
- Do not categorize every minimarket item as groceries.
- Use product-name category examples for minimarket receipts.
- Keep `total_amount` equal to final receipt total after discounts/taxes/fees.

Backend local fallback also recognizes household/personal-care, food/beverage convenience products, bills, health, groceries, and other canonical categories.

## Security posture

The release preserves the transaction intake security baseline:

- User confirmation remains required before receipt transactions are saved.
- Receipt upload/OCR still requires authenticated Supabase session.
- Receipt MIME/size validation remains enforced client-side.
- Backend AI endpoint remains authenticated and rate-limited.
- Client still does not mutate wallet balances directly.
- Receipt storage upload remains best-effort due existing Supabase Storage RLS follow-up.
- New category logic is deterministic local normalization, not a new privileged backend surface.

## QA and validation

Validation performed before production deploy:

```bash
git diff --check
python3 -m py_compile backend/app/services/ai_service.py
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath \
  src/services/receipt-item-categorizer.test.ts \
  src/services/receipt-intake.test.ts \
  src/services/transaction-classifier.test.ts \
  __tests__/transaction-new-edit-mode.test.tsx \
  __tests__/capture-envelope-suggestion.test.tsx \
  --runInBand
```

Notes:

- The combined focused test run passed for receipt/category/classifier/capture paths.
- `transaction-new-edit-mode.test.tsx` showed one transient/flaky failure once when grouped, then passed standalone `11/11`.
- Backend Python syntax compile passed.
- Mobile type-check passed.

Production deploy verification:

- PWA live bundle:
  - `_expo/static/js/web/entry-b8b71560be37cfc4da9ed75c5a701d8c.js`
- Backend health:
  - `https://api.kaswise.com/health`
  - `{"status":"ok","version":"0.1.0","environment":"production"}`
- Backend container:
  - `kaswise-backend` healthy

## Commits

This handoff covers these shipped commits:

- `0d28260 feat(mobile): itemize receipt and date intake flows`
- `4430ace feat(mobile): refine item category rules`

Both were pushed to:

```text
origin/ops/hardening-bundle
```

Production was deployed from this branch state.

## Known limitations / follow-up

1. **Receipt preview fields are not editable yet**
   - Current preview shows extracted/itemized drafts and requires confirm.
   - Follow-up: allow editing amount/category/date/merchant/description per item before save.

2. **Receipt storage upload remains best-effort**
   - `receipt_url` can still be `null` if Supabase Storage RLS rejects upload.
   - Follow-up: audit/repair `receipts` bucket policies.

3. **Raw extraction payload still not stored**
   - Avoided due legacy `ai_extracted boolean` compatibility.
   - Follow-up: add safe JSONB column, e.g. `ai_extracted_payload`.

4. **Rule dictionary is intentionally conservative**
   - More product aliases/brands can be added as live receipt examples appear.
   - Prioritize high-confidence exact product names to avoid over-categorization.

5. **Web legacy category mappings were not expanded in this release**
   - The live PWA/mobile path is covered.
   - If the web app transaction/budget pages become active again, mirror taxonomy additions in `apps/web`.

## Future QA checklist

For future changes in manual/text/receipt intake:

```bash
python3 -m py_compile backend/app/services/ai_service.py
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath \
  src/services/receipt-item-categorizer.test.ts \
  src/services/receipt-intake.test.ts \
  src/services/transaction-classifier.test.ts \
  __tests__/capture-envelope-suggestion.test.tsx \
  __tests__/transaction-new-edit-mode.test.tsx \
  --runInBand
corepack pnpm --filter mobile export:pwa
```

Live PWA checklist:

1. Hard refresh / reopen PWA.
2. Login.
3. Manual transaction:
   - confirm date wheel appears.
   - confirm Year/Month/Date order.
   - confirm Household & Personal Care category appears.
4. Capture AI → Text:
   - `beli sabun lifebuoy 18000 di Indomaret` → Household & Personal Care.
   - `beli aqua dan roti 25000 di Indomaret` → Food & Beverage.
   - date mention saves correct date.
   - one note with two amounts creates two transactions.
5. Capture AI → Photo:
   - process minimarket receipt.
   - confirm preview shows itemized drafts.
   - confirm food/drink, household care, health, bills, and groceries items are separated where applicable.
   - confirm saved transaction total equals receipt total.

