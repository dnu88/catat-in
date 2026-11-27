# Paket B1 — Visual foundation (scope + acceptance)

Status: **in progress** (pilot). Turunan dari `docs/design/moonveo-reference/gap-matrix.json`.
Paket A (relaibilitas notifikasi + pengelompokan Setelan) sudah live di `app.kaswise.com`.

## Ruang lingkup (G03–G07)

| Gap | Area | Yang dikerjakan di B1 |
| --- | --- | --- |
| G03 | Tipografi dan angka | Satu type ramp presentasi + **tabular digits** untuk semua nominal |
| G04 | Ritme spacing | Row height, gap, padding dari satu skala token |
| G05 | Surface, border, shadow | Hierarki elevation bernama (`flat → card → raised → floating`) |
| G06 | Sistem kontrol | State selected/pressed/disabled/loading dari token yang sama |
| G07 | Ikon dan affordance | Ukuran tile/glyph ikon dari token; mapping kategori TIDAK diubah |

## Aturan yang dipegang

- Sumber warna tetap tunggal: `src/theme/finance-editorial.ts`. Token presentasi **hanya mereferensi**, tidak pernah menyalin hex/rgba.
- Tidak ada perubahan pada perhitungan saldo, trigger wallet, RLS, entitlements, harga, AI provider, atau flag rollout.
- Perubahan visual **digerbangi flag `simplePremiumExperience`**: OFF harus tetap identik dengan baseline (kondisi acceptance Paket A/P1).
- Tidak mengubah menu pencatatan existing, stack dompet Home, atau identitas navy–biru light-first.

## Strategi eksekusi

1. Perluas token presentasi (`src/theme/experience-tokens.ts`) — additive, dengan test semantik.
2. Primitif bersama baru: `AmountText` (tabular digits + warna semantik dari palette).
3. **Layar pilot = Transaksi** (`app/(tabs)/transactions.tsx`): ritme row, nominal, stat card, chip, ikon.
   Layar lain belum disentuh sampai pilot dinilai.
4. Bukti before/after 360/390/430 dari preview lokal (harness stub, bukan produksi).
5. Gerbang: `type-check`, focused jest, full jest, `quality:live`. Deploy TIDAK dilakukan tanpa persetujuan terpisah.

## Acceptance B1 pilot

- [x] Nominal memakai tabular digits (row, stat) sehingga kolom angka rata.
- [x] Row transaksi memakai ritme token (min height 56) tanpa mengubah swipe/selection.
- [x] Chip periode/filter punya state konsisten (selected vs idle terlihat jelas) + pressed feedback saat premium.
- [x] Ikon row 44×44 dari token (tidak lagi 44 wrapper vs 40 bubble).
- [x] Flag OFF identik baseline; test lama hijau.
- [x] Before/after tersedia (6 PNG, 3 viewport) — **menunggu review pengguna sebelum meluas ke layar lain**.
- [x] Tidak ada commit, push, deploy, atau perubahan flag; batas "Home stack tetap"/"Capture existing" tidak disentuh.

## Bukti eksekusi (2026-10-04)

| Item | Hasil |
| --- | --- |
| Token presentasi | `src/theme/experience-tokens.ts`: type ramp bernama + `experienceTabularNumerals`, `experienceElevation` (flat→floating), `experienceIcon`, `target.chipMinHeight`/`rowMinHeight` |
| Primitif | `src/components/ui/AmountText.tsx` (tabular + warna semantik, tanpa aritmetika) + barrel export |
| Layar pilot | `app/(tabs)/transactions.tsx` — 103 baris diff vs snapshot baseline `docs/qa/package-a-baseline/...`; semua perubahan presentasi, tidak ada perubahan query/logika finansial |
| Test baru | `src/theme/experience-tokens.test.ts` (26 kasus), `src/components/ui/AmountText.test.tsx` (8), `__tests__/transactions-b1-visual-foundation.test.tsx` (9) |
| Test fokus | 55 passed / 0 failed (4 suite, `--runInBand`, exit 0) |
| Type-check | exit 0 |
| Preview browser | `tests/experience/b1-visual-foundation.spec.ts` → `test-results/experience/b1-transactions-{off,on}-{360,390,430}.png` |

### Hasil ukur di bundle nyata (Playwright, 360/390/430)

`9 passed / 0 failed`, 0 page error. Angka computed style identik di ketiga viewport:

| Properti | Sebelum (flag OFF) | Sesudah (flag ON) |
| --- | --- | --- |
| `font-variant-numeric` nominal | `normal` | `tabular-nums` |
| `min-height` row | `58px` | `56px` (token `rowMinHeight`) |
| tile ikon row | `40×40` | `44×44` (token `icon.tile.row`) |
| border chip periode (idle) | `0px` / transparan | `1px` / `fe.line` |
| tepi kanan 3 nominal berbeda panjang | menyesuaikan lebar teks | **identik** (332/362/402 px per viewport) |

Screenshot: `apps/mobile/test-results/experience/b1-transactions-{off,on}-{360,390,430}.png`.
Log mentah: `MEASURE b1Before=…`, `MEASURE b1After=…`, `MEASURE b1AmountRightEdges=…`.

### Gates

| Gerbang | Hasil |
| --- | --- |
| `corepack pnpm test -- --runInBand` | **112 suite passed / 1017 passed / 8 skipped (pre-existing) / 0 failed**, exit 0 |
| `corepack pnpm type-check` | exit 0 |
| `corepack pnpm quality:live` | **exit 0** — registry OK, type-check 0, live regression 10 suite/156 passed, export OK, **43/43 marker** ada di bundle |
| Playwright preview B1 | 9 passed / 0 failed |

