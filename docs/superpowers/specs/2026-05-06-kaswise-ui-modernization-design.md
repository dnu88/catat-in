# Kaswise UI Modernization Design (Pixel-Close)

**Date:** 2026-05-06  
**Status:** Approved (design), pending implementation plan  
**Reference Mockups:**
- `Mockup Design/Kaswise Dark Mode.png`
- `Mockup Design/Kaswise Light Mode.png`

## 1. Objective
Modernize UI for **both platforms** (`apps/mobile` and `apps/web`) to match mockup direction with **pixel-close fidelity**, using a shared design system and dual theme support (dark + light).

## 2. Scope
### In Scope
- Full UI modernization across all active screens in mobile + web.
- Shared foundation tokens/components.
- Dark mode and light mode parity.
- Screen coverage including core + advanced flows (auth, dashboard, capture, transactions, reports, settings, wallets, budgets, bills, groups, import flows, and related states).

### Out of Scope
- Feature behavior redesign.
- Backend/data model changes (except minimal UI integration needs).

## 3. Chosen Approach
Selected approach: **Option A — Design System First, then mass rollout**.

Why:
- Highest consistency for full-app modernization.
- Lowest rework when applying to all screens.
- Best way to keep web and mobile visually aligned.

## 4. Foundation Design System
### 4.1 Brand Direction
- Fintech premium visual language.
- Clean, high-contrast layout.
- Pixel-close to provided mockups.

### 4.2 Theme Requirement
- Mandatory support for:
  - `dark`
  - `light`
- Same token structure for both themes.

### 4.3 Color Token Families
- Indigo (primary)
- Deep Navy (dark surfaces/nav)
- Emerald (positive values)
- Red/Orange (negative/expense)
- Sky Blue (support/info)
- Slate/Gray scale (text/border/background)

### 4.4 Token Structure
- `color.bg`, `color.surface`, `color.card`, `color.border`
- `color.text.primary|secondary|muted|inverse`
- `color.brand.primary|accent`
- `color.status.success|danger|warning|info`
- Shared spacing scale: `4/8/12/16/20/24/32`
- Shared radii/shadows/typography scale

### 4.5 Typography & Shape
- Consistent heading/body/caption scale.
- Rounded modern surfaces (medium-large radius).
- Subtle elevation and border contrast, theme-aware.

## 5. Base Component Set (must build first)
1. **App Shell**
   - Web: sidebar + topbar
   - Mobile: header + bottom tab bar
2. **Navigation**
   - `NavItem`, `SidebarSection`, `TabItem`, `ProfileMenu`
3. **Surface**
   - `Card`, `Panel`, `WidgetContainer`, `ChartCard`
4. **Data Display**
   - `StatTile`, `TransactionRow`, `CategoryLegend`, `BudgetProgress`, `InsightBanner`
5. **Form System**
   - Inputs/select/date/amount/buttons/toggle/segmented mode switcher
6. **Feedback**
   - `EmptyState`, `ErrorState`, `Skeleton`, `Toast`, `SnackbarUndo`, `ProcessingStatusCard`
7. **Overlay**
   - `Modal`, `BottomSheet`, `ConfirmDialog`, `ActionSheet`
8. **Theme Infra**
   - Single source token map for web + mobile consumption

## 6. Implementation Waves
### Wave 1 — Foundation Rollout
Apply app shell + tokenized base components globally.

### Wave 2 — Core Screens
Auth, Dashboard, Capture (4 modes), Transactions, Reports, Settings.

### Wave 3 — Finance Management
Wallets, Budgets, Bills, Categories, related management screens.

### Wave 4 — Group & Advanced
Groups, Import preview/confirm, advanced list/filter experiences.

### Wave 5 — State Polish
Loading/error/empty, undo flows, modal consistency, dark/light parity pass.

### Wave 6 — Pixel-Close QA
Fine tune spacing, color, typography, iconography, and component parity vs mockups.

## 7. Pixel-Close QA Rules
- Layout tolerance: spacing/radius deviation max ±2px.
- All colors must come from tokens.
- Typographic hierarchy must remain consistent across screens.
- Component visuals must be reused consistently (no one-off divergence).
- Both dark and light themes must pass visual parity.

## 8. Definition of Done
### Per Screen DoD
- Uses new base components.
- Dark + light complete.
- Empty/loading/error states implemented.
- Platform responsiveness validated.
- Pixel-close checklist passed.

### Global DoD
- All active screens migrated.
- No visual collision with legacy components.
- Visual QA passes web + mobile.
- No core functional regressions during modernization.

## 9. Risks & Mitigation
- **Scope too large** → strict wave-based rollout.
- **Inconsistent component usage** → enforce base component-first policy.
- **Theme mismatch** → dual-theme QA in every wave, not at the end only.
- **Regression under heavy refactor** → verify per wave before merging next.

## 10. Next Step
Create execution plan from this design and begin implementation in wave order.
