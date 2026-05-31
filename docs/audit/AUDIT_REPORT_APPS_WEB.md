# Technical Audit Report — Kaswise Web App

**Target:** `apps/web`  
**Date:** 2026-05-10  
**Auditor:** Claude Code (impeccable/audit)  
**docs/product/PRODUCT.md:** ✅ Loaded (register: product)

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Partial — some ARIA missing, touch targets inconsistent |
| 2 | Performance | 3/4 | Good — minimal layout thrash, some expensive effects |
| 3 | Responsive Design | 3/4 | Good — mobile breakpoints exist, some fixed widths |
| 4 | Theming | 2/4 | Partial — CSS custom props used, but hard-coded values remain |
| 5 | Anti-Patterns | 2/4 | Some AI tells — gradient text, glassmorphism, side-stripe borders |
| **Total** | | **12/20** | **Acceptable (significant work needed)** |

**Rating:** Acceptable — functional but needs systematic improvements before production polish.

## Anti-Patterns Verdict

**Does this look AI-generated?** Partially yes.

**Specific tells:**
1. **Gradient text** — `background-clip: text` not present, but gradient backgrounds used for text containers (hero-card, auth-brand)
2. **Glassmorphism as default** — `backdrop-filter: blur(12px)` on topbar (line 278), `backdrop-filter: blur(10px)` on auth-logo-mark (line 504)
3. **Side-stripe borders** — `borderLeft: "4px solid ${accent}"` (BillsPage.tsx:197), `borderLeft: "3px solid var(--amber)"` (TransactionPage.tsx:598)
4. **Hero-metric template** — Dashboard metrics follow SaaS pattern (big number + small label + gradient accent)
5. **Identical card grids** — Dashboard uses grid of same-sized cards with icon + heading + text

**Not AI slop:** Color strategy is restrained (tinted neutrals + one accent ≤10%), typography hierarchy decent, no gradient text via `background-clip`.

## Executive Summary

- **Audit Health Score:** 12/20 (Acceptable)
- **Total issues found:** 14 (P0: 0, P1: 4, P2: 6, P3: 4)
- **Top critical issues:**
  1. Touch targets <44px in multiple places (P1)
  2. Missing ARIA labels for interactive elements (P1)
  3. Hard-coded colors bypassing design tokens (P1)
  4. Side-stripe border anti-pattern (P1)
- **Recommended next steps:** Run `adapt` for responsive fixes, `colorize` for token consistency, `clarify` for a11y, then `polish`.

## Detailed Findings by Severity

### P1 Major (Fix before release)

**[P1] Inconsistent touch targets**
- **Location:** `src/index.css:316` — `.btn { min-height: 36px; }` (8px short of 44px)
- **Category:** Accessibility / Responsive
- **Impact:** Mobile users may struggle to tap buttons accurately
- **WCAG/Standard:** WCAG 2.5.5 Target Size (Level AAA)
- **Recommendation:** Increase minimum touch target to 44×44px
- **Suggested command:** `/impeccable adapt apps/web/src/index.css`

**[P1] Missing ARIA labels for icon buttons**
- **Location:** `src/components/AppLayout.tsx:235` — sidebar toggle button has no label
- **Category:** Accessibility
- **Impact:** Screen reader users cannot understand button purpose
- **WCAG/Standard:** WCAG 4.1.2 Name, Role, Value
- **Recommendation:** Add `aria-label="Toggle sidebar"` or similar
- **Suggested command:** `/impeccable clarify apps/web/src/components/AppLayout.tsx`

**[P1] Hard-coded colors bypassing design tokens**
- **Location:** Multiple files — `#3b82f6`, `#2563eb`, `#1e293b` in print stylesheet
- **Category:** Theming
- **Impact:** Theme switching breaks, dark mode inconsistencies
- **Recommendation:** Replace with CSS custom properties (`var(--accent)`)
- **Suggested command:** `/impeccable colorize apps/web/src/index.css`

**[P1] Side-stripe border anti-pattern**
- **Location:** `src/pages/BillsPage.tsx:197`, `TransactionPage.tsx:598,685`
- **Category:** Anti-Patterns
- **Impact:** Visual clutter, AI slop tell, poor information hierarchy
- **Recommendation:** Replace with full borders, background tints, or leading icons
- **Suggested command:** `/impeccable distill apps/web/src/pages/BillsPage.tsx`

### P2 Minor (Fix in next pass)

**[P2] Expensive backdrop-filter on topbar**
- **Location:** `src/index.css:278` — `backdrop-filter: blur(12px)`
- **Category:** Performance / Anti-Patterns
- **Impact:** Mobile performance hit, battery drain
- **Recommendation:** Remove or reduce blur, use solid background
- **Suggested command:** `/impeccable optimize apps/web/src/index.css`

