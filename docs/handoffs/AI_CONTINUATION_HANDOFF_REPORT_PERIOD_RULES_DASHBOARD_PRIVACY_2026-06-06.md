# AI Continuation Handoff — Report Period Rules + Dashboard Privacy

Date: 2026-06-06
Repo: `/home/Danu88/catat-in`
Branch: `ops/hardening-bundle`
Primary app: `apps/mobile`
Live PWA: `https://kaswise.com`

## Purpose

Dokumen ini mencatat perubahan terbaru untuk periode laporan tersimpan, sinkronisasi periode antar halaman, konsistensi bahasa, dan tombol hide/view nominal dashboard.

Fokus product decision yang dipertahankan:

- `Total saldo` tetap berarti **semua dompet aktif**, bukan cashflow periode.
- Hero dashboard menampilkan nilai actionable: pemasukan dikurangi pengeluaran untuk periode aktif.
- Periode aktif harus bisa dipilih dari Reports dan dipakai juga oleh Dashboard serta Transactions.
- Bahasa UI harus mengikuti bahasa aplikasi yang dipilih.

## Delivered changes

### 1. Shared active report period state

Added:

```text
apps/mobile/src/state/report-period.tsx
```

Provider dipasang di root app:

```text
apps/mobile/app/_layout.tsx
```

State baru mendukung:

- preset: `month`, `3month`, `6month`, `year`
- custom date range
- saved monthly-cycle rule

Contoh saved rule:

```text
Siklus gajian
Tanggal 25 sampai 24
```

Saat tanggal berjalan berada di Juni 2026, rule `25–24` dihitung sebagai:

```text
25 Mei 2026 – 24 Jun 2026
```

Saat lewat siklus berikutnya, range otomatis bergeser mengikuti bulan aktif.

### 2. Saved report period rules on Reports

Updated:

```text
apps/mobile/app/(tabs)/reports.tsx
```

Reports sekarang memiliki section:

```text
Aturan periode / Saved periods
```

Behavior:

- User pilih `Kustom / Custom`.
- User atur tanggal mulai dan selesai.
- User bisa tap `Simpan sebagai aturan / Save as rule`.
- Rule tersimpan muncul sebagai chip di Reports.
- Tap rule tersimpan akan mengaktifkan periode tersebut.
- Reports summary, chart, category breakdown, comparison, top expenses, dan share text memakai periode aktif yang sama.

UX polish yang diterapkan:

- Copy lebih pendek dan natural untuk mobile.
- Touch target CTA dan saved rule chip dibuat minimal 44px.
- Save rule juga tersedia dari modal date range, bukan hanya dari prompt bawah.
- Empty state saved rules menjelaskan bahwa custom range bisa disimpan untuk dipakai ulang.

### 3. Dashboard monthly/period hero sync

Updated:

```text
apps/mobile/app/(tabs)/index.tsx
```

Dashboard hero membaca shared active period.

Default current month:

```text
Sisa bulan ini
Pemasukan dikurangi pengeluaran Jun 2026
```

Saved/custom period:

```text
Sisa periode ini
Pemasukan dikurangi pengeluaran 25 Mei – 24 Jun 2026
```

Dashboard chip menampilkan:

```text
Periode aktif: Siklus gajian · 25 Mei – 24 Jun 2026
```

Jika periode bukan bulan berjalan, tombol reset tetap tersedia:

```text
Bulan ini / This month
```

`Total saldo` tetap secondary metric:

```text
Total saldo / Total balance
Semua dompet aktif / All active wallets
```

### 4. Dashboard hide/view nominal

Updated:

```text
apps/mobile/app/(tabs)/index.tsx
apps/mobile/__tests__/tabs-index.test.tsx
```

Dashboard sekarang punya tombol:

```text
Sembunyikan / Hide
Lihat / Show
```

Saat disembunyikan, nominal dimask menjadi:

```text
Rp ••••••
```

Area yang dimask:

- hero period net value
- `Total saldo`
- period expense metric
- recent transaction amounts
- budget alert nominal

Preference disimpan lokal:

```text
kaswise:dashboard-nominal-hidden
```

Catatan: ini adalah privacy display preference lokal perangkat/browser. Ia tidak mengubah data finansial atau query.

### 5. Transactions sync with report period

Updated:

```text
apps/mobile/app/(tabs)/transactions.tsx
apps/mobile/__tests__/transactions-swipe-actions.test.tsx
```

