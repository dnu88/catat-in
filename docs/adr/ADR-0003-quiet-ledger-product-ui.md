# ADR-0003: Quiet Ledger Product UI

## Status

Accepted for product interaction principles. Visual composition and palette are governed by [ADR-0004: Finance Editorial Surfaces](./ADR-0004-finance-editorial-surfaces.md).

## Date

2026-09-25

## Context

Kaswise had drifted into a component-heavy presentation: nested cards, promotional copy inside operational screens, repeated icon bubbles, duplicate capture entry points, and decorative accents competing with financial information. The result looked like a fintech showcase rather than a calm daily finance tool.

The product principles remain authoritative: mobile-first flows in three taps or fewer, practical Indonesian copy, data before decoration, and AI working behind the interface rather than becoming the interface.

## Decision

Kaswise retains **Quiet Ledger** as its interaction and information-architecture discipline:

1. Operational screens are data-first. Marketing, upsell explanations, and onboarding checklists do not live on the dashboard.
2. Avoid nested cards. Prefer typography, spacing, grouped surfaces, and clear hierarchy.
3. Use one primary action per screen.
4. Capture opens directly to modality controls and the input workspace. AI is described only when it changes user expectations.
5. Settings uses concise grouped rows; longer explanations move to detail screens.
6. Empty states are compact and contextual, never a second card nested inside a section card.
7. Decorative branding is reserved for auth, onboarding, and marketing surfaces—not utility screens.
8. Visual QA uses 390×844 as the minimum mobile baseline and verifies populated/empty states, keyboard behavior, and safe areas.
9. Visual tokens, palette, gradients, cards, navigation, and semantic colours follow ADR-0004. Quiet Ledger does not define a separate lime or dark-luxury identity.

## Initial implementation

The first Quiet Ledger slice covers:

- Dashboard: financial summary → recent transactions → actionable budget/review states.
- Capture: segmented modality control → input workspace → wallet context → primary action.
- Settings: profile followed by grouped native rows.

Business logic, finance context, auth, transaction services, and backend APIs remain independent of this interaction decision.

## Consequences

- The old Home Dark Luxury parity matrix is historical context, not an implementation target.
- ADR-0002 is superseded for active visual composition and palette decisions by ADR-0004.
- New feature work extends the limited vocabulary defined by ADR-0004 rather than creating bespoke promotional cards.
- Visual acceptance is based on hierarchy, task completion, readability, and density—not pixel parity with the old UI kit.
