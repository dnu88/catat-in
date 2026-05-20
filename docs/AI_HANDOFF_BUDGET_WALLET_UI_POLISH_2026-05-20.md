# AI Handoff — Budget Wallet UI Polish

Date: 2026-05-20
Repo: `C:\Users\ThinkPad\catat-in-dev-setup\kaswise`
Branch: `main`
Latest pushed commit: `8aff9d3 fix(mobile): polish budget wallet UI`
Remote: `origin/main`

## Context

The previous Budget Envelopes feature was implemented and pushed. After visual review, the user requested UI/content polish:

1. Replace all visible wording "amplop" with "dompet".
2. Ensure the budget wallet menu follows the selected app language.
3. Replace free-text icon input with Phosphor icon dropdown options.
4. Replace free-text color input with theme-aware color choices for light/dark themes.
5. Polish the Reports donut chart so the circle is precise and neat.

## Files Changed in Latest Commit

- `apps/mobile/app/(tabs)/budgets.tsx`
- `apps/mobile/app/(tabs)/capture.tsx`
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/app/(tabs)/reports.tsx`
- `apps/mobile/__tests__/budget-envelopes-screen.test.tsx`
- `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx`
- `apps/mobile/__tests__/reports-screen.test.tsx`
- `apps/mobile/__tests__/tabs-index.test.tsx`

## Implemented Changes

### 1. Terminology: Amplop → Dompet

Visible UI copy was updated from "Amplop/amplop" to "Dompet/dompet" or English equivalents.

Important areas updated:

- Budget management screen
- Home budget alert section
- Capture success suggestion card
- Reports budget management entry point
- Tests that assert visible text

Note: service/file names still use `budget-envelopes` internally. This was intentionally left unchanged to avoid a larger refactor. Only user-facing copy was changed.

### 2. Budget Wallet Screen i18n

`apps/mobile/app/(tabs)/budgets.tsx` now uses `useI18n()` and defines local `tx` copy for Indonesian and English.

Indonesian examples:

- `Dompet Aktif`
- `Buat dompet budget`
- `Nama dompet`
- `Simpan dompet`
- `Review hanya di Reports/Dompet`

English examples:

- `Active Wallets`
- `Create budget wallet`
- `Wallet name`
- `Save budget wallet`
- `Review only in Reports/Wallets`

Tests now include language-aware coverage by rendering the screen in English and asserting English wallet copy while ensuring `Amplop` is absent.

### 3. Phosphor Icon Dropdown

The previous free-text icon input was replaced with a dropdown-style picker in `budgets.tsx`.

Implementation details:

- Uses `KaswiseIcon` from `apps/mobile/src/components/icons/kaswise-icons.tsx`.
- Icon options are typed as `KaswiseIconName`.
- Current options:
  - `wallets`
  - `budgets`
  - `bills`
  - `card`
  - `chart`
  - `insight`
- Test IDs:
  - `budget-wallet-icon-dropdown`
  - `budget-wallet-icon-options`

When saving, the selected icon value is passed to `createBudgetEnvelope` as `icon`.

### 4. Theme-Aware Color Choices

The previous free-text color input was replaced with selectable color swatches.

Implementation details:

- Light palette:
  - `#4A80F0`
  - `#65A30D`
  - `#B45309`
  - `#DC2626`
  - `#7C3AED`
  - `#0F766E`
- Dark palette:
  - `#4A80F0`
  - `#A3FF12`
  - `#F59E0B`
  - `#FF7B7B`
  - `#A78BFA`
  - `#2DD4BF`
- Palette is chosen based on `theme.mode`.
- Test IDs:
  - `budget-wallet-color-dropdown`
  - `budget-wallet-color-options`
  - `budget-wallet-color-<hex>` e.g. `budget-wallet-color-#65A30D`

When saving, the selected color is passed to `createBudgetEnvelope` as `color`.

### 5. Home Budget Alert Copy

`apps/mobile/app/(tabs)/index.tsx` now uses `useI18n()` for the budget wallet alert copy.

Indonesian:

- `Dompet aktif yang perlu perhatian`
- `<name> hampir habis`
- `<name> lewat budget`

