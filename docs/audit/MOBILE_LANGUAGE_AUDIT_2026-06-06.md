# Mobile Language Consistency Audit

Date: 2026-06-06
Scope: `apps/mobile` PWA screens and components touched in the report-period/dashboard work

## Purpose

Audit ini memastikan copy pada perubahan terbaru mengikuti bahasa aplikasi yang dipilih user (`id` atau `en`). Fokusnya bukan menerjemahkan seluruh database/user content, tetapi memastikan UI controls dan accessibility labels yang dikendalikan aplikasi tidak tertinggal hardcoded pada bahasa yang salah.

## Screens checked

```text
apps/mobile/app/(tabs)/index.tsx
apps/mobile/app/(tabs)/reports.tsx
apps/mobile/app/(tabs)/transactions.tsx
apps/mobile/app/(tabs)/settings.tsx
apps/mobile/src/components/FinanceContextSwitcher.tsx
```

## Findings and fixes

### Dashboard

Status: pass.

Checked/fixed:

- `Manage` uses `Kelola` in Indonesian.
- Recent section uses `Terakhir / Recent`.
- Transaction list CTA uses `Semua → / All →`.
- Nominal privacy toggle a11y is bilingual.
- Theme toggle a11y is bilingual.
- Hero no longer has permanent explanatory subtitle, reducing duplicate copy.

### Reports

Status: pass for touched areas.

Checked/fixed:

- Saved period section copy is bilingual.
- Active-period banner copy is bilingual.
- Reset to current month uses `Bulan ini / This month`.
- Saved rule management labels are bilingual.
- Share/manage/category/chart accessibility labels are bilingual.

### Transactions

Status: pass for touched areas.

Checked/fixed:

- Report period card uses `Periode laporan / Report period`.
- Period filter chips use `Laporan/Minggu/Bulan/Tahun` and `Report/Week/Month/Year`.
- Existing filter labels remain bilingual.

### Settings

Status: pass for current scope.

Checked/fixed:

- `Tampilan / Appearance` section removed.
- Language setting remains available and tested.
- Logout and notifications remain bilingual in existing code path.

### FinanceContextSwitcher

Status: pass.

Checked/fixed:

- `Profile` caption now uses `Profil` when language is Indonesian.
- Existing personal/family labels already followed language.

## Non-issues

The following are intentionally not translated by UI code:

- User-created rule names.
- Merchant names.
- Category names saved in transaction data, except where taxonomy localization already exists.
- Household/family names.
- Profile/avatar preset labels that represent content names.

## Recommended next language QA

1. Switch app to Indonesian, reload PWA, check Dashboard → Reports → Transactions → Settings.
2. Switch app to English, reload PWA, repeat same route.
3. Create a saved period rule in Indonesian, switch to English, verify system UI changes while the user-created rule name remains unchanged.
4. Check screen reader labels for icon-only controls:
   - Dashboard nominal visibility
   - Dashboard theme toggle
   - Reports saved rule actions

## Validation hooks

Focused tests that cover language-sensitive areas:

```bash
corepack pnpm --filter mobile test -- --runTestsByPath \
  __tests__/tabs-index.test.tsx \
  __tests__/reports-screen.test.tsx \
  __tests__/transactions-swipe-actions.test.tsx \
  __tests__/settings-screen.test.tsx \
  --runInBand
```
