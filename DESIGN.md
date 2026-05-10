---
name: Kaswise
description: Aplikasi pencatatan keuangan personal berbahasa Indonesia dengan pendekatan mobile-first
colors:
  primary: "#1E3A8A"
  accent: "#1E40AF"
  success: "#4CAF50"
  danger: "#FF7B7B"
  warning: "#FFC06D"
  info: "#38BDF8"
  bg-base-light: "#FFFFFF"
  bg-surface-light: "#F5F5F5"
  bg-card-light: "#FFFFFF"
  bg-muted-light: "#F8FAFD"
  text-primary-light: "#28303F"
  text-secondary-light: "#4C5A78"
  text-muted-light: "#8A95AD"
  border-soft-light: "#E2E7F2"
  border-strong-light: "#CBD5E3"
  bg-base-dark: "#1A1A2E"
  bg-surface-dark: "#252538"
  bg-card-dark: "#252538"
  bg-muted-dark: "#2E2E42"
  text-primary-dark: "#F5F7FF"
  text-secondary-dark: "#C7CEE0"
  text-muted-dark: "#99A3BA"
  border-soft-dark: "#34344A"
  border-strong-dark: "#4A4A64"
typography:
  display:
    fontFamily: "Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.3px"
  title:
    fontFamily: "Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.2px"
  body:
    fontFamily: "Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  small:
    fontFamily: "Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.03em"
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  "3xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "{colors.bg-card-light}"
    textColor: "{colors.text-secondary-light}"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
  button-secondary-hover:
    backgroundColor: "color-mix(in srgb, {colors.primary} 12%, transparent)"
    textColor: "{colors.primary}"
  card:
    backgroundColor: "{colors.bg-card-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
    padding: "18px"
  input:
    backgroundColor: "{colors.bg-card-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  input-focus:
    borderColor: "{colors.primary}"
    boxShadow: "0 0 0 3px color-mix(in srgb, {colors.primary} 22%, transparent)"
---

# Design System: Kaswise

## 1. Overview

**Creative North Star: "The Practical Companion"**

Sistem visual Kaswise adalah companion yang praktis, hangat, dan cerdas — membantu tanpa membebani. UI langsung ke inti, tidak ada dekorasi berlebihan, setiap tap ada tujuannya. Bahasa Indonesia natural, error messages membantu bukan menghakimi. AI bekerja di belakang layar, memberikan insight tanpa diminta, confidence-based auto-save dengan opsi batalkan.

Sistem ini secara eksplisit menolak: aplikasi keuangan yang terlalu kompleks dengan puluhan chart di dashboard, UI overload dengan sidebars, modals, dan nested cards, form panjang dengan 10+ field wajib untuk satu transaksi, dark mode "karena keren" tanpa alasan scene yang konkret, gradient text, glassmorphism, side-stripe borders sebagai default, hero-metric template (big number + small label + gradient accent) — SaaS cliché.

**Key Characteristics:**
- Mobile-first ≤3 tap — flow utama selesai dalam ≤3 tap di smartphone
- Confidence-based AI — auto-save hanya jika confidence ≥0.85; selalu ada opsi "Batalkan" 5 detik
- Async feel — AI processing tidak block UI, Edge Function + Supabase Realtime memberikan feel "magic"
- Bahasa Indonesia natural — copy setiap layar diuji: apakah pengguna paham dalam 2 detik?
- Show, don't tell — data keuangan ditampilkan visual sederhana, breakdown kategori jelas, tren mudah dibaca

## 2. Colors: The Deep Navy + Emerald Palette

Palet restrained: tinted neutrals + satu accent deep navy ≤10% surface, dengan aksen emerald untuk logo dan highlight.

