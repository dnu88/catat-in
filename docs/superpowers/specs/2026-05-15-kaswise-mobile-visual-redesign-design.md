# Kaswise Mobile Visual Redesign Design

Date: 2026-05-15
Status: Approved
Scope: Entire `apps/mobile` Expo app

## Goal

Redesign the entire mobile app to match the provided Kaswise visual direction: dark navy shell, slate card surfaces, indigo primary actions, emerald positive states, rose negative states, sky accent details, and proper Phosphor iconography. The redesign must also support a polished light mode using the same semantic token system.

This is a visual-system and UI-consistency project, not a product-scope change. Existing navigation structure and business logic stay intact unless a small UI adjustment is required to make the new design coherent.

## Product Intent

The app should feel like a modern finance product with a strong Kaswise identity:
- dark mode is the hero presentation and should closely match the provided HTML mockup
- light mode should feel intentionally designed, not a washed-out inversion of dark mode
- the mobile shell should feel compact, premium, and consistent across dashboard, reports, auth, and CRUD screens
- emoji-based navigation and action iconography should be replaced with proper vector icons

## In Scope

Visual redesign for all mobile screens in `apps/mobile`, including:
- auth screens: login, register, forgot password, reset password
- main tabs: dashboard, transactions, capture, reports, settings
- hidden/detail screens: wallets, budgets, bills, groups, imports, transaction-new
- shared components and theme primitives used by those screens
- tab bar restyling and compact safe-area handling
- iconography migration to Phosphor icons
- dual theme support: `light | dark | system`

## Out of Scope

- changing backend behavior or data contracts
- adding new product features beyond minor UI affordances
- redesigning web or backend apps
- changing route structure unless required by existing navigation bugs
- introducing animations that materially complicate screen performance

## Visual Direction

### Dark Mode

Dark mode should closely follow the provided mockup:
- app background: deep navy shell
- cards and panels: elevated slate surfaces
- borders: subtle slate outlines
- primary actions and active states: indigo
- success/income: emerald
- danger/expense: rose
- secondary accent: sky blue
- typography: high contrast white and slate text hierarchy
- top-level surfaces should feel dense, premium, and deliberate rather than airy

### Light Mode

Light mode should use the same semantic structure:
- app background: soft slate-white
- cards: white
- borders: cool light slate
- primary, success, danger, and accent colors remain semantically identical
- typography should preserve Kaswise hierarchy by keeping navy text and slate-muted support text
- tinted icon bubbles and badges should remain present, but with lighter fills

## Design Tokens

The mobile theme becomes the single source of truth for both modes.

### Core palette

#### Dark
- `background`: `#0F172A`
- `surface`: `#1E293B`
- `surfaceElevated`: `#243247` or equivalent dark-raised tone
- `border`: `#334155`
- `textPrimary`: `#FFFFFF`
- `textSecondary`: `#94A3B8`
- `textMuted`: `#64748B`
- `brandPrimary`: `#6366F1`
- `success`: `#10B981`
- `danger`: `#F43F5E`
- `warning`: amber tone compatible with current system
- `accent`: `#38BDF8`

#### Light
- `background`: `#F8FAFC`
- `surface`: `#FFFFFF`
- `surfaceElevated`: `#FFFFFF`
- `border`: `#E2E8F0`
- `textPrimary`: `#0F172A`
- `textSecondary`: `#475569`
- `textMuted`: `#64748B`
- `brandPrimary`: `#6366F1`
- `success`: `#10B981`
- `danger`: `#F43F5E`
- `warning`: amber tone aligned to dark theme semantics
- `accent`: `#38BDF8`

### Derived tokens

Add or standardize semantic tokens used across screens:
- icon bubble backgrounds for primary, success, danger, accent, warning
- tab bar background
- card shadow/elevation style per mode
- muted panel background
- focus/active border color
- header background and divider color
- glass/tinted overlay tokens only if they are already practical in React Native styling

## Typography

The provided mockup uses Inter. The mobile app should align with that direction.

- prefer a clean finance-product sans hierarchy similar to Inter
- use consistent text weights rather than ad hoc per-screen choices
- standardize:
  - screen title
  - section title
  - card title
  - supporting text
  - metric values
  - chip labels
  - tab labels

If custom font loading is not already present, the implementation may keep the platform/system font temporarily while still matching size, spacing, weight, and hierarchy. The priority is consistency first, custom font second.

## Iconography

Replace emoji and text-symbol iconography with Phosphor icons.

### Required direction
- use a React Native Phosphor icon package
- use semantic icon weights or fills for active/inactive states
- use icon bubbles with tinted backgrounds to match the mockup
- avoid mixing emoji navigation with vector icon navigation after migration

### Initial icon mapping
- dashboard/home: `House`
- transactions: `ListDashes`
- capture/add: `Plus` or related creation icon inside FAB
- reports: `ChartLineUp`
- settings: `Gear`
- wallets: `Wallet`
- budgets: `ChartPieSlice` or `Wallet`
- bills: `Receipt` or `FileText`
- groups: `UsersThree`
- imports: `TrayArrowDown` or `UploadSimple`
- auth helper UI: `Lock`, `Envelope`, `Eye`, `EyeSlash`, `ArrowLeft`
- insight/AI panels: `Lightbulb`, `Robot`, or `ChartBar`

