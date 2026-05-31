---
name: Kaswise
description: Aplikasi pencatatan keuangan personal berbahasa Indonesia, mobile-first, cepat, hangat, dan dibantu AI.
colors:
  brand-emerald-dark: "#A3FF12"
  brand-emerald-light: "#3F6212"
  brand-emerald-deep: "#65A30D"
  brand-navy: "#4A80F0"
  brand-navy-deep: "#2A5DD0"
  status-success-dark: "#A3FF12"
  status-success-light: "#65A30D"
  status-danger-dark: "#FF7B7B"
  status-danger-light: "#DC2626"
  status-warning-dark: "#FFC06D"
  status-warning-light: "#B45309"
  status-info-dark: "#38BDF8"
  status-info-light: "#0284C7"
  dark-bg-base: "#141414"
  dark-bg-surface: "#1E1E1A"
  dark-bg-card: "#18181A"
  dark-bg-muted: "#242427"
  dark-bg-header: "#0A0A0A"
  dark-text-primary: "#FFFFFF"
  dark-text-secondary: "#E5E7EB"
  dark-text-muted: "#9CA3AF"
  dark-text-inverse: "#0A0A0A"
  light-bg-base: "#F5F5F0"
  light-bg-surface: "#FFFFFF"
  light-bg-muted: "#FAFAF5"
  light-text-primary: "#0A0A0A"
  light-text-secondary: "#4B5563"
  light-text-muted: "#6B7280"
  light-text-inverse: "#FFFFFF"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.5px"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0px"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.4px"
  support:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "0.4px"
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "20px"
  2xl: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary-dark:
    backgroundColor: "{colors.brand-emerald-dark}"
    textColor: "{colors.dark-text-inverse}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "44px"
  button-primary-light:
    backgroundColor: "{colors.brand-emerald-light}"
    textColor: "{colors.light-text-inverse}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "44px"
  button-secondary-dark:
    backgroundColor: "{colors.dark-bg-muted}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "44px"
  card-default-dark:
    backgroundColor: "{colors.dark-bg-card}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-default-light:
    backgroundColor: "{colors.light-bg-surface}"
    textColor: "{colors.light-text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-default-dark:
    backgroundColor: "{colors.dark-bg-card}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.md}"
    padding: "12px"
    height: "44px"
  input-default-light:
    backgroundColor: "{colors.light-bg-surface}"
    textColor: "{colors.light-text-primary}"
    rounded: "{rounded.md}"
    padding: "12px"
    height: "44px"
  chip-selected-dark:
    backgroundColor: "{colors.brand-emerald-dark}"
    textColor: "{colors.dark-text-inverse}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "44px"
---

# Design System: Kaswise

## 1. Overview

**Creative North Star: "The Midnight Ledger Companion"**

Kaswise feels like a quiet, capable finance companion in the user's pocket: matte, direct, and fast enough for a transaction logged between classes, commuting, or closing a monthly review. The interface is product-first. It should disappear into the task, finish primary flows in three taps or fewer, and make AI assistance feel reliable rather than theatrical.

The brand-canonical scene is night-time mobile finance: Rafi checks spending in a dim room, Dania logs a small purchase before forgetting it, and neither has patience for a dashboard pretending to be an analytics suite. Dark mode is justified by that scene, not by cool-factor aesthetics. Light mode exists as a warm bone counterpart for bright environments.

Kaswise explicitly rejects aplikasi keuangan yang terlalu kompleks dengan puluhan chart di dashboard, UI overload dengan sidebars, modals, dan nested cards, form panjang dengan 10+ field wajib untuk satu transaksi, dark mode "karena keren" tanpa alasan scene yang konkret, gradient text, glassmorphism, side-stripe borders sebagai default, and the hero-metric template.

**Key Characteristics:**
- Mobile-first, primary flows complete in 3 taps or fewer.
- Confidence-based AI, auto-save only when confidence is at least 0.85, with "Batalkan" available for 5 seconds.
- Async feel, AI work never blocks the screen or turns into client polling theater.
- Bahasa Indonesia natural, every label and error should be understood in 2 seconds.
- Show, don't tell, charts are used only when they clarify a decision.

## 2. Colors

The palette is restrained product UI with one signature exception: the dark theme earns a sharp neon emerald action color because the app's night-time scene can carry it. In light mode, the primary action darkens to forest emerald for contrast and maturity.

