# ADR-0002: Mobile Dark Luxury Design Tokens

## Status

Accepted

## Date

2026-05-17

## Context

The repository contains multiple historical Claude Code/worktree branches that attempted to align mobile theme tokens. One unmerged branch, `worktree-agent-a9c823aef56733597` (`fabb395 feat(mobile): align Kaswise theme tokens`), conflicts with current `main` in:

- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/theme/mobile-theme.ts`
- `apps/mobile/src/theme/mobile-theme.test.ts`

That branch uses an older/alternate slate-indigo token direction, including values such as:

- `#0F172A`
- `#6366F1`
- `#10B981`
- `#F43F5E`

The current brand/design source is the checked-in Kaswise Design System folder, especially:

- `Kaswise Design System/colors_and_type.css`
- `Kaswise Design System/tokens.kaswise.ts`
- `Kaswise Design System/preview/*`
- `Kaswise Design System/assets/palette-dark-luxury.png`

The design system explicitly defines **Dark Luxury** as the canonical brand direction:

- Matte Black ground / app background: `#141414`
- Surface Grey cards / UI elements
- Neon Emerald primary: `#A3FF12`
- Soft Navy secondary: `#4A80F0`

It also notes that the product code source of truth is `mobile/src/theme/tokens.ts`.

## Decision

Kaswise mobile must preserve the **Dark Luxury** token system from `Kaswise Design System/`.

Therefore:

1. `apps/mobile/src/theme/tokens.ts` remains the product-code source of truth for mobile tokens.
2. Mobile token changes must match the Dark Luxury design system, not the older slate/indigo branch palette.
3. The unmerged `fabb395` branch must **not** be cherry-picked directly.
4. If useful improvements exist in `fabb395`, only non-conflicting structural improvements may be manually ported after verifying they preserve Dark Luxury values and current token shape.
5. Tests in `apps/mobile/src/theme/mobile-theme.test.ts` should lock the Dark Luxury expectations, not the older slate/indigo values.

## Consequences

- Conflicts in `mobile-theme.ts`, `tokens.ts`, and `mobile-theme.test.ts` should be resolved in favor of current Dark Luxury `main` unless there is a specific design-system-backed reason to change a token.
- The branch `worktree-agent-a9c823aef56733597` is treated as superseded for palette/token values.
- Future UI branches that replace Dark Luxury tokens with slate/indigo values should be rejected or manually adapted.
- Visual QA should compare mobile screens against `Kaswise Design System/preview/*` and `Kaswise Design System/ui_kits/mobile/*` rather than old branch snapshots.

## Related

- `docs/plan/REPORT-009-branch-progress-claude-code-2026-05-17.md`
- `docs/plan/REPORT-010-parallel-integration-execution-2026-05-17.md`
- `Kaswise Design System/colors_and_type.css`
- `Kaswise Design System/tokens.kaswise.ts`
