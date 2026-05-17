# Home Dark Luxury Parity Matrix

**Reference:** `Kaswise Design System/ui_kits/mobile/Screens.jsx` HomeScreen  
**Component references:** `Kaswise Design System/ui_kits/mobile/Components.jsx`  
**Implementation target:** `apps/mobile/app/(tabs)/index.tsx`

## Acceptance Threshold

- Layout drift target: 1–2px where React Native can express the same value.
- Token colors: exact Dark Luxury values.
- Green softness: `#A3FF12` remains primary token; most non-CTA usage uses alpha backgrounds/borders/glows.
- No direct cherry-pick from `fabb395` token branch.

## Matrix

| Area | Reference | Target implementation | Required parity | Validation |
|---|---|---|---|---|
| Screen container | `screenContainer`, `SCREEN_PAD = 16` | `index.tsx` root `ScrollView` content | dark background, horizontal padding 16, section rhythm | screenshot + style constants |
| Topbar | `HomeScreen` lines 114–125 | `DashboardScreen` topbar | greeting `Halo, Danu`, month, 36px avatar, top padding 6 | render test + screenshot |
| Hero balance | `HeroBalance` | `HomeHeroBalance` | card radius 24, padding 18, dark card, soft border, clipped emerald/navy blooms, stats row | render test + screenshot |
| Quick actions | `QuickActionCard` row | `HomeQuickActionRow` | 4 equal cards: Manual, AI Chat, Struk, Import; radius 16; icon size 32; label 11/700 | render test + route press test |
| Budget card | `SectionCard title="Anggaran"` | `HomeBudgetCard` | title, green action pill, Makan 77%, 620rb / 800rb, progress bar | render test + screenshot |
| Recent card | `SectionCard title="Terakhir"` | `HomeRecentTransactions` | action `Semua →`, 3 rows: Indomaret, Fore Coffee, Grab Car | render test + screenshot |
| Insight card | inline Home insight | `HomeInsightCard` | muted card, info bubble, title/body copy, radius 16, line-height 1.5 | render test + screenshot |
| Green usage | `KS.brand` / alpha styles | all Home primitives | full green only CTA/active; alpha for bubbles/borders/glows | token assertions + visual QA |
| Motion | approved spec | `Animated` entrance + press states | subtle fade/slide and press opacity/scale; no harsh flash | manual QA |