### Primary
- **Night Ledger Emerald**: The dark-mode primary action color. Use for primary buttons, selected chips, active navigation, success moments, and signature AI confidence moments.
- **Daylight Forest Emerald**: The light-mode primary action color. Use anywhere text must sit on the action color in light mode.
- **Deep Ledger Emerald**: The supporting green for light-mode icon bubbles, status, and subtle selected states.

### Secondary
- **Soft Bank Navy**: The calm secondary accent for information, group context, and non-destructive supporting actions.
- **Deep Bank Navy**: The light-mode navy variant when contrast needs to harden.

### Tertiary
- **Receipt Danger Red**: Expense, destructive action, and error states.
- **Budget Warning Amber**: Budget alerts, pending review, and attention states.
- **Realtime Info Blue**: Neutral info, realtime feedback, and assistant status.

### Neutral
- **Matte Ledger Black**: The dark app background, used as the brand-canonical canvas.
- **Soft Charcoal Surface**: Primary dark surfaces, cards, and panels.
- **Compact Charcoal Card**: Form controls, tab bars, and tighter dark components.
- **Raised Graphite**: Pills, muted sections, and elevated dark surfaces.
- **Warm Bone**: The light app background, warm enough to avoid sterile finance-app white.
- **Paper Surface**: Cards and controls in light mode.
- **Ink Text**: Primary light text and inverse text on dark-action areas.
- **Mist Text**: Secondary and muted text layers across dark and light modes.

### Named Rules
**The Scene-Based Theme Rule.** Dark mode is canonical only because the mobile finance scene supports it. Do not use dark mode as decoration.

**The One Action Voice Rule.** Emerald marks the next action, current selection, or positive state. It is not decorative confetti.

**The Contrast Split Rule.** Dark mode uses bright emerald for action. Light mode uses forest emerald for action text contrast. Never force the neon value into light-mode button backgrounds with white text.

## 3. Typography

**Display Font:** Inter with native system fallbacks.
**Body Font:** Inter with native system fallbacks.
**Label/Mono Font:** Inter, using heavier weights for support text instead of a separate mono.

**Character:** Practical, compact, and mobile-native. The typography should feel like a trusted app, not a fintech campaign poster.

### Hierarchy
- **Display** (800, 32px, 1.2): Rare splash, auth, and empty-state emphasis only.
- **Headline** (800, 22px, 1.2): Screen titles via `screenTitle`, with tight tracking.
- **Title** (700, 18px, 1.4): Section headers, card titles, and modal-equivalent inline panels.
- **Body** (400, 16px, 1.6): Long-form guidance, explanations, and readable copy. Cap prose around 65 to 75 characters when layout permits.
- **Label** (700, 12px, 1.4): Buttons, chips, navigation items, and compact UI labels.
- **Support** (800, 11px, 1.4): Metadata, helper copy, stat labels, small badges, and dense mobile affordances.

### Named Rules
**The One-Family Rule.** Use one sans family everywhere. Do not add display fonts, serif accents, or novelty labels.

**The Dense-But-Legible Rule.** Small mobile text must earn its size with weight and spacing. Support text is 11px, extra-bold, and never low-contrast.

**The Copy-Speed Rule.** Bahasa Indonesia UI copy must be understood in 2 seconds. If a label requires rereading, rewrite it.

## 4. Elevation

Kaswise uses a hybrid of tonal layering and light shadows. Dark surfaces separate mostly through color steps and soft borders; shadows exist to clarify stacked UI, not to decorate it. Light mode uses gentler shadow opacity because the warm bone surface already provides separation.

### Shadow Vocabulary
- **Dark sm**: Small card separation, `shadowOpacity 0.30`, `shadowRadius 2`, `elevation 2`.
- **Dark md**: Raised panels, `shadowOpacity 0.30`, `shadowRadius 12`, `elevation 6`.
- **Dark lg**: Floating drawers and important panels, `shadowOpacity 0.45`, `shadowRadius 30`, `elevation 12`.
- **Dark neon**: Pressed primary action and signature CTA glow, emerald shadow with `shadowOpacity 0.45`, `shadowRadius 22`, `elevation 16`.
- **Light sm**: Subtle card separation, `shadowOpacity 0.04`, `shadowRadius 2`, `elevation 1`.
- **Light md**: Raised panels, `shadowOpacity 0.08`, `shadowRadius 12`, `elevation 3`.
- **Light lg**: Floating drawers and important panels, `shadowOpacity 0.10`, `shadowRadius 30`, `elevation 8`.
- **Light neon**: Primary action glow, forest emerald shadow with `shadowOpacity 0.35`, `shadowRadius 22`, `elevation 12`.

### Named Rules
**The Tonal-First Rule.** Reach for background and border tokens before shadow. Cards should not look like paper floating above a website.

