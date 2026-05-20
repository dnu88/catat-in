# AI Handoff — Reports Donut Chart & Mobile Test Environment

Date: 2026-05-20
Project: `/home/Danu88/catat-in`
Active app: `apps/mobile` (Expo / React Native)
Branch: `main`

## Summary

This change set improves the mobile Reports screen category donut chart and related report interactions. The final donut chart direction is **luxury finance + editorial data visualization**: clean, matte, precise, and non-neon.

The most recent refinement makes donut chart geometry more precise by calculating segment arcs from actual category amounts (`value`) instead of rounded display percentages (`percent`). The visible percentages remain rounded for readability, while the chart itself uses real proportions.

## Main Files Changed

- `apps/mobile/app/(tabs)/reports.tsx`
  - Adds exact custom date range day selection.
  - Loads extra transaction fields for category detail views.
  - Adds category detail modal for drilling into transactions by category.
  - Improves category color uniqueness.
  - Redesigns donut chart styling and geometry.
  - Adds precise amount-based donut segment calculations via category `value`.

- `apps/mobile/__tests__/reports-screen.test.tsx`
  - Adds tests for category detail modal.
  - Adds tests for refined donut visual geometry.
  - Adds test ensuring donut colors remain unique.
  - Adds test ensuring custom date range queries exact start/end days.
  - Adds test ensuring donut proportions use actual amounts, not rounded display percentages.

- `apps/mobile/jest.setup.js`
  - Adds a lightweight `global.WebSocket` mock for Node 20 test runs.
  - This fixes Supabase Realtime initialization in Jest under Node 20.

- `apps/mobile/app/_layout.tsx`
  - Adds explicit `Stack.Screen name="index"` registration.

- `apps/mobile/package.json` and `pnpm-lock.yaml`
  - Adds `@expo/ngrok` dev dependency.

## Donut Chart Implementation Notes

Current geometry constants in `reports.tsx`:

- `donutSize = 180`
- `donutRadius = 64`
- `donutStrokeWidth = 18`
- `donutGlowStrokeWidth = 21`
- `donutSegmentGap = 6`

Segment calculation:

1. Each category may have:
   - `percent`: rounded display percentage for list UI.
   - `value`: actual amount used for precise donut geometry.
2. `categoryValueTotal` is used when available.
3. If values are unavailable, code falls back to normalized percentages.
4. Segment dash length is computed from actual value ratio:
   - `rawDashLength = normalizedRatio * donutCircumference`
   - `dashLength = rawDashLength - segmentGap`
5. Offsets accumulate by full `sweepLength`, not by rounded display percent, preventing drift/overlap.

Important: keep `percent` and `value` separate. Do not “simplify” the chart back to using `percent`; that reintroduces imprecision from rounded percentages.

## Visual Design Notes

The final intended look:

- Calm matte card, not glossy/neon.
- Thin, precise segment arcs.
- Small consistent gaps.
- Flat segment caps (`strokeLinecap="butt"`) for finance-report precision.
- Very subtle glow only for depth, not a visible halo.
- Compact center value using `formatCompactRupiah()` so the label does not crowd the ring.

If another agent continues UI work, preserve this direction unless explicitly asked otherwise.

## Test / Verification Commands

Run from repo root:

```bash
pnpm --filter mobile type-check
pnpm --filter mobile test -- --runInBand --silent
```

Latest verified result before this handoff:

- Type-check: passed
- Jest: 18 suites passed, 71 tests passed

## Known Non-blocking Test Warnings

When tests are run without `--silent`, React Native test output may include warnings about:

- `act(...)` wrapping for async state updates in `ReportsScreen` tests.
- Deprecated `SafeAreaView` usage.

These warnings do not currently fail the suite.

## Suggested Next Steps

For Claude Code / Codex / Kiro:

1. Start by reading this handoff and `apps/mobile/app/(tabs)/reports.tsx`.
2. Preserve the amount-based donut geometry.
3. If changing chart visuals, update `apps/mobile/__tests__/reports-screen.test.tsx` with geometry assertions.
4. Re-run both verification commands above before marking work complete.