Transactions sekarang default filter ke:

```text
Laporan / Report
```

Card konteks menampilkan periode laporan aktif:

```text
Periode laporan: Siklus gajian · 25 Mei – 24 Jun 2026
```

User tetap bisa override cepat ke:

```text
Minggu / Week
Bulan / Month
Tahun / Year
```

### 6. Language consistency

Updated:

```text
apps/mobile/app/(tabs)/index.tsx
apps/mobile/app/(tabs)/reports.tsx
apps/mobile/app/(tabs)/transactions.tsx
apps/mobile/src/components/FinanceContextSwitcher.tsx
```

Hardcoded copy di area yang tersentuh sudah dipindahkan ke branch `isEn`/Bahasa Indonesia setempat.

Examples:

- `Manage` → `Kelola` saat bahasa Indonesia.
- `Profile` → `Profil` saat bahasa Indonesia.
- Reports a11y labels mengikuti bahasa app.
- Transactions period labels mengikuti bahasa app.

### 7. Persistence and Supabase migration

Added:

```text
supabase/migrations/202606060001_report_period_rules.sql
```

Migration membuat:

```text
public.report_period_rules
public.report_period_preferences
```

Dengan RLS user-owned:

```text
Users can manage their report period rules
Users can manage their report period preferences
```

Important:

- App tetap punya local fallback via AsyncStorage jika tabel remote belum tersedia.
- Untuk persistence lintas logout/session yang lebih kuat, migration ini perlu diterapkan ke Supabase production.
- Jangan menjalankan blanket migration push tanpa dry-run karena repo pernah punya riwayat migration reconciliation.

Recommended production migration flow:

```bash
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

## Validation performed

Focused validation after final language/privacy changes:

```bash
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath \
  __tests__/tabs-index.test.tsx \
  __tests__/reports-screen.test.tsx \
  __tests__/transactions-swipe-actions.test.tsx \
  __tests__/screen-light-accent-regression.test.tsx \
  --runInBand
corepack pnpm --filter mobile export:pwa
```

Results:

```text
type-check ✅
focused tests ✅ 46 passed
export:pwa ✅
```

Latest local exported bundle before deploy:

```text
/_expo/static/js/web/entry-7dd5bdcbb0372e1d3b07ddcfe69e462e.js
```

## Files changed

Primary runtime files:

```text
apps/mobile/app/_layout.tsx
apps/mobile/app/(tabs)/index.tsx
apps/mobile/app/(tabs)/reports.tsx
apps/mobile/app/(tabs)/transactions.tsx
apps/mobile/src/components/FinanceContextSwitcher.tsx
apps/mobile/src/state/report-period.tsx
```

Tests:

```text
apps/mobile/__tests__/tabs-index.test.tsx
apps/mobile/__tests__/reports-screen.test.tsx
apps/mobile/__tests__/transactions-swipe-actions.test.tsx
apps/mobile/__tests__/screen-light-accent-regression.test.tsx
```

Schema:

```text
supabase/migrations/202606060001_report_period_rules.sql
```

## Deployment notes

PWA deploy command:

```bash
corepack pnpm --filter mobile deploy:pwa
```

Post-deploy checks:

```bash
curl -fsS https://api.kaswise.com/health
python3 - <<'PY'
from urllib.request import Request, urlopen
html = urlopen(Request('https://kaswise.com/?v=report-period-rules', headers={'Cache-Control': 'no-cache'}), timeout=20).read().decode('utf-8', 'ignore')
print(html[:500])
PY
```

Recommended manual QA:

1. Login to `https://kaswise.com`.
2. Switch language to Indonesian and English, verify Dashboard/Reports/Transactions labels follow language.
3. Reports → Custom → choose range → save as rule.
4. Select saved rule, confirm Dashboard and Transactions follow the same period.
5. Dashboard → tap `Sembunyikan`, verify all dashboard nominal values are masked.
6. Dashboard → tap `Lihat`, verify values return.
7. Logout/login, verify selected period preference remains available on the same device; after Supabase migration, verify remote persistence as well.

## Known caveats

- Saved rules currently support monthly-cycle rules only. Weekly/quarterly/custom fiscal rules are not implemented.
- There is no edit/delete/manage saved rules UI yet.
- The local privacy toggle is device/browser local, not account-synced.
- Remote saved-period persistence depends on applying the new Supabase migration.
- `.pi/` remains local tool metadata and should not be committed.
