# Donut Chart and Kaswise Logo Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Reports donut colors match Expense Breakdown categories and add the Kaswise mark logo to Login and Settings.

**Architecture:** Keep `dynamicCategories` as the single category-color source in Reports. Extract a small reusable `KaswiseLogoMark` React Native component based on the design-system SVG colors/shapes, then compose it into Login and Settings without new dependencies.

**Tech Stack:** Expo Router, React Native, Jest, @testing-library/react-native, TypeScript.

---

### Task 1: Donut chart color synchronization

**Files:**
- Modify: `apps/mobile/__tests__/reports-screen.test.tsx`
- Modify: `apps/mobile/app/(tabs)/reports.tsx`

- [ ] Add a failing test asserting each donut segment color equals its matching category fill color.
- [ ] Run `pnpm --filter mobile exec jest --runInBand --no-colors apps/mobile/__tests__/reports-screen.test.tsx` and confirm the new assertion fails for non-first segments.
- [ ] Update donut rendering to use proportional wedge layers derived from `dynamicCategories`, preserving `testID=reports-donut-segment-${cat.id}` and `backgroundColor: cat.color`.
- [ ] Re-run the reports test and confirm it passes.

### Task 2: Kaswise reusable logo mark

**Files:**
- Create: `apps/mobile/src/components/brand/KaswiseLogoMark.tsx`
- Modify: `apps/mobile/__tests__/auth-login.test.tsx` or create if absent
- Modify: `apps/mobile/__tests__/settings-screen.test.tsx` or create if absent

- [ ] Write failing tests that Login and Settings render `testID="kaswise-logo-mark"`.
- [ ] Implement `KaswiseLogoMark` as layered React Native views using the design-system mark colors: gray, dark gray, deep green, and neon-to-lime accent.
- [ ] Add the component to Login above the auth hero panel and to Settings header.
- [ ] Run targeted Jest tests and confirm they pass.

### Task 3: Verification

**Files:**
- All modified files

- [ ] Run `pnpm --filter mobile type-check` and expect PASS.
- [ ] Run `pnpm --filter mobile exec jest --runInBand --no-colors` and expect PASS.
- [ ] Run `pnpm --filter mobile exec expo export --platform android --clear` and expect PASS.
