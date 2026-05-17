# Home Dark Luxury Parity Matrix

**Reference:** `Kaswise Design System/ui_kits/mobile/Screens.jsx` HomeScreen

**Component references:** `Kaswise Design System/ui_kits/mobile/Components.jsx`

**Implementation target:** `apps/mobile/app/(tabs)/index.tsx`

**Current implementation baseline:** Task 1 commit `8bd4b9f`

## Acceptance Threshold

- Layout drift target: 1–2px where React Native can express the same value.
- Token colors: exact Dark Luxury values from `KS_DARK` / `kaswiseTokens.dark`.
- Green softness: `#A3FF12` remains primary token; most non-CTA usage uses alpha backgrounds/borders/glows.
- No direct cherry-pick from `fabb395` token branch.
- Keep scope to Home surface parity only; do not introduce unrelated navigation, data, or backend changes.

## Screen Container Reference

`Screens.jsx` defines the shared Home container as:

- `SCREEN_PAD = 16`
- `padding: SCREEN_PAD`
- `paddingBottom: 110`
- `display: flex`, `flexDirection: column`, `gap: 14`
- `background: KS.bgBase`
- `fontFamily: ksFont`

React Native target mapping:

- Use `contentContainerStyle` with `paddingHorizontal: 16`, `paddingTop: 16`, `paddingBottom: 110`, and `gap: 14`.
- Use root/screen background `theme.colors.background` only when it resolves to `KS.bgBase` (`#141414`) in dark mode.
- Reference font family through `theme.typography.fontFamily` (`Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`) and apply it consistently to Home text styles where RN font loading permits.

## Parity Matrix

