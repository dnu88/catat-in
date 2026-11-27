# Proposal build: disiplin kategori AI (6 prinsip disetujui Danu)

Status: KANDIDAT GABUNGAN (realtime refetch + kategori AI) — siap rilis menunggu approval deploy final
Worktree: `~/.hermes/profiles/kaswise-mobile/cache/scratch/category-ai` (branch `feat/category-ai-discipline`, dari origin/main `55a2ee7`)
Belum di-commit/push/PR/deploy. Migrasi skema + normalisasi BELUM dieksekusi ke produksi (approval deploy final Danu).

## Keputusan Danu (28 Nov, terpasang)

1. Pemetaan tak terpetakan → daftar penuh (lihat dry-run); ambigu (Belanja, investment) → Other expenses user; **review 28 Nov**: `freelance` → **Freelance** (kategori INCOME — bug lama Other expenses diperbaiki), `Pendidikan` → **Education**. Guard umum: target wajib se-tipe dengan transaksi (mismatch → skip + dilaporkan); fallback ambigu mengikuti tipe (expense → Other expenses user; income → Lainnya/Other income user; tanpa fallback → teks dibiarkan + dilaporkan, TIDAK membuat kategori). Tes: `test_normalize_category_guard.py` 12 kasus.
2. Chip "Buat kategori" = expense saja ✓ (sudah).
3. Normalisasi semua akun ✓.
4. Migrasi + normalisasi: jangan dieksekusi sekarang; jalan saat rilis gabungan setelah approval deploy final.
5. Gap user tanpa kategori sama sekali (03ebbe0e, 5 baris): saat --execute dibuatkan SATU kategori "Other expenses" minimal (bukan default set penuh) → semua barisnya dipetakan ke situ. Paling aman, tercatat di laporan eksekusi.

## Masalah & bukti (audit 27 Nov, read-only)

`transactions` menyimpan kategori sebagai TEKS. 181 transaksi Danu = 21 nilai kategori
berbeda, 7 di luar daftar user (`Makan & Minum` 27, `Belanja Bulanan` 9, dst.) + duplikat
`Credit Card`/`Kartu Kredit`. Akar: `resolveCategory` return nama bebas; prompt backend
`"category": string` tanpa daftar user.

## 6 prinsip disetujui → status kandidat

| # | Prinsip | Status | Bukti |
|---|---|---|---|
| 1 | AI pilih dari daftar user + Other, teks/suara/struk + backend | **candidate-tested** (teks+backend) / struk menganut resolve kategori existing | classifier test, pytest backend 284 |
| 2 | Saran kategori baru menunggu user (chip) | **candidate-tested** | chip test 4/4 |
| 3 | Belajar dari koreksi (merchant rules) | **candidate-tested** (service+apply+learning), runtime device belum | merchant-rules test 4/4 |
| 4 | Simpan pakai category_id | **DDL-tested** (DB lokal disposable 21 PASS); penulisan id belum dibangun (transisi) | migrasi 202611280001 |
| 5 | Normalisasi data lama sekali jalan | **dry-run selesai**; eksekusi menunggu approval | 110 baris match + 1 re-point |
| 6 | AI tidak yakin → perlu dicek | **candidate-tested** | generic_category auto-save block existing + discipline |

## Matriks kasus tepi

| Kasus | Perilaku |
|---|---|
| Draf Indonesia vs daftar user Inggris | canonical id match tetap (bukan nyasar) — test `draf Indonesia tetap cocok` |
| Kategori di luar daftar | Other expenses tersimpan + `suggestedCategory` di metadata extraction + chip |
| Auto-save dengan kategori Other | diblok (`generic_category`), selalu review |
| Merchant rule vs tebakan AI | rule menang; saran dibersihkan |
| Koreksi user + merchant | rule upsert fire-and-forget, gagal tidak menghalangi simpanan |
| Chip "Buat" | createCategory (type expense) → kategori langsung dipilih |
| Flag OFF | perilaku baseline persis: nama bebas boleh, tanpa chip, tanpa prompt user-list |

## Yang TIDAK berubah

Alur Capture (review-first, auto-save, idempotensi simpan, fingerprint/retry), nilai
nominal/tipe/dompet/tanggal, UI Reports, trigger saldo, RLS existing, flag visual lain.

## Flag rollout

`categoryAiDiscipline` — terdaftar 3 tempat (skill): `src/config/features.ts` (getter
default OFF semua platform), `scripts/rollout-flags.cjs` (`ROLLOUT_FLAG_ENV_KEYS`), dan
`scripts/deploy-pwa.mjs` (env map + resolve + kedua blok runtime `index.html`).
`features.test.ts` + `rollout-flags.test.ts` menjaga pendaftaran.

## Rencana tes & hasil

- Mobile: `tsc --noEmit` OK; jest fokus — classifier 21, features 25, merchant-rules 4,
  chip 4, + suite transaksi-lain (angka di laporan akhir).
- Backend: pytest 284/284 (11 test baru validasi kategori, TDD).
- DB: harness rekonstruksi parsial (bukan dump produksi) — 21 asersi PASS, container
  disposable sudah dibersihkan.

## Fase

- **P1 (selesai):** classifier + AI mapping discipline (mobile), prompt backend + validasi
  output, chip saran, merchant rules service+apply+learning.
- **P2 (kandidat, butuh eksekusi):** kolom `category_id` ditulis semua jalur simpan
  (migrasi sudah tervalidasi), reader laporan memakai id dulu.
- **P3 (butuh approval):** eksekusi normalisasi data lama + re-point duplikat Kartu Kredit.
- **P4 (nanti):** struk/foto pakai daftar user di prompt OCR, review queue khusus saran.

## Keputusan untuk Danu (4)

1. Eksekusi migrasi skema (`category_id` + `merchant_category_rules`) ke Supabase? —
   rekomendasi: ya, saat P2.
2. Eksekusi normalisasi 110 baris + 1 re-point duplikat (backup otomatis + rollback)?
   Target kanonik: `Credit Card` bertahan. 3 baris user lain gap pemetaan (Food/Transport/
   Salary tidak ada di daftarnya) — biarkan atau tambah kategori dulu?
3. Nilai tak terpetakan lain (16 `food`, 13 `Belanja Pribadi`, 6 `Kesehatan`, 4 `Hiburan`,
   dst.) — masukkan pemetaan tambahan atau biarkan?
4. Chip "Buat kategori" membuat kategori expense statis — atau ikutkan tipe income juga?
