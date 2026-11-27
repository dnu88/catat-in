# ADR-0004: Finance Editorial Surfaces (Light-First Navy Identity)

## Status

Accepted

## Date

2026-09-25

## Context

Quiet Ledger (ADR-0003) removed the AI-slop patterns: nested cards, marketing copy inside operational screens, duplicated capture entry points, and lime used as decoration. Reviewing the result against the product reference, the remaining gap was compositional rather than structural: the app still read as a charcoal dashboard with rounded card boxes.

The target direction is the finance-editorial composition used by modern personal-finance apps:

- wallet-blue canvas for the balance/hero region, with deep navy reserved for controls and wallet depth,
- a light content sheet that rises over the hero,
- grouped rounded surfaces instead of borders and dividers,
- restrained typography driven by size and space, not by weight,
- one dark primary action per screen,
- category analytics expressed as bubble proportions.

Kaswise keeps its own identity: Indonesian copy, wallet/budget/transaction domain, AI capture behind the interface, tonal blue as the visual accent, muted teal for income, semantic green only for success, and red only for danger or adverse states.

## Decision

1. Introduce `src/theme/finance-editorial.ts` as the shared surface palette: navy-to-electric-blue hero gradient, translucent blue wallet surfaces, warm paper and white surfaces, ink/slate/muted text, and semantic income/expense tones.
2. Dashboard renders as `canvas (wallet blue) + sheet (paper/white)`; operational screens render on paper/white grouped surfaces, not as stacks of bordered cards.
3. Primary actions are ink/navy on a light surface, or white on navy for the hero region. Lime is reserved for positive deltas and success only.
4. Grouped rows replace per-card chrome in Settings. Section labels are uppercase muted; rows are white capsules.
5. Appearance (system/light/dark) lives in Settings, not on the dashboard. Dashboard authorises one privacy toggle and no theme control.
6. Bottom navigation is a floating rounded pill inside the safe area, with icon-only targets and a circular capture action.
7. Reports uses a thick glossy tonal-blue donut for precise composition plus circular pie bubbles modelled on the reference; both remain driven by exact category amounts rather than rounded display percentages.
8. New markers are locked in the live feature registry so the redesigned surfaces cannot silently regress.
9. Transactions uses the same paper, white, ink, slate, and floating-navigation vocabulary as Capture, Reports, and Settings. Period/filter selection uses ink rather than lime.
10. The Dashboard transition follows the reference geometry: the blue hero owns the large lower corner radii, while the paper content region stays full-width and square at its top edge.
11. Financial semantics are consistent across screens: totals use deep navy (`#071B4F`), income uses muted teal (`#168FA8`), normal expenses use charcoal navy (`#263246`), and muted red (`#B64B55`) is reserved for deficits and adverse states. Category and wallet icons use tonal blue rather than unrelated green/orange decoration.
12. Every operational screen (Dashboard, Transaksi, Dompet, Reports) opens with the same blue gradient hero (`#071B4F → #0A3D78 → #178BD0`), rounded lower corners, and glass depth; the paper content region stays full-width and square. Reports uses a solid monochromatic-blue pie (filled wedges with white separators) plus a category bubble cluster rather than a ring donut.

## Consequences

- `home-theme-toggle` is no longer a live marker; the appearance control is now `settings-theme-*` plus `settings-appearance`.
- Dashboard, transactions, wallets, reports, budgets, bills, groups, imports, settings, Capture, notifications, upgrade, auth, and legal/support routes now use the Finance Editorial vocabulary. New screens must adopt it from their first implementation.
- Any new component must extend the limited vocabulary (canvas, sheet, group, row, chip, bubble, primary action) rather than inventing a bespoke promotional card.
- Accessibility rules are unchanged: 44px minimum touch targets, colour never the only signal, natural Bahasa Indonesia copy understood in two seconds.
