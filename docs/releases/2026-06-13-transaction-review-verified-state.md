# Release Report — 2026-06-13

- **Area:** Mobile transaction review / notification flow
- **Branch:** `main`
- **Scope:** prevent reviewed transactions from reappearing in review surfaces
- **Verification:** `pnpm exec jest src/services/transaction-review.test.ts __tests__/transaction-new-edit-mode.test.tsx __tests__/transactions-swipe-actions.test.tsx --runInBand` and `pnpm exec tsc --noEmit --pretty false`

## Summary

Mobile transaction review logic now respects the final verified state of a transaction. Transactions that have already been reviewed are no longer counted as reviewable just because they still carry historical `review_required` or low-confidence metadata.

## Files changed

- `apps/mobile/src/services/transactions.ts`
- `apps/mobile/src/services/transaction-review.ts`
- `apps/mobile/app/(tabs)/transactions.tsx`
- `apps/mobile/app/(tabs)/capture.tsx`
- `apps/mobile/app/(tabs)/transaction-new.tsx`
- `apps/mobile/src/services/transaction-review.test.ts`
- `apps/mobile/__tests__/transaction-new-edit-mode.test.tsx`
- `apps/mobile/__tests__/transactions-swipe-actions.test.tsx`

## Notes

- Capture/manual flows now persist `is_verified` alongside `review_required`.
- Review summary and transaction review CTA now exclude verified rows.
- Added regression tests for verified transactions being ignored by review surfaces.
