# Progress — Wave C Ext (Groups + Imports)

**Date:** 2026-05-09  
**Status:** ✅ Slice C5-C8 completed

## Checklist
- [x] Slice C5 Groups token alignment
- [x] Slice C6 Imports token alignment
- [x] Slice C7 QA + verification
- [x] Slice C8 Mobile parity entrypoints (management lanes)

## Changes
- `apps/web/src/pages/GroupsPage.tsx`
  - Hero + group header gunakan tokenized gradient (`var(--g-card)`) dan on-brand vars.
  - HeroStat + StatusBox diganti dari rgba hardcoded ke `color-mix` berbasis token.
  - Root layout diselaraskan ke `page-shell`.
- `apps/web/src/pages/ImportsPage.tsx`
  - Duplicate row highlight pakai tokenized `color-mix(var(--amber))`.
  - StatusBox tones dipindah ke tokenized `color-mix`.
  - Root layout diselaraskan ke `page-shell`.
- Mobile parity lane (Wave C ext entrypoints)
  - Tambah hidden screens: `wallets`, `budgets`, `bills`, `groups`, `imports` pada tabs router.
  - Tambah halaman mobile: `apps/mobile/app/(tabs)/wallets.tsx`, `budgets.tsx`, `bills.tsx`, `groups.tsx`, `imports.tsx`.
  - Update `apps/mobile/app/(tabs)/settings.tsx` dengan section **Wave C Management** untuk navigasi ke lane tersebut.

## QA Evidence
- Hardcoded color audit:
  - `GroupsPage.tsx` → no `#`, `rgba`, `rgb`, `hsl`
  - `ImportsPage.tsx` → no `#`, `rgba`, `rgb`, `hsl`
- Verification commands PASS:
  - `pnpm --filter @kaswise/web test`
  - `pnpm --filter @kaswise/web type-check`
  - `pnpm --filter @kaswise/web build`
  - `pnpm --filter mobile test`
  - `pnpm --filter mobile type-check`