**The Glow-Is-State Rule.** Emerald glow belongs to primary action feedback, FABs, and committed CTAs. It is forbidden as ambient decoration.

**The No-Nesting Rule.** Nested cards are a product smell. Use spacing, section headers, or one muted surface instead.

## 5. Components

### Buttons
- **Shape:** Gently curved rectangle (10px radius), minimum height 44px.
- **Primary:** Dark mode uses Night Ledger Emerald with Ink Text. Light mode uses Daylight Forest Emerald with white text.
- **Secondary:** Glass-tinted surface with a soft border, used for non-primary alternatives.
- **Ghost:** Transparent with primary text color, reserved for quiet inline actions.
- **Danger:** Tinted danger bubble background, danger text, never full red unless the action is destructive and final.
- **Loading / Disabled:** Loading replaces text with an activity indicator. Disabled and loading states lower opacity to 60%.

### Chips
- **Style:** Pill shape (999px radius), minimum height 44px, bold 12px label.
- **Selected:** Emerald background with inverse text.
- **Unselected:** Glass background with secondary text and glass border.
- **Usage:** Filters and quick toggles only. Do not use chips as decorative tags in dense finance flows.

### Cards / Containers
- **Corner Style:** Rounded but not bubbly (18px radius).
- **Default:** Card surface, soft border, small shadow, 16px internal padding.
- **Elevated:** Raised surface with medium shadow, no extra border by default.
- **Muted:** Muted surface with soft border for grouped supporting content.
- **Empty State:** Dashed border, 24px padding, centered icon bubble, title, and short explanation.

### Inputs / Fields
- **Style:** Card background, 14px radius, minimum height 44px, 12px padding.
- **Label:** Uppercase 10px, extra-bold, 0.6px tracking.
- **Focus:** Border becomes brand primary at 2px, label shifts to brand primary.
- **Error:** Border becomes danger at 2px, background uses the danger icon-bubble tint, helper text appears in danger color.

### Navigation
- **Style:** Mobile-native app structure with tab bar and screen headers, not desktop sidebars.
- **Screen Header:** Row layout with title and optional action. Title uses 22px extra-bold with tight tracking; subtitle uses 12px secondary text.
- **Active State:** Emerald marks current selection. Inactive items stay neutral.
- **Mobile Treatment:** All navigation targets must remain at least 44px high.

### Icon Bubbles
- **Shape:** Circular, usually 36px to 56px, with 1px border and centered bold icon.
- **Tone:** Primary, navy, success, warning, danger, info, or neutral.
- **Usage:** Scannable anchors for finance concepts, not decoration. Every bubble should explain a row, action, state, or empty state.

### Status and State Messages
- **Status Badge:** Pill with 1px border, status tint background, 11px extra-bold label.
- **State Message:** Rounded 14px block with status-colored text, tint background, 1px border, and concise Indonesian copy.
- **Rule:** Never communicate status by color alone. Pair color with text, icon, or position.

## 6. Do's and Don'ts

### Do:
- **Do** keep the main transaction capture flow within 3 taps on mobile.
- **Do** use emerald for primary action, selected state, success, and high-confidence AI moments.
- **Do** use forest emerald for light-mode primary buttons so white text stays readable.
- **Do** use icon bubbles to make finance states scannable without adding chart clutter.
- **Do** prefer inline review cards over modals when AI confidence is low.
- **Do** show "Batalkan" for 5 seconds after high-confidence auto-save.
- **Do** use skeletons or inline progress for async AI, not blocking spinners in the middle of content.
- **Do** make error messages helpful, natural, and written in Bahasa Indonesia.
- **Do** maintain 44px minimum touch targets for buttons, chips, inputs, and navigation.

### Don't:
- **Don't** build aplikasi keuangan yang terlalu kompleks dengan puluhan chart di dashboard.
- **Don't** overload UI dengan sidebars, modals, dan nested cards.
- **Don't** create form panjang dengan 10+ field wajib untuk satu transaksi.
- **Don't** use dark mode "karena keren" without a concrete scene.
- **Don't** use gradient text, glassmorphism, or side-stripe borders as defaults.
- **Don't** use the hero-metric template, big number plus small label plus gradient accent.
- **Don't** repeat identical card grids with icon, heading, and text when a list or compact summary would be clearer.
- **Don't** animate layout properties. Use opacity and transform for state changes only.
- **Don't** invent custom scrollbars, strange form controls, or non-standard affordances for flavor.
- **Don't** rely on color alone for budget, danger, success, selected, or disabled states.
