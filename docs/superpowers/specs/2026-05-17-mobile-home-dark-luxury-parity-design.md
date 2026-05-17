# Mobile Home Dark Luxury Parity Design

## Status

Approved direction from user; ready for implementation planning after user reviews this spec.

## Goal

Make the Kaswise mobile Home/Dashboard screen visually match `Kaswise Design System/ui_kits/mobile/Screens.jsx` HomeScreen with strict pixel-perfect intent, while preserving the approved Dark Luxury token system and soft neon-green usage rules.

## Source of Truth

Primary reference:

- `Kaswise Design System/ui_kits/mobile/Screens.jsx` — `HomeScreen`

Component/style references:

- `Kaswise Design System/ui_kits/mobile/Components.jsx` — `HeroBalance`, `QuickActionCard`, `SectionCard`, `TransactionRow`, `ProgressBar`, `IconBubble`
- `Kaswise Design System/colors_and_type.css`
- `Kaswise Design System/tokens.kaswise.ts`
- `apps/mobile/src/theme/tokens.ts`
- `docs/adr/ADR-0002-mobile-dark-luxury-design-tokens.md`

Current implementation targets:

- `apps/mobile/app/(tabs)/index.tsx`
- existing shared UI/theme components only where they can match the UI kit exactly or nearly exactly without widening scope.

## Approved Visual Direction

The app must keep the Dark Luxury brand direction:

- Matte black app background: `#141414`
- Dark card/surface tones: `#18181A`, `#1E1E1A`, and related tokenized surfaces
- Neon Emerald primary token: `#A3FF12`
- Soft Navy secondary token: `#4A80F0`

The primary green must remain `#A3FF12`, but its usage must be softened:

- Full `#A3FF12` is reserved for primary CTAs, active states, and important highlights.
- Most icon bubbles, borders, glows, and background tints should use controlled alpha values.
- Recommended green usage ranges:
  - background tint: `rgba(163,255,18,0.08)` to `rgba(163,255,18,0.14)`
  - border tint: `rgba(163,255,18,0.18)` to `rgba(163,255,18,0.25)`
  - glow opacity: `0.10` to `0.16`
- The UI should feel luxury/refined, not aggressively neon.

## Home/Dashboard Target Structure

The Home screen must follow this order from `Screens.jsx`:

1. Topbar
   - Greeting: `Halo, Danu`
   - Month label: `April 2026` in the reference; implementation can use localized current month only if parity checks account for text length.
   - Avatar circle: `DB`
2. Hero balance card
   - Wallet/total balance presentation from `HeroBalance`
   - Bloom effects in top-right and bottom-left
   - Stats row with three columns: `Pemasukan`, `Pengeluaran`, `Tabungan`
3. Quick action row
   - Four equal cards:
     - `Manual`
     - `AI Chat`
     - `Struk`
     - `Import`
4. Budget section card
   - Title: `Anggaran`
   - Action pill: `Lihat →`
   - Budget item: `Makan`, `77%`, `620rb / 800rb`, progress bar, and remaining copy
5. Recent transactions section card
   - Title: `Terakhir`
   - Action pill: `Semua →`
   - Rows: `Indomaret`, `Fore Coffee`, `Grab Car`
6. Daily insight card
   - Icon bubble: `lightbulb`
   - Title: `Insight harian`
   - Body copy from the reference.

## Parity Matrix Method

Implementation must create and use a parity matrix before code changes. The matrix should compare each target node against the current React Native implementation:

- element name
- target source line or component
- target dimensions/spacing
- target colors/tokens
- target typography
- target radius/border/shadow
- current implementation status
- required change
- validation method

The parity matrix may live in the implementation plan or a dedicated markdown file under `docs/plan/`.

## Component Strategy

### Topbar

Implement directly in `apps/mobile/app/(tabs)/index.tsx` unless an existing shared header can match the reference exactly. The reference topbar is simple and should not be over-abstracted.

### HeroBalance

Match the UI kit's `HeroBalance` behavior and look:

- card radius: large rounded card matching reference intent (`24` in UI kit CSS)
- card padding: reference-like `18`
- clipped bloom gradients
- stat cards with small label, bold numeric value, dark translucent tile, border, and radius
- tabular numeric styling where React Native supports it