Exact icon selection can be adjusted screen-by-screen if the semantic meaning improves, but all icons must stay within the same Phosphor family.

## Shell and Navigation

### Top headers
- headers should use the new tokenized shell background
- hidden screens such as wallets, budgets, and bills keep explicit back navigation
- titles and subtitles should follow the new typography hierarchy
- action buttons in headers should adopt consistent pill/button styling

### Bottom tab bar
- compact, safe-area aware, and visually similar to the provided mockup
- navy translucent or token-equivalent background in dark mode
- tighter label/icon spacing to avoid clipping
- active state uses indigo emphasis
- inactive state uses muted slate tone
- center capture/add action should read visually as a featured action if existing tab structure allows it without route churn

If Expo Router tab constraints make a literal center floating action impractical in this pass, the tab bar should still be redesigned to strongly suggest the same hierarchy through styling. Visual fidelity is important, but routing stability wins over decorative exactness.

## Screen Treatment

### Dashboard
Dashboard should become the strongest expression of the Kaswise brand:
- hero balance card
- tinted stat cards
- premium section spacing
- recent transactions and budget summaries styled like the reference
- action cards use icon bubbles instead of emoji

### Transactions
- list rows should use proper vector icons or icon bubbles
- filters/search/actions should adopt dark card and indigo emphasis style
- list sections should feel like grouped finance records rather than generic mobile lists

### Reports
- charts and comparison tabs should follow the dark/slate visual language
- category breakdown and comparison panels must look consistent with dashboard cards
- duplicate controls already fixed should remain simplified

### Wallets, Budgets, Bills
- hidden screens adopt the same shell, card style, badge treatment, and iconography
- action buttons and filter chips should match global component styling
- top summaries should feel related to dashboard metrics

### Capture / Imports / Groups / Transaction New
- use the same card, panel, field, and action primitives
- replace any surviving emoji-driven semantics where possible
- maintain readability for dense forms and workflows

### Auth screens
- login/register/forgot/reset adopt the full Kaswise look
- dark mode should feel close to the HTML mockup’s premium finance shell
- light mode remains clean and branded
- fields, buttons, helper text, and links use shared primitives

### Settings
- expose and preserve `light | dark | system`
- theme switching should clearly reflect the new design system
- setting rows use icon bubbles and consistent card/list styling

## Components and Architecture

Implementation should prefer a design-system-first sweep rather than ad hoc per-screen edits.

### Expected shared updates
- theme token definitions
- theme mapper for light/dark modes
- shared card/button/input/icon-bubble primitives where current codebase already supports them
- reusable section header and stat-card styling helpers if needed
- bottom nav styling in tab layout

### Constraints
- do not rewrite data fetching or business logic to chase visual polish
- do not add speculative abstraction beyond what is required to avoid duplicated styling chaos
- if a screen has large inline styles, targeted extraction into shared helpers is allowed when it directly improves consistency

## State and Theme Behavior

- theme provider continues to support `light | dark | system`
- default preference may remain `system`
- all screen colors should flow from tokens, not hardcoded hex values in screen files
- any remaining hardcoded color should be treated as a bug during implementation unless required by a one-off chart or asset

## Error and Edge Handling

- icons must degrade gracefully if a specific icon choice changes during implementation
- screen contrast must remain accessible in both modes
- chip/button/background combinations must preserve legibility in active and disabled states
- forms and charts must remain readable under both themes
- safe-area spacing should prevent bottom navigation overlap and icon clipping

## Verification

### Automated
- `pnpm --filter mobile type-check`
- `pnpm --filter mobile exec jest --runInBand`
- `pnpm --filter mobile exec expo export --platform web --output-dir <check-dir>`

### Manual
- inspect dashboard, transactions, reports, settings, wallets, budgets, bills, and auth screens
- verify dark mode and light mode both render coherently
- confirm bottom nav labels and icons are not clipped
- confirm back navigation remains present on hidden screens
- confirm no obvious leftover emoji navigation or mismatched card styles remain

## Recommended Implementation Order

1. add Phosphor icon dependency and shared icon mapping
2. update theme tokens for dark + light Kaswise modes
3. restyle global shell and tab bar
4. convert shared primitives/components
5. apply redesign to auth screens
6. apply redesign to main tabs
7. apply redesign to hidden/detail screens
8. verify dark/light behavior and build output

## Trade-off Notes

This plan intentionally favors consistency over pixel-perfect reproduction of every HTML detail. The provided mockup is desktop/web-oriented in parts, while the target app is Expo mobile. The implementation should preserve the mockup’s identity—palette, hierarchy, iconography, premium card treatment, and navigation emphasis—while adapting it responsibly to mobile constraints.

## Approval Record

Approved by user with these decisions:
- full match of provided Kaswise visual direction
- apply to entire mobile app
- use real Phosphor icons
- include auth screens
- include both dark mode and light mode