Baseline pra-B1 (Paket A): 110 suite / 990 passed / 8 skipped → delta B1 = +2 suite, +27 test, skipped tidak bertambah.

## B1 lanjutan — Beranda, Dompet, Setelan (disetujui 2026-10-04)

Aturan sama: semua perubahan presentasi digerbangi `simplePremiumExperience`, dan flag OFF harus identik baseline.

### Beranda (`app/(tabs)/index.tsx`) — token saja, stack dompet TIDAK disentuh

- `heroAmount` (saldo) → role `heroBalance` (38, tabular). `heroMetricValue` → `metricAmount` (15, tabular). `txAmount` (recent) → `recentAmount` (13, tabular).
- `sectionTitle` → role `sectionTitle` (20/600/-0.35). `attentionRow` & `txRow` → `target.rowMinHeight` + `experienceSpacing[3]`.
- `txBubble` → `experienceIcon.tile.section` (36) dan glyph dari `glyphRatio` (18). Nilai sama seperti sebelumnya, sekarang bertoken.
- Struktur dekoratif `walletStack*` (tiga lapis kartu) **tidak diubah satu baris pun**.
- Diff vs snapshot baseline: **83 baris, seluruhnya perubahan B1**.

### Dompet (`app/(tabs)/wallets.tsx`)

- `totalValue` → role `walletTotal` (32/800/-0.5, tabular); `walletStackBalance` dan `walletBalance` dapat tabular tanpa mengubah ukuran/bobot.
- `walletTop` gap → `experienceSpacing[3]`.
- Diff vs snapshot baseline: **51 baris, seluruhnya perubahan B1**. testID baru untuk pengukuran: `wallets-total-value`, `wallet-balance-<id>`, `wallets-stack-balance`.

### Setelan (`app/(tabs)/settings.tsx` + `src/components/settings/SettingsNavigationRow.tsx`)

- Header `title`/`subtitle` → role `screenTitle` / `body`.
- `SettingsNavigationRow` menerima prop `premium` (default false) — baris yang sama dipakai layout legacy dan premium, jadi prop eksplisit wajib supaya OFF tetap byte-identik. Saat premium: tile ikon 40 → 44 (`experienceIcon.tile.row`), min-height dari token (56), judul dari role `cardTitle`.
- Tujuh call site di `settings.tsx` meneruskan `premium={featureFlags.simplePremiumExperience}`.
- **Catatan kejujuran diff:** snapshot `package-a-baseline` untuk `settings.tsx` mendahului rework Paket A, sehingga diff seluruh file bercampur dan **tidak boleh** dibaca sebagai delta B1. Delta B1 di file ini = hunk yang tercatat di bagian ini saja.

### Hasil ukur B1 lanjutan (bundle nyata, 360/390/430)

`18 passed / 0 failed` (dua spec B1), 0 page error.

| Layar | Properti | Sebelum (OFF) | Sesudah (ON) |
| --- | --- | --- | --- |
| Beranda | saldo hero `font-variant-numeric` | `normal` | `tabular-nums` |
| Beranda | saldo hero `font-size` / warna | `38px` / putih | **identik** |
| Beranda | metrik hero | `normal`, `15px` | `tabular-nums`, `15px` |
| Dompet | total hero | `normal`, `28px` | `tabular-nums`, `28px` |
| Setelan | tile ikon baris | `40px` | `44px` |
| Setelan | `min-height` baris | `56px` | `56px` (dari token) |

Screenshot: `test-results/experience/b1-{home,wallets,settings,transactions}-{off,on}-{360,390,430}.png` (24 PNG).

**Regresi yang tertangkap dan diperbaiki:** role `walletTotal` awalnya memakai langkah skala baru 32px, padahal total hero Dompet sudah ship di 28px (`theme.typography.fontSize['4xl']` = 28, bukan 32). Pengukuran browser gagal pada assertion "ukuran tidak berubah", langkah skala 32px dibuang, role kembali 28px, dan ditambahkan test parity (`keeps every replacement role at its legacy size`) supaya kesalahan sejenis tidak lolos lagi di level unit.

### Gates B1 lanjutan

| Gerbang | Hasil |
| --- | --- |
| Focused jest (11 suite terdampak) | 129 passed / 8 skipped (pre-existing) / 0 failed |
| `corepack pnpm test -- --runInBand` | **113 suite passed / 1023 passed / 8 skipped (pre-existing) / 0 failed**, exit 0 |
| `corepack pnpm type-check` | exit 0 |
| Playwright preview B1 (2 spec × 3 viewport) | **18 passed / 0 failed**, 0 page error |
| `corepack pnpm quality:live` | **exit 0** — registry 13 fitur/43 marker valid, type-check 0, live regression 10 suite/156 passed, export OK, **43/43 marker** di bundle `entry-ab81b403566095e4f1b3c6850a3bcd91.js` |

Baseline Paket A: 110 suite / 990 passed / 8 skipped → B1 total (pilot + lanjutan) = +3 suite, +33 test, skipped tidak bertambah.

### Sisa/berikutnya (belum dikerjakan, di luar pilot+lanjutan)

- Chip/segmented control di layar selain Transaksi belum dipindah ke `experienceElevation`/state token bersama.
- Reports masuk **Paket B2** (hierarki informasi & kontrol periode), bukan B1.
- Komponen bersama lain (`Card`, `Button`, `FilterChip`) masih memakai `theme.shadow`; migrasi ke `experienceElevation` perlu keputusan karena dipakai banyak layar sekaligus.