### Primary
- **Deep Navy** (#1E3A8A): Warna brand utama untuk accent buttons, active states, dan highlight navigation. Digunakan sparingly untuk emphasis.
- **Navy Accent** (#1E40AF): Variasi lebih terang untuk hover states dan gradient stops.

### Status
- **Success** (#4CAF50): Income, positive trends, completed actions
- **Danger** (#FF7B7B): Expense, errors, warnings, negative actions
- **Warning** (#FFC06D): Budget alerts, pending reviews
- **Info** (#38BDF8): Neutral information, tooltips, helper text

### Neutral (Light Mode)
- **Base Background** (#FFFFFF): Background utama aplikasi
- **Surface** (#F5F5F5): Sidebar, card backgrounds, elevated surfaces
- **Card** (#FFFFFF): Card foreground, form backgrounds
- **Muted** (#F8FAFD): Subtle backgrounds, disabled states
- **Primary Text** (#28303F): Body text, headings, main content
- **Secondary Text** (#4C5A78): Labels, helper text, less important content
- **Muted Text** (#8A95AD): Placeholders, disabled text, metadata
- **Soft Border** (#E2E7F2): Default borders, dividers
- **Strong Border** (#CBD5E3): Focus borders, active dividers

### Neutral (Dark Mode)
- **Base Background** (#1A1A2E): Dark background utama
- **Surface** (#252538): Sidebar, card backgrounds
- **Card** (#252538): Card foreground, form backgrounds
- **Muted** (#2E2E42): Subtle backgrounds, disabled states
- **Primary Text** (#F5F7FF): Body text, headings
- **Secondary Text** (#C7CEE0): Labels, helper text
- **Muted Text** (#99A3BA): Placeholders, disabled text
- **Soft Border** (#34344A): Default borders, dividers
- **Strong Border** (#4A4A64): Focus borders, active dividers

### Named Rules
**The Restrained Accent Rule.** Deep navy accent digunakan pada ≤10% surface mana pun. Kelangkaannya adalah intinya — ketika muncul, itu berarti "actionable" atau "important".

**The Gradient-Only-For-Logo Rule.** Gradient hanya untuk logo (indigo → emerald). UI elements menggunakan solid colors atau subtle color-mix untuk states.

## 3. Typography

**Display Font:** Inter (with Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif fallback)
**Body Font:** Inter (same stack)
**Label/Mono Font:** Inter (same stack, dengan weight 600 untuk emphasis)

**Character:** Clean, readable, dengan warmth melalui letter-spacing yang tepat dan scale hierarchy yang jelas. Tidak terlalu technical, tidak terlalu decorative — tepat untuk companion yang praktis.

### Hierarchy
- **Display** (700, 32px, 1.2, -0.5px): Hanya untuk hero headlines di auth pages. Jarang digunakan.
- **Headline** (700, 24px, 1.3, -0.3px): Page titles, major section headers.
- **Title** (700, 18px, 1.4, -0.2px): Card titles, modal headers, subsection headers.
- **Body** (400, 16px, 1.6, normal): Semua body text, paragraf, form labels. Max line length 65–75ch.
- **Label** (600, 13px, 1.4, 0.02em): Form labels, button text, navigation items, metadata.
- **Small** (400, 11px, 1.4, 0.03em): Captions, timestamps, helper text, error messages.

### Named Rules
**The No-Serif Rule.** Tidak ada serif fonts di UI. Inter memberikan warmth melalui humanist proportions tanpa decorative serifs.

**The Consistent-Stack Rule.** Font stack sama di semua elements — tidak mixing typefaces untuk simplicity dan performance.

## 4. Elevation

Sistem menggunakan hybrid: flat surfaces dengan subtle shadows untuk elevation, dan tonal layering untuk depth dalam dark mode.

### Shadow Vocabulary
- **Ambient** (`box-shadow: 0 1px 3px rgba(15, 21, 35, 0.06), 0 4px 16px rgba(15, 21, 35, 0.08)`): Default card shadow untuk separation dari background.
- **Accent Glow** (`box-shadow: 0 4px 20px color-mix(in srgb, var(--ks-brand-primary) 36%, transparent)`): Hover states untuk primary buttons, active navigation items.
- **Focus Ring** (`box-shadow: 0 0 0 3px color-mix(in srgb, var(--ks-brand-primary) 22%, transparent)`): Keyboard focus indicator untuk accessibility.

### Named Rules
**The Flat-By-Default Rule.** Surfaces flat at rest. Shadows appear hanya sebagai response to state (hover, elevation, focus).

**The No-Inner-Shadows Rule.** Tidak ada inner shadows untuk depth — menggunakan border color dan background tonal shifts sebagai ganti.

## 5. Components

### Buttons
- **Shape:** Gently curved edges (10px radius)
- **Primary:** Deep navy background, white text, 9px 16px padding, accent glow shadow
- **Hover:** Slightly lighter navy (#1E40AF), subtle upward transform (-1px), stronger glow
- **Secondary:** Light card background, secondary text color, 1px border matching soft border
- **Secondary Hover:** Accent light background (color-mix 12% primary), accent text color, border shifts to accent
- **Danger:** 10% danger color background, danger text, 1px border dengan 20% opacity danger

### Cards / Containers
- **Corner Style:** 14px radius (medium)
- **Background:** Card color (white di light mode, #252538 di dark)
- **Shadow Strategy:** Ambient shadow default, none on hover (hanya border color shift)
- **Border:** 1px solid soft border
- **Internal Padding:** 18px standard, 24px untuk hero cards
- **Hero Cards:** Gradient primary background, white text, accent glow shadow, decorative circles

### Inputs / Fields
- **Style:** Card background, 1px strong border, 10px radius, 10px 14px padding
- **Focus:** Border shifts to accent color, 3px accent glow ring (22% opacity)
- **Error:** Border shifts to danger color, background dengan 8% danger color mix
- **Disabled:** Muted background, muted text color, no border shift on focus

### Navigation
- **Sidebar:** Surface background, 1px right border soft, fixed 240px width
- **Nav Items:** Secondary text, 10px gap, 9px 10px padding, 7px radius icon background
- **Active State:** Accent light background, accent text, icon background becomes gradient primary
- **Mobile:** Transform slide-in dari kiri, width min(86vw, 320px), shadow kuat untuk depth

### Logo
- **Mark:** 512×512 viewBox dengan gradient indigo (#818CF8 → #4F46E5) untuk structural K, gradient emerald (#6EE7B7 → #10B981) untuk arrow accent
- **Light Variant:** #F8FAFC background dengan soft shadow
- **Dark Variant:** #0F172A → #020617 gradient background dengan stronger shadow
- **Usage:** Reusable component dengan size prop (32, 36, 72) dan variant prop (light/dark)

## 6. Do's and Don'ts

### Do:
- **Do** gunakan deep navy (#1E3A8A) hanya untuk actionable elements (primary buttons, active nav)
- **Do** pertahankan line length body text antara 65–75ch untuk readability
- **Do** gunakan color-mix dengan 12% opacity untuk accent light backgrounds
- **Do** implement hover states dengan transform: translateY(-1px) untuk primary buttons
- **Do** gunakan 3px focus ring dengan 22% opacity primary untuk keyboard accessibility
- **Do** batasi gradient hanya untuk logo — UI elements pakai solid colors
- **Do** test setiap copy: apakah pengguna paham dalam 2 detik?
- **Do** cap flow utama dalam ≤3 tap di mobile
- **Do** auto-save hanya jika confidence ≥0.85, selalu sediakan opsi "Batalkan" 5 detik

### Don't:
- **Don't** gunakan dark mode "karena keren" tanpa alasan scene yang konkret
- **Don't** buat aplikasi keuangan yang terlalu kompleks dengan puluhan chart di dashboard
- **Don't** overload UI dengan sidebars, modals, dan nested cards
- **Don't** buat form panjang dengan 10+ field wajib untuk satu transaksi
- **Don't** gunakan gradient text, glassmorphism, side-stripe borders sebagai default
- **Don't** gunakan hero-metric template (big number + small label + gradient accent) — SaaS cliché
- **Don't** buat identical card grids dengan icon + heading + text, repeated endlessly
- **Don't** gunakan modal sebagai first thought — exhaust inline / progressive alternatives first
- **Don't** animasi CSS layout properties — gunakan transform dan opacity
- **Don't** gunakan em dashes — pakai commas, colons, semicolons, periods, atau parentheses
