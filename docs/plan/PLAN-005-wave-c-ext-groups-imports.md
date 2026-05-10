# PLAN-005 — Wave C Ext (Groups + Imports)

**Date:** 2026-05-09  
**Status:** In Progress

## Objective
Lanjutkan Wave C ke lane advanced flow: `GroupsPage` dan `ImportsPage` dengan parity visual Wave B/C, token-first, dan state consistency.

## Scope
1. Groups advanced flow UI polish
2. Imports advanced flow UI polish
3. QA consistency + verification

## Execution Slices
- **Slice C5 — Groups:** hilangkan hardcoded visual remnants, samakan hero/status styling ke token vars, jaga behavior role/member/finance tab.
- **Slice C6 — Imports:** hilangkan hardcoded visual remnants, rapikan status colors + duplicate row highlight dengan semantic tokens.
- **Slice C7 — QA pass:** audit hardcoded colors + test/type-check/build.

## Exit Criteria
- Groups + Imports bebas hardcoded hex/rgba untuk visual utama.
- Styling konsisten dengan pattern Wave B/C.
- `pnpm --filter @kaswise/web test && type-check && build` pass.