**[P2] Fixed widths in responsive grids**
- **Location:** `src/index.css:1108` — `grid-template-columns: minmax(0, 3fr) minmax(260px, 2fr)`
- **Category:** Responsive Design
- **Impact:** May overflow on very narrow viewports
- **Recommendation:** Use `minmax(0, 1fr)` or fluid units
- **Suggested command:** `/impeccable adapt apps/web/src/index.css`

**[P2] Missing focus indicators**
- **Location:** Custom buttons lack `:focus-visible` styles
- **Category:** Accessibility
- **Impact:** Keyboard users cannot see focused element
- **WCAG/Standard:** WCAG 2.4.7 Focus Visible
- **Recommendation:** Add `outline` or `box-shadow` on focus
- **Suggested command:** `/impeccable clarify apps/web/src/index.css`

**[P2] Print stylesheet uses light-mode assumptions**
- **Location:** `src/index.css:1604-1713` — assumes white background
- **Category:** Theming
- **Impact:** Dark mode users get poor print contrast
- **Recommendation:** Use `color-scheme: light dark;` and system colors
- **Suggested command:** `/impeccable colorize apps/web/src/index.css`

**[P2] Nested cards in dashboard layout**
- **Location:** Dashboard grid contains cards within cards
- **Category:** Anti-Patterns
- **Impact:** Visual hierarchy confusion
- **Recommendation:** Flatten structure, use semantic sections
- **Suggested command:** `/impeccable distill apps/web/src/pages/DashboardPage.tsx`

**[P2] Missing reduced motion support**
- **Location:** No `prefers-reduced-motion` media queries
- **Category:** Accessibility
- **Impact:** Motion-sensitive users may experience discomfort
- **WCAG/Standard:** WCAG 2.3.3 Animation from Interactions
- **Recommendation:** Add `@media (prefers-reduced-motion: reduce)`
- **Suggested command:** `/impeccable clarify apps/web/src/index.css`

### P3 Polish (Fix if time permits)

**[P3] Inconsistent border-radius tokens**
- **Location:** Mix of `var(--r)`, `var(--r-sm)`, hard-coded `999px`
- **Category:** Theming
- **Impact:** Visual inconsistency
- **Recommendation:** Standardize on token system
- **Suggested command:** `/impeccable colorize apps/web/src/index.css`

**[P3] Overly complex auth loader animation**
- **Location:** `src/index.css:628-761` — 3 nested animations
- **Category:** Performance / Anti-Patterns
- **Impact:** Unnecessary complexity, maintenance burden
- **Recommendation:** Simplify to single spinner
- **Suggested command:** `/impeccable distill apps/web/src/index.css`

**[P3] Missing `will-change` hints for animations**
- **Location:** Animated elements lack performance hints
- **Category:** Performance
- **Impact:** Potential jank during animations
- **Recommendation:** Add `will-change: transform, opacity` where appropriate
- **Suggested command:** `/impeccable optimize apps/web/src/index.css`

**[P3] Inline styles overriding CSS classes**
- **Location:** Multiple TSX files — `style={{ padding: "14px", borderLeft: ... }}`
- **Category:** Maintainability
- **Impact:** Hard to maintain, breaks theme consistency
- **Recommendation:** Move to CSS classes
- **Suggested command:** `/impeccable extract apps/web/src`

## Patterns & Systemic Issues

1. **Hard-coded color values** appear in 10+ components despite CSS custom property system
2. **Touch targets consistently <44px** — buttons, form elements, nav items
3. **Side-stripe borders** used as visual accent in multiple places (anti-pattern)
4. **Backdrop-filter overused** — topbar, auth logo, modal overlay
5. **Inline styles for layout** instead of CSS utility classes

## Positive Findings

✅ **CSS custom property system** exists (`--ks-*` tokens)  
✅ **Responsive breakpoints** comprehensive (mobile, tablet, desktop)  
✅ **Semantic HTML** mostly correct (buttons, inputs, headings)  
✅ **Print stylesheet** implemented for PDF export  
✅ **Dark/light theme support** via CSS custom properties  
✅ **Internationalization** baked into components  
✅ **Loading states** with skeleton/placeholder patterns  
✅ **Error boundaries** and user-friendly error messages

## Recommended Actions

1. **[P1] `/impeccable adapt apps/web`** — Fix touch targets, responsive grids, focus indicators
2. **[P1] `/impeccable clarify apps/web/src/components/AppLayout.tsx`** — Add ARIA labels, improve screen reader support
3. **[P1] `/impeccable colorize apps/web/src/index.css`** — Replace hard-coded colors with tokens
4. **[P1] `/impeccable distill apps/web/src/pages/BillsPage.tsx`** — Remove side-stripe border anti-pattern
5. **[P2] `/impeccable optimize apps/web/src/index.css`** — Reduce expensive effects, add performance hints
6. **[P3] `/impeccable extract apps/web/src`** — Pull inline styles into reusable design tokens

**Final step after fixes:** `/impeccable polish apps/web`

---

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `/impeccable audit apps/web` after fixes to see your score improve.