English:

- `Active budget wallet needs attention`
- `<name> almost used up`
- `<name> over budget`

The alert remains data-driven through:

- `listBudgetEnvelopes`
- `listEnvelopeAllocations`
- `buildEnvelopeProgress`
- `getEnvelopeStatus`
- `getHomeEnvelopeAlerts`

### 6. Capture Suggestion Copy

`apps/mobile/app/(tabs)/capture.tsx` now uses `useI18n()` for budget wallet suggestion text.

Indonesian:

- `Dompet`
- `Rp17.000 tersisa setelah transaksi ini`
- `Perlu cek di Reports`

English:

- `Budget Wallet`
- `Rp17.000 left after this transaction`
- `Needs review in Reports`

Persistence behavior remains unchanged:

- If `transaction.envelope_suggestion` has an `envelope_id` or `id`, `createEnvelopeAllocation` is called once.
- Persistence failure is caught/logged and does not block the success flow.

### 7. Reports Entry Copy

`apps/mobile/app/(tabs)/reports.tsx` now uses localized copy for the budget wallet entry.

Indonesian:

- `Dompet`
- `Budget personal seperti Kopi, Ojol, dan Nongkrong.`
- `Kelola`

English:

- `Budget Wallets`
- `Personal budgets like Coffee, Ride-hailing, and Hangout.`
- `Manage`

The manage action still routes to:

```ts
router.push('/(tabs)/budgets' as never)
```

### 8. Donut Chart Precision Polish

Reports donut chart in `apps/mobile/app/(tabs)/reports.tsx` was adjusted so the SVG/chart container is a precise square and centered.

Key changes:

- `donutSize` remains `180`.
- `donutChart` style changed to exact `180 x 180`, `borderRadius: 90`.
- `donutSvg` style now uses explicit positioning:
  - `top: 0`
  - `left: 0`
  - `width: 180`
  - `height: 180`
- `ringInner` is positioned at:
  - `top: 41`
  - `left: 41`
  - `width: 98`
  - `height: 98`
- Added `accessibilityLabel` to `reports-donut-svg` containing the effective viewBox string for testability.

Test coverage verifies:

- SVG width equals height.
- Effective viewBox matches square dimensions.
- Glow ring has equal breathing room on left and right.
- `cx` and `cy` remain equal.

## Verification

Commands run after implementation:

```bash
pnpm --filter mobile exec jest --runInBand --no-colors
pnpm --filter mobile type-check
```

Results:

- Jest: `22 passed, 22 total`; `95 passed, 95 total`.
- Type-check: passed (`tsc --noEmit`).

Known non-blocking warning:

- Some Home tests still emit React `act(...)` warnings related to async `setEnvelopeAlerts` in `DashboardScreen`. The suite passes and this warning existed during the budget wallet work. It is safe to clean up later by wrapping async state resolution in tests.

## Git State

After the latest push:

```bash
git status --short --branch
# ## main...origin/main
```

Latest commits:

```bash
8aff9d3 (HEAD -> main, origin/main, origin/HEAD) fix(mobile): polish budget wallet UI
285f62d (feature/budget-envelopes) fix(mobile): complete budget envelope MVP flow
3ba31dd feat(mobile): show capture envelope suggestion
```

## Suggested Next Steps for Another AI Model

1. Pull latest `origin/main`.
2. Run:
   ```bash
   pnpm install
   pnpm --filter mobile type-check
   pnpm --filter mobile exec jest --runInBand --no-colors
   ```
3. If continuing UI polish, inspect these files first:
   - `apps/mobile/app/(tabs)/budgets.tsx`
   - `apps/mobile/app/(tabs)/reports.tsx`
   - `apps/mobile/app/(tabs)/index.tsx`
   - `apps/mobile/app/(tabs)/capture.tsx`
4. If doing a deeper terminology refactor, consider whether to rename internal `budget-envelopes` service/schema terms. This was not done because the latest request was about visible UI wording.
5. If improving tests, prioritize removing the existing React `act(...)` warnings in `tabs-index.test.tsx` / Home alert tests.