### QuickActionCard

Use four equal cards with:

- dark card background
- `16` radius reference intent
- soft border
- vertical icon + label layout
- icon bubble size equivalent to reference `32`
- label weight and size matching reference.

### SectionCard

Budget and Recent cards should share the same surface rules:

- dark card background
- soft border
- `18` radius reference intent
- `14` padding reference intent
- title row with optional green action pill.

### TransactionRow

Rows should match the reference spacing:

- icon bubble size equivalent to `36`
- row vertical padding equivalent to `8`
- gap equivalent to `12`
- bottom divider except last row.

### Insight card

The insight card should use the reference structure and token usage:

- muted dark surface
- soft border
- radius equivalent to `16`
- `lightbulb` icon bubble with `info` tone
- title, body, and line-height matching reference.

## Motion and Interaction Requirements

The Home screen must include subtle, refined interaction behavior:

- Press states on quick actions and action pills:
  - slight scale down or opacity shift
  - no harsh bright green flash
- Hero/card entrance:
  - subtle fade/slide or staggered reveal if feasible in the existing Expo/React Native setup
  - motion should be short and quiet, not bouncy or playful
- Active/CTA glow:
  - soft green glow within approved opacity range
  - no oversized neon halos.

If the current project does not already use an animation library for this screen, use React Native primitives already available in the project rather than adding a dependency solely for this pass.

## Data and Copy Rules

The visual reference uses static demo data. The product screen may keep existing real/localized data sources only if layout remains visually aligned. For the first parity pass, implementation should prefer stable demo-like values where needed to make screenshot diff objective.

Acceptable approach:

- keep current localized language support where it does not change layout materially
- use reference labels for Indonesian Home parity baseline
- keep route behavior for action buttons where already implemented.

## Validation Requirements

Validation must combine checklist and visual diff.

### Checklist

Check at minimum:

- background and surface colors match Dark Luxury tokens
- green usage is soft and follows approved alpha ranges
- layout order matches `Screens.jsx`
- topbar spacing and avatar dimensions match reference intent
- hero card radius, padding, bloom effects, and stats row match reference intent
- quick action count, order, icon labels, and spacing match reference
- budget card structure and progress bar match reference
- recent transactions rows match reference
- insight card structure matches reference
- press states are subtle and consistent
- no slate/indigo palette regression from superseded branch `fabb395`.

### Automated/command validation

Run focused checks after implementation:

- `pnpm --filter mobile type-check`
- relevant mobile tests if affected by changed components
- screenshot capture for Home screen before/after when environment allows it.

### Visual diff

Use a side-by-side screenshot comparison for Home/Dashboard:

- reference: render/capture UI kit HomeScreen or use a stable screenshot from the visual companion/design system
- actual: current Expo/React Native Home screen
- compare layout, colors, spacing, and hierarchy
- record remaining deviations in a checklist before final acceptance.

## Out of Scope

- Transactions, Reports, Settings, Auth, Budgets full parity
- Replacing the entire mobile navigation shell
- Replacing Dark Luxury tokens with a softer green token value
- Cherry-picking `worktree-agent-a9c823aef56733597` / `fabb395` directly
- Broad design-system refactors unrelated to Home parity.

## Risks

- Pixel-perfect parity between web-style JSX reference and React Native may require translation rather than direct copy.
- Dynamic localized text can affect width and spacing; screenshot baselines should use a stable language/data setup.
- Existing shared components may be close but not exact; forcing reuse could block pixel parity.
- Adding motion without a clear acceptance threshold can cause subjective churn, so motion should stay minimal and documented.

## Acceptance Criteria

The work is acceptable when:

1. Home/Dashboard structure matches `Screens.jsx` HomeScreen.
2. Dark Luxury tokens remain intact.
3. Green remains `#A3FF12` but appears softer through controlled usage.
4. Home screenshot has no obvious visual mismatch against the reference; any remaining pixel drift is documented.
5. Type-check and relevant tests pass or any known failures are documented with cause.
6. No changes are made to unrelated screens except shared component changes that are required and verified not to regress other screens.
