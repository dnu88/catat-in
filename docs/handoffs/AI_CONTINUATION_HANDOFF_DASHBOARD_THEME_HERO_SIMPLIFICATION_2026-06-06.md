# AI Continuation Handoff — Dashboard Theme Control + Hero Simplification

Date: 2026-06-06
Repo: `/home/Danu88/catat-in`
Branch: `ops/hardening-bundle`
Primary app: `apps/mobile`
Live PWA: `https://kaswise.com`

## Purpose

Dokumen ini mencatat polish lanjutan setelah saved report-period rules dan dashboard privacy toggle. Fokus perubahan ini adalah menyederhanakan hero dashboard dan memindahkan pengaturan theme dari Settings ke Dashboard utama.

## Product decision

Keputusan UX yang diambil:

- Keterangan permanen `Income minus spending for ...` / `Pemasukan dikurangi pengeluaran ...` di hero dihapus.
- User baru tetap dianggap cukup paham dari kombinasi:
  - `Sisa bulan ini` atau `Sisa periode ini`,
  - nominal hero,
  - chip `Periode aktif`,
  - metric `Pengeluaran`,
  - metric `Total saldo`.
- Penjelasan tambahan sebaiknya tidak permanen di hero. Jika nanti user feedback menunjukkan kebingungan, gunakan tooltip/info kecil atau onboarding, bukan subtitle permanen.
- Pengaturan theme dipindahkan ke Dashboard karena lebih cepat ditemukan dan lebih cocok sebagai preferensi visual global.

## Delivered changes

### 1. Hero subtitle removed

Updated:

```text
apps/mobile/app/(tabs)/index.tsx
```

Removed permanent subtitle under hero amount:

```text
Income minus spending for ...
Pemasukan dikurangi pengeluaran ...
```

Hero now reads cleaner:

```text
Sisa bulan ini
Rp 1.250.000

Periode aktif: Jun 2026
```

For saved/custom report period:

```text
Sisa periode ini
Rp 850.000

Periode aktif: Siklus gajian · 25 Mei – 24 Jun 2026
```

### 2. Dashboard privacy toggle uses Phosphor icons

Updated:

```text
apps/mobile/app/(tabs)/index.tsx
apps/mobile/src/components/icons/kaswise-icons.tsx
```

The dashboard nominal hide/show control is icon-only:

```text
Eye      = nominal visible
EyeSlash = nominal hidden
```

Accessibility labels remain explicit and bilingual:

```text
Sembunyikan nominal dashboard / Hide dashboard amounts
Tampilkan nominal dashboard / Show dashboard amounts
```

### 3. Dashboard theme toggle added

Updated:

```text
apps/mobile/app/(tabs)/index.tsx
apps/mobile/src/components/icons/kaswise-icons.tsx
```

Dashboard header now has a theme toggle beside the avatar:

```text
Sun  = switch to light mode when dark is active
Moon = switch to dark mode when light is active
```

Accessibility labels:

```text
Ganti ke mode terang / Switch to light mode
Ganti ke mode gelap / Switch to dark mode
```

The toggle uses the existing `useTheme().toggleTheme()` flow, so it still persists to:

```text
kaswise:theme-preference
```

### 4. Appearance section removed from Settings

Updated:

```text
apps/mobile/app/(tabs)/settings.tsx
apps/mobile/__tests__/settings-screen.test.tsx
```

Removed Settings section:

```text
Tampilan / Appearance
System / Light / Dark
```

Settings now keeps language, notifications, account/profile/security, family, and logout controls, while theme control lives on Dashboard.

## Design notes

Applied impeccable/product polish principles:

- Theme control is global, so it lives in Dashboard header, not inside the finance hero.
- Privacy/nominal visibility remains inside hero because it affects the financial numbers shown there.
- Icon buttons use muted surfaces, soft border, and restrained color so they do not compete with the main financial number.
- Hero support copy was removed instead of made decorative, reducing cognitive load and making the active-period chip carry the contextual work.

## Validation performed

Commands run after this polish:

```bash
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath \
  __tests__/tabs-index.test.tsx \
  __tests__/reports-screen.test.tsx \
  __tests__/transactions-swipe-actions.test.tsx \
  __tests__/screen-light-accent-regression.test.tsx \
  __tests__/settings-screen.test.tsx \
  --runInBand
corepack pnpm --filter mobile export:pwa
```

Results:

```text
type-check ✅
focused tests ✅ 55 passed
export:pwa ✅
```

Latest local exported bundle:

```text
/_expo/static/js/web/entry-5b9f2acf432fe1853343761e15f0a7e8.js
```

## Files changed

Runtime:

```text
apps/mobile/app/(tabs)/index.tsx
apps/mobile/app/(tabs)/settings.tsx
apps/mobile/src/components/icons/kaswise-icons.tsx
```

Tests:

```text
apps/mobile/__tests__/tabs-index.test.tsx
apps/mobile/__tests__/settings-screen.test.tsx
```

Docs:

```text
docs/handoffs/AI_CONTINUATION_HANDOFF_DASHBOARD_THEME_HERO_SIMPLIFICATION_2026-06-06.md
docs/README.md
```

## Deployment notes

No production deploy is required unless explicitly requested.

If deploying:

```bash
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa
```

Then verify:

```bash
curl -fsS https://api.kaswise.com/health
curl -fsSL -H 'Cache-Control: no-cache' 'https://kaswise.com/?v=dashboard-theme-hero-20260606' | grep -o '/_expo/static/js/web/entry-[^"'"']*\.js' | head -1
```

## Manual QA recommendation

1. Open Dashboard.
2. Verify hero no longer shows `Pemasukan dikurangi pengeluaran ...` or `Income minus spending for ...`.
3. Tap Eye/EyeSlash, verify dashboard nominal masking still works.
4. Tap Sun/Moon in header, verify theme switches and persists after reload.
5. Open Settings, verify Appearance section is gone.
6. Switch language and verify Dashboard labels/accessibility behavior remain appropriate.
