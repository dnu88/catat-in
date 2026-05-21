# Mobile Report Budget Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish Reports and Budget Wallet creation according to approved option B.

**Architecture:** Keep changes localized to the Reports screen, Budget screen, and shared Kaswise icon wrapper. Existing Supabase services and data models stay unchanged.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, @testing-library/react-native, phosphor-react-native.

---

### Task 1: Lock requested UI behavior with tests
**Files:**
- Modify: `apps/mobile/__tests__/reports-screen.test.tsx`
- Modify: `apps/mobile/__tests__/budget-envelopes-screen.test.tsx`

- [ ] Add tests that assert Reports budget wallet text/button layout uses protected flex styles and line chart uses a wider proportional viewport with guide lines.
- [ ] Add tests that assert Budget Wallet icon choices include category-relevant labels and saving with Food & Beverage stores the matching icon.
- [ ] Add tests that assert color options include more than six choices and include expanded design-system compatible colors.
- [ ] Run targeted tests and verify the new assertions fail before implementation.

### Task 2: Implement shared Phosphor icon additions
**Files:**
- Modify: `apps/mobile/src/components/icons/kaswise-icons.tsx`

- [ ] Add Phosphor imports for ForkKnife, Coffee, Car, Bus, SoccerBall, GameController, FilmSlate, ShoppingCart, TrendUp, Gift, and DotsThreeCircle.
- [ ] Add stable icon names to `iconMap` without removing existing names.

### Task 3: Polish Budget Wallet create form
**Files:**
- Modify: `apps/mobile/app/(tabs)/budgets.tsx`

- [ ] Replace generic icon options with category-relevant Phosphor icon choices.
- [ ] Expand light and dark color palettes to twelve accessible, token-aligned colors.
- [ ] Keep dropdown rendering and save behavior unchanged except selected icon/color values.

### Task 4: Polish Reports budget entry and line chart
**Files:**
- Modify: `apps/mobile/app/(tabs)/reports.tsx`

- [ ] Adjust budget wallet entry layout so supporting copy cannot collide with the manage button.
- [ ] Use a proportional SVG chart viewport and guide lines.
- [ ] Keep existing testIDs and data semantics intact.

### Task 5: Verify
**Files:**
- Test: targeted Jest tests

- [ ] Run `pnpm test -- --runInBand __tests__/reports-screen.test.tsx __tests__/budget-envelopes-screen.test.tsx`.
- [ ] Run `pnpm type-check`.
