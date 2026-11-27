# Proposal: Kategori hasil AI selalu dari daftar user (plus 'Lainnya') — kandidat baru menunggu konfirmasi

Status: DRAFT — untuk keputusan Danu (bukan rilis)
Tugas: Audit read-only atas permintaan Danu, 27 Nov (setelah bug realtime refetch)
Lingkup: apps/mobile (Capture/transaction-entry, classifier, Reports, migration data) + backend ai_service.py

## 1. Masalah (bukti dari data produksi read-only)

Transaksi menyimpan kategori sebagai TEKS (`kategori`), bukan `category_id`. Akun Danu
(danubudiarto88@gmail.com) sekarang:

- `categories` user: **17** — termasuk duplikat `Credit Card` + `Kartu Kredit` (dua-duanya
  expense, dua id).
- `transactions`: **181 baris, 21 nilai `kategori` berbeda**, 7 di antaranya tidak ada di
  daftar user: `Makan & Minum` (27), `Belanja Bulanan` (9), `Transportasi` (6),
  `Kebutuhan Rumah & Pribadi` (4), `Lainnya` (2), `Olahraga` (1), `Gaji` (1).
- Penyebab di kode:
  - Mobile: `resolveCategory` (`src/services/transaction-classifier.ts`) — kalau konsep
    tidak match kategori user, return `{ id: null, name: concept.fallbackName }`
    (label bahasa aktif), sehingga nilai "nyasar" tersimpan sebagai teks.
  - Backend: `ai_service.py` prompt meminta `"category": string` bebas — model bebas
    mengarang nama di luar daftar user (tidak ada daftar kategori user di prompt).
- Dampak: Reports sudah menggabungkan lewat `getCategoryCanonicalId` (id/en ekuivalen),
  tapi Budget, ikon/palette, dan consumer lain yang match by name bisa bolong; data
  lama campur bahasa membuat statistik per kategori tidak dapat diandalkan.

## 2. Prinsip yang tidak boleh dilanggar

1. Kategori tersimpan selalu milik daftar user (`categories.id`), BUKAN teks bebas.
2. AI hanya MEMILIH dari daftar user (+ `Other expenses` / `Lainnya` sebagai tempat
   jatuh). AI TIDAK PERNAH membuat kategori baru secara diam-diam.
3. Saran kategori baru boleh — tapi harus dikonfirmasi user sebelum dibuat.
4. Data historis: normalisasi hanya dengan backup + approval per daftar pemetaan.

## 3. Rancangan arah ideal

### F1 — Kontrak simpan: `category_id` sebagai sumber kebenaran
- Tambah kolom `category_id` (FK → `categories.id`) di `transactions`; `kategori`
  (teks) tetap ditulis sebagai salinan label untuk kompatibilitas laporan lama.
- Semua jalur tulis (AI teks/suara/struk, manual, edit, import) wajib mengirim
  `category_id`. Teks dilarang jadi satu-satunya sumber.
- `resolveCategory` tidak lagi return `{ id: null, name: fallbackName }` — fallback
  jadi `Other expenses` id (id bisa null hanya jika user belum punya kategori itu).

### F2 — Prompt AI terikat daftar user
- Backend `ai_service.py`: sertakan daftar kategori user (id + nama + tipe) di prompt
  dan minta model memilih `category_id` dari daftar; instruksi eksplisit "jika tidak
  cocok, pilih Other expenses dan setel `category_suggestion`".
- Field baru di respons: `category_suggestion: { name, reason } | null` — hanya
  berlaku sebagai SARAN, bukan kategori.

### F3 — Alur saran kategori baru (konfirmasi user)
- Hasil AI dengan kategori tidak dikenal → chip di Review: "AI menyarankan kategori
  baru: 'X' (alasan)". User pilih: pakai `Other expenses` ATAU buat kategori 'X'
  (setelah buat, langsung dipilih). Tidak ada pembuatan otomatis.
- Merchant → kategori yang dipelajari: tabel `merchant_category_rules`
  (merchant_norm → category_id, source: 'user_correction', hits). Setiap koreksi user
  (Review/Simpan) menulis rule; AI capture berikutnya cocokkan merchant_norm dulu
  (lewat backend + cache mobile), sebelum model bahasa dipanggil.

### F4 — Normalisasi data lama (setelah approval, per daftar)
- Backup `transactions` user ke JSON + row dump sebelum apa pun.
- Kandidat migrasi (dari data Danu, memakai `getCategoryCanonicalId`): semua 7 nilai
  "di luar daftar" di atas map ke kategori kanonik yang sudah ada
  (`Makan & Minum`→`Food & Beverage`, `Belanja Bulanan`→`Groceries`,
  `Transportasi`→`Transport`, `Kebutuhan Rumah & Pribadi`→`Household & Personal Care`,
  `Lainnya`→`Other expenses`, `Olahraga`→`Sport`, `Gaji`→`Salary`).
- Duplikat `Kartu Kredit` vs `Credit Card`: pilih satu id sebagai kanonik, re-point
  transaksi, lalu hapus duplikat (perlu approval id mana yang bertahan).
- Setelah F1, script re-point sekali jalan (idempotent, dibackup dulu).

## 4. Matriks kasus tepi

| Kasus | Perilaku |
|---|---|
| AI keluar kategori di luar daftar | Simpan `Other expenses` id + saran tersimpan terpisah |
| User koreksi kategori | `merchant_category_rules` ditulis; berikutnya auto |
| Kategori user dihapus yang masih dipakai transaksi | Re-point ke `Other expenses` saat hapus (backup dulu) |
| Dua kategori ekuivalen (id/en) | Satu id dipilih user sebagai kanonik (dedup UI) |
| Import CSV bank | Parser wajib resolve id; gagal resolve → review queue |

## 5. Eksplisit TIDAK berubah

- Nilai nominal/tipe/dompet/tanggal, alur Capture (review ringkas), UI Reports,
  trigger saldo, RLS. F4 hanya menulis ulang nilai `kategori`/`category_id` —
  bukan menghapus transaksi.

## 6. Rencana tes (per fase)

- F1: migration validation di DB lokal disposable; kontrak insert tanpa category_id
  ditolak (bila dijadikan NOT NULL — rekomendasi: mulai nullable + service-level guard).
- F2: pytest backend (prompt memuat daftar + respons selalu id dari daftar / null).
- F3: jest (chip saran muncul; konfirmasi membuat kategori; tanpa konfirmasi → Other).
- F4: dry-run report (count per pemetaan) di DB lokal; bukti backup; read-back.

## 7. Keputusan yang diminta dari Danu (pilih 4)

1. **F1 sekarang?** (rekomendasi: YA — mulai nullable + guard, bukan NOT NULL)
2. **F2 backend prompt**: sertakan daftar kategori user di prompt DeepSeek/GLM?
   (rekomendasi: YA)
3. **F3 alur saran**: chip konfirmasi di Review Ringkas, atau langsung Other
   tanpa saran? (rekomendasi: chip + tombol "Buat kategori")
4. **F4 normalisasi data lama**: eksekusi pemetaan 7 kategori di atas + dedup
   `Kartu Kredit`/`Credit Card`? Kalau ya: id mana yang jadi kanonik untuk Kartu
   Kredit (`Credit Card` — rekomendasi, karena dipakai 3 transaksi vs 1)?