| Element name / area | Reference source | Target dimensions / spacing | Target colors / tokens | Target typography | Target radius / border / shadow | Current implementation status | Required change | Validation method |
|---|---|---|---|---|---|---|---|---|
| Screen container | `Screens.jsx` `screenContainer`; `Components.jsx` `ksFont`; target `index.tsx` root `View` + `ScrollView` content | `SCREEN_PAD = 16`; `paddingBottom: 110`; column `gap: 14`; min-height/flex fill | `background: KS.bgBase` → `theme.colors.background` / `#141414` in dark mode | All Home text references `ksFont` via `theme.typography.fontFamily` where supported | None beyond screen fill | Partial: root uses `theme.colors.background`, but content uses `padding: 20`, `paddingBottom: 26`, manual bottom spacer `height: 100`, and no container `gap`; no explicit font-family use in Home styles | Change content padding to 16, bottom padding to 110, replace manual spacer/section margins with container rhythm (`gap: 14`), ensure dark background maps to `KS.bgBase`, and apply font-family reference consistently | Style assertion/snapshot on content container; dark screenshot confirms 16px side inset and bottom-safe spacing; token assertion for `#141414` |
| Topbar | `Screens.jsx` HomeScreen lines 114–125 | Row `justifyContent: space-between`, `alignItems: center`, `paddingTop: 6`; avatar `36x36` | Greeting `KS.text`; month `KS.muted`; avatar background `KS.brand`; avatar text `#FFF` | Greeting `22`, `800`, `letterSpacing: -0.3`; month `13`, regular, `marginTop: 2`; avatar text `12`, `700` | Avatar `borderRadius: 18`; no shadow | Diverged: greeting copy is localized `Selamat datang, Danu` / `Welcome, Danu`; greeting uses token `3xl` (24); avatar is `44x44`; header has `marginBottom: 20` and no `paddingTop: 6` | Match reference copy/spacing for parity (`Halo, Danu`, month), reduce avatar to 36, set type scale/weight/letter spacing, remove extra header rhythm not in container gap | Focused Home render test checks text/avatar size styles; screenshot visual diff for top 80px |
| Hero balance card | `Components.jsx` `HeroBalance`; `Screens.jsx` HomeScreen lines 127–131 | Card padding `18`; content groups `marginBottom: 16` and `14`; stats row `gap: 8`; stat cells `padding: 10` | Card `t.bgCard` (`#18181A`); border `t.borderSoft`; text `t.text` / `t.textMuted`; emerald bloom `rgba(163,255,18,0.14)`; navy bloom `rgba(74,128,240,0.10)`; no full-green hero fill | Label `11`; amount `30`, `800`, `letterSpacing: -0.6`, tabular nums; stat label `10`; stat value `14`, `800` | Card `borderRadius: 24`; `borderWidth: 1`; `overflow: hidden`; dark shadow none; clipped radial blooms with blur-like softness | Not aligned: current hero is full `theme.colors.brandPrimary` green, radius `theme.radius.lg` (18), padding 20, no blooms, two-stat divider layout, inverse text styling, and different amount/content | Rebuild to Dark Luxury `HeroBalance` recipe: dark card, radius 24, border soft, clipped emerald/navy blooms, wallet/manage row or approved RN equivalent, amount/delta, and three stats (`Pemasukan`, `Pengeluaran`, `Tabungan`) | Focused Home test asserts hero background/radius/padding and stat labels; screenshot/visual diff validates bloom softness and no harsh green block |
| Quick actions row | `Screens.jsx` HomeScreen lines 133–138; `Components.jsx` `QuickActionCard`; `IconBubble` | Row display flex with `gap: 8`; each card `flex: 1`, `paddingVertical: 12`, `paddingHorizontal: 8`, `gap: 6`; icon bubble `32x32` | Card `t.bgCard`; border `t.borderSoft`; active border `rgba(163,255,18,0.30)` only if active; icons use tone alpha fills (`primary`, `accent/navy`, `success`, `info`) | Label `11`, `700`, color `t.textSec` | Card `borderRadius: 16`; `borderWidth: 1`; active neon soft only for active state | Diverged: row gap 10; cards use `theme.colors.surface`; icons size 36; labels are `Teks`, `Foto`, `Suara`, `Import`; label font uses token `sm` (12) semibold; action set does not match reference | Rename/reorder labels to `Manual`, `AI Chat`, `Struk`, `Import`; map routes to approved destinations; set row gap 8, icon size 32, padding/gap/label typography per reference; keep green as alpha bubble except active/CTA | Focused Home route press test for four actions; render test checks labels/count/order; screenshot diff for card sizing |
| Budget section card | `Screens.jsx` HomeScreen lines 140–150; `Components.jsx` `SectionCard`; `ProgressBar` | Section card `padding: 14`, `gap: 10`; inner column `gap: 6`; progress bar uses reference height/radius from `ProgressBar` | Card `t.bgCard`; border `t.borderSoft`; title `t.text`; action `t.brand`; item title `KS.text`; percent `KS.warning`; meta/footer `KS.muted`; progress warn tone | Section title `14`, `700`; action `12`, `700`; item title `13`, `700`; percent `12`, `800`, tabular nums; meta/footer `11` | Section card `borderRadius: 18`; `borderWidth: 1`; dark shadow none | Diverged: current uses separate header `Anggaran Bulan Ini` / `Lihat Semua`, summary card with total budget percentage, then multiple budget item rows; radius 16 and spacing differ | Replace Home budget preview with one `SectionCard`-style card titled `Anggaran`, action `Lihat →`, content `Makan`, `77%`, `620rb / 800rb`, warn progress, `Sisa 180rb · Hampir habis` | Focused Home test checks section title/action/copy/progress value; screenshot diff validates compact card height and warning color |
| Recent transactions card | `Screens.jsx` HomeScreen lines 152–156; `Components.jsx` `SectionCard` + `TransactionRow` | Section card `padding: 14`, `gap: 10`; row `gap: 12`, `paddingVertical: 8`; icon bubble `36` | Card `t.bgCard`; row divider `t.borderSoft`; merchant `t.text`; sublabel `t.textDim`; negative amount `t.amountNegative` (`#FF7B7B`); primary/warning icon alpha tones | Section title/action as above; merchant `13`, `700`; sublabel `11`; amount `13`, `800`, tabular nums | Section card radius 18/border soft; row divider absent on last row | Diverged: title/action are `Transaksi Terbaru` / `Lihat Semua`; rows are `Gaji Bulanan`, `Belanja Bulanan`, `Transportasi`, `Makan Siang`; transaction card radius 16 and padding differ | Match reference card title `Terakhir`, action `Semua →`, and rows: `Indomaret` `Hari ini · GoPay` `-45rb`; `Fore Coffee` `Hari ini · GoPay` `-38rb`; `Grab Car` `Kemarin · GoPay` `-22rb` | Focused Home test asserts three row names/order/amounts; screenshot diff checks card density and divider treatment |
| Insight card | `Screens.jsx` HomeScreen lines 158–172; `Components.jsx` `IconBubble` | Card `padding: 14`, `gap: 12`, `alignItems: flex-start`; icon bubble `36`; body `marginTop: 4`, line-height `1.5` | Card `KS.bgMuted` (`#242427`); border `KS.border`; title `KS.text`; body `KS.secondary`; icon tone `info` alpha fill/border | Title `13`, `800`; body `12`, line-height `1.5` | Card `borderRadius: 16`; `borderWidth: 1`; no shadow | Missing: current Home ends after recent transactions plus spacer; no insight card is rendered | Add the muted insight card with `Insight harian` copy and info icon bubble; preserve body emphasis without introducing unsupported rich text complexity | Focused Home test checks title/body presence; screenshot diff validates muted card against reference |
| Green usage and token discipline | `Components.jsx` `KS_DARK`, `IconBubble`, `HeroBalance`, `QuickActionCard`; `tokens.ts` `kaswiseTokens.dark` | N/A across all primitives | Full `#A3FF12` only for CTA/active/selected foregrounds or small accents; use rgba alpha for bubbles/borders/glows; navy `#4A80F0` reserved for secondary bloom/accent | N/A | Glow only from `theme.shadow.neon` / reference `glowNeonSoft` when active or CTA; dark cards normally no shadow | Partial: tokens exist and map correctly, but Home uses full green as entire hero background and avatar block; some alpha icon usage exists through `IconBubble` | Replace full-surface green hero with dark card; audit Home for direct hex/cherry-pick use; ensure icon bubble tones come from `theme.iconBubbles`; retain exact Dark Luxury token values | Token assertions/grep for disallowed old slate/indigo values in Home; screenshot visual QA for softened green usage |
| Motion and press states | Approved spec plus RN `Pressable` / `Animated` Home primitives | Entrance/press motion must be subtle: small fade/slide; press opacity/scale only; no layout jumps | No color flash; pressed/active states use existing token alpha/glow | N/A | No extra shadow except approved active/neon states | Not implemented: current `Pressable` instances use static styles with no `pressed` state styling and no entrance animation | Add subtle `Animated` entrance and `Pressable` style callbacks where implementation scope allows; avoid harsh flashes or large translation | Manual QA on device/simulator; focused test can assert `Pressable` callbacks where practical; visual diff should be captured at rest state |

## Validation and Visual Diff Closeout

Run these commands from the repository root after the Home implementation is updated:

```bash
pnpm --filter mobile type-check
pnpm --filter mobile test -- --runTestsByPath "app/(tabs)/index.test.tsx"
pnpm --filter mobile test
```

Closeout notes required for the implementation PR/task:

- If the focused Home test file uses a different path, record the exact focused command in the closeout and keep it scoped to Home rendering/route presses.
- If the broader mobile test command is not feasible in the local environment, document the blocker and include the focused test plus type-check results.
- Capture a dark-mode Home screenshot after changes and compare it against `Kaswise Design System/ui_kits/mobile/Screens.jsx` HomeScreen reference.
- Document screenshot/visual diff artifacts in the closeout, including the reference source, target capture path, device or viewport, theme mode, and whether all accepted drift is within the 1–2px threshold.
- Explicitly note token checks for `KS.bgBase` (`#141414`), `KS.brand` (`#A3FF12`), and `KS.navy` (`#4A80F0`) and confirm no old `fabb395` slate/indigo values were introduced.
