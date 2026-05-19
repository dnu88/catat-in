# Donut Chart and Kaswise Logo Design

## Goal
Synchronize the Reports expense donut chart with the Expense Breakdown category colors and add the Kaswise mark logo to Login and Settings.

## Design
- The donut chart uses `dynamicCategories` as the single source of truth for segment colors, matching the rows and progress bars in Expense Breakdown.
- The donut visual should render proportional segments from category percentages instead of equal rotated blocks.
- Login and Settings use a compact mark-only Kaswise logo derived from `Kaswise Design System/assets/logo-kaswise-mark.svg` / `preview/brand-logo.html`.
- The logo is implemented as a reusable React Native component to avoid adding SVG dependencies.

## Testing
- Reports tests assert every donut segment color matches the corresponding category fill color.
- Login and Settings tests assert the Kaswise logo mark is rendered in each target screen.
- Existing mobile type-check, Jest, and Expo export must pass.
