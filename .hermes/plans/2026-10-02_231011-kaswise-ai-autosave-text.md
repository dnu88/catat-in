# Kaswise — Auto-save Catat AI (teks) + Review Wajib untuk Struk

- Tanggal: 2026-10-02 23:10 WIB
- Repo: `/home/Danu88/apps/kaswise`
- Branch kerja: `feat/kaswise-ai-autosave-text` (dibuat dari `release/v2-transaction-entry`, HEAD `f51b0d5`)
- Baseline mutu (dari rilis V2): Jest 83/83 suite lulus, `tsc --noEmit` exit 0, `quality:live` exit 0, 35 marker bundle terverifikasi
- Prasyarat produksi (SUDAH beres): provider AI = DeepSeek utama + Anthropic cadangan; `api.kaswise.com` sudah mengarah ke container backend yang benar (health 200)

## 1. Masalah

Sekarang setiap catatan AI (teks) wajib lewat layar review + tombol Simpan — dua langkah tambahan untuk kasus yang sudah jelas dan benar. Untuk struk/foto, review tetap wajib.

## 2. Keputusan terkunci (dari user, 2026-10-02)

1. **Teks**: otomatis simpan **hanya jika lolos semua syarat aman**; kalau tidak lolos → review seperti sekarang.
2. **2 transaksi atau lebih dalam satu kalimat → selalu review** (jangan otomatis).
3. **Jendela "Batalkan" = 10 detik** setelah otomatis tersimpan. Bar hasil bisa diketuk untuk membuka review dengan isian yang sudah ada (fungsi Ubah).
4. **Foto/struk: selalu konfirmasi**, tidak ada auto-save.

## 3. Aturan auto-save (spec murni, wajib lolos SEMUA)

| # | Syarat | Alasan |
|---|---|---|
| 1 | tepat **1** transaksi pada hasil ekstraksi | multi-transaksi rawan salah pasangan |
| 2 | `amount > 0` | nominal 0 = AI tidak paham |
| 3 | `confidence >= 0.85` | ambang sama dengan `HIGH_CONFIDENCE` yang sudah ada |
| 4 | kategori jelas: bukan `other`/"Lainnya"/"Other expenses" | `other` = AI tidak yakin |
| 5 | `type` ∈ {`expense`, `income`} (bukan `transfer`) | transfer wajib pilih dompet tujuan |
| 6 | hasil ekstraksi tidak berisi `unclear` | AI menandai sendiri keraguannya |
| 7 | drafts valid & ada dompet default | `allDraftsValid()` + dompet terpilih |

Kalau ada satu saja yang gagal → **review**, dengan alasan singkat yang bisa dibaca user (mis. "nominal belum disebutkan", "transfer perlu dompet tujuan", "AI kurang yakin").

## 4. Bukti dasar (uji nyata ke produksi, 2026-10-02)

| Kalimat | Hasil | Auto-save |
|---|---|---|
| `beli kopi 35rb` | 35.000 · food · 0.95 | lolos |
| `belanja bulanan 1,2jt di indomaret kemarin` | 1.200.000 · shopping · 0.95 | lolos |
| `gaji 5jt` | 5.000.000 · income · salary | lolos |
| `kemarin saya traktir teman makan malam kira kira 200 ribu` | 200.000 · food · 0.90 | lolos (batas) |
| `kopi 35rb dan makan siang 50rb` | 2 transaksi | gagal (syarat 1) |
| `transfer 500rb ke istri` | expense · other · tanpa tanggal | gagal (syarat 4 & 5) |
| `bayar listrik` | 0 · confidence 0 · unclear terisi | gagal (syarat 2 & 6) |
| `beli sesuatu` | 0 · confidence 0 | gagal (syarat 2 & 3) |

## 5. Lingkup

Termasuk: jalur **teks** di layar Capture (termasuk multi-transaksi → review), bar hasil auto-save + Batalkan 10 detik, alasan kenapa harus review, marker baru, test, rilis di balik flag.

Di luar lingkup (dicatat, tidak dikerjakan di plan ini):
- **Scan struk/foto otomatis** — menunggu provider AI yang bisa baca gambar (Anthropic masih habis kredit; perlu Gemini/opsi lain).
- **Kolom `auto_saved` di database** — penambahan skema produksi ditunda; pengukuran otomatis pakai counter lokal dulu (Task 02).
- Jalur suara/import.

## 6. Rencana tugas

### Task 01 — Fungsi murni `shouldAutoSaveEntry` + test unit
- **File baru**: `apps/mobile/src/features/transaction-entry/auto-save.ts`
- **Ubah**: ekspor `shouldAutoSaveEntry(input): {auto: boolean; reason: AutoSaveBlockReason | null}` dengan 7 syarat di §3. Ambang diambil dari `CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD` (`src/services/transaction-classifier.ts`, nilai 0.85). Tambah konstanta nama kategori "other" dari `transaction-review.ts` (`OTHER_CATEGORY_NAMES`) — jangan duplikasi daftar.
- **Test baru**: `apps/mobile/src/features/transaction-entry/auto-save.test.ts` — 12 kasus: 1 kalimat jelas lolos; multi-transaksi gagal; nominal 0 gagal; confidence 0.8 gagal; kategori other gagal; transfer gagal; `unclear` gagal; tanpa dompet gagal; 0.85 tepat batas lolos; income lolos; kategori kosong gagal; tanggal kosong gagal.
- **Verifikasi**: `npx jest auto-save --runInBand` hijau.
- ☐ selesai

### Task 02 — Counter lokal (pengukuran tanpa ubah skema)
- **File baru**: `apps/mobile/src/services/auto-save-metrics.ts` — `recordAutoSave(outcome: "kept" | "undone" | "edited")` menyimpan hitungan di penyimpanan lokal (AsyncStorage/localStorage lewat helper yang sudah ada).
- **Test**: unit test hitungan bertambah & tahan dibaca ulang.
- **Catatan**: angka ini yang dipakai menyetel ulang ambang 0.85 nanti (target awal: pembatalan < 5%).
- ☐ selesai

### Task 03 — Jalur auto-save di layar Capture (teks saja)
- **File**: `apps/mobile/app/(tabs)/capture.tsx`
- **Ubah**: pada titik setelah `classifyTransactionTextBatch(...)` menghasilkan drafts teks (`textDraftsToDrafts`) dan sebelum berpindah ke langkah review: panggil `shouldAutoSaveEntry`. Jika `auto: true` → jalankan **jalur simpan yang sama** dengan tombol Simpan review (`saveEntry` di `src/services/transaction-entry-persistence.ts`, request id idempotent yang sama) lalu tampilkan langkah hasil seperti sekarang.
- **Larangan**: jangan menyalin logika simpan; jangan mengubah `transaction-entry-persistence.ts`; struk (`receiptDraftsForMode`) tidak pernah masuk jalur ini.
- **Test**: test layar — kalimat aman → `transaction-review` **tidak** dirender, hasil sukses tampil; kalimat tidak aman → `transaction-review` dirender.
- ☐ selesai

### Task 04 — Bar hasil + Batalkan 10 detik + tap = Ubah
- **File**: `apps/mobile/src/components/transaction-entry/AutoSaveToast.tsx` (baru) + dipakai di `capture.tsx`
- **Ubah**: bar berisi "Tersimpan: <kategori> · Rp<nominal>" (teks sudah ada di kamus hasil, mis. `textSaved`), tombol **Batalkan** (menghapus transaksi yang baru dibuat → saldo dompet kembali otomatis lewat trigger DB), dan area ketuk → buka review dengan isian terisi. Hitung mundur 10 detik (`setTimeout` bersih saat unmount). Batalkan memanggil fungsi hapus yang sudah ada di `src/services/transactions.ts` (fungsi delete + pembersihan alokasi budget amplop yang sudah ada di file itu).
- **Marker baru**: `auto-save-toast`, `auto-save-undo`, `auto-save-edit` → wajib juga didaftarkan di `apps/mobile/scripts/required-markers.json`.
- **Test**: test layar — Batalkan memanggil delete 1×, bar hilang, hitungan metrics "undone"; setelah 10 detik bar hilang otomatis; ketuk bar → review terbuka terisi.
- ☐ selesai

### Task 05 — Alasan kenapa harus review
- **File**: `apps/mobile/app/(tabs)/capture.tsx` (+ kamus teks hasil yang sudah ada di file itu)
- **Ubah**: saat `auto: false`, tampilkan alasan dari `shouldAutoSaveEntry` sebagai satu baris di atas tombol review (mis. "nominal belum disebutkan", "AI kurang yakin — periksa dulu", "transfer perlu dompet tujuan").
- **Test**: test layar untuk 3 alasan berbeda.
- ☐ selesai

### Task 06 — Pastikan jalur struk tidak berubah
- **File**: `apps/mobile/__tests__/capture-entry-v2.test.tsx` (tambahan kasus)
- **Ubah**: tambah kasus: hasil dari jalur struk **selalu** merender `transaction-review` meski kategori jelas dan confidence tinggi (regresi penjaga keputusan #4).
- ☐ selesai

### Task 07 — Gerbang mutu
- Jalankan: `npx tsc --noEmit` (exit 0), `npx jest --runInBand` (semua hijau), `corepack pnpm quality:live` (exit 0: registry marker valid → type-check → test:live-regression → export:pwa → check:bundle 35+3 marker baru ada di bundle).
- ☐ selesai

### Task 08 — Rilis canary (flag) + verifikasi produksi
- Commit di branch `feat/kaswise-ai-autosave-text`, lalu ikuti pola rilis V2: snapshot `rollback-<ts>-canary-state/`, deploy bundle (flag OFF), nyalakan flag (`EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT=true`), verifikasi live dengan akun uji: 1 kalimat aman → tersimpan otomatis + bar muncul; Batalkan → saldo kembali; 1 kalimat ragu → review muncul.
- **Pengingat operasional**: setelah mengganti container backend, `nginx-proxy-manager` wajib direstart (DNS upstream ter-cache) — tidak berlaku untuk deploy PWA statis.
- ☐ selesai

## 7. Check-list penyelesaian

| # | Item | Status |
|---|---|---|
| 01 | Fungsi murni + 12 test unit | ☐ |
| 02 | Counter lokal + test | ☐ |
| 03 | Jalur auto-save teks di Capture | ☐ |
| 04 | Bar hasil + Batalkan 10s + tap Ubah + 3 marker | ☐ |
| 05 | Alasan review | ☐ |
| 06 | Regresi: struk selalu review | ☐ |
| 07 | tsc + jest + quality:live hijau | ☐ |
| 08 | Canary live + verifikasi akun uji | ☐ |

## 8. Risiko & rollback

| Risiko | Mitigasi |
|---|---|
| Salah simpan tanpa dilihat user | 7 syarat ketat + Batalkan 10 detik + jalur simpan idempotent (tidak mungkin dobel) |
| Ambang 0.85 terlalu longgar | counter lokal (Task 02) → setel ulang setelah data nyata |
| Struk ikut otomatis | Task 06 sebagai test penjaga |
| Rilis bermasalah | flag bisa dimatikan tanpa build ulang; snapshot rollback seperti V2 |

## 9. Catatan teknis

- Pola kode: tab + kutip ganda (konsisten dengan fitur transaction-entry).
- Jangan hapus/ubah marker lama: `capture-receipt-preview`, `capture-receipt-confirm`, `capture-receipt-split`, `transaction-form-submit`, `transaction-category-option-*`.
- Jangan menyentuh `transaction-entry-persistence.ts` (RPC idempotent) selain memanggil `saveEntry` yang sudah ada.

## 10. Log pelaksanaan (2026-10-02, branch `feat/kaswise-ai-autosave-text`)

| # | Item | Bukti |
|---|---|---|
| 01 | Aturan auto-save + 7 syarat | 27 test unit hijau (termasuk 2 kasus jalur struk/suara yang ditolak) |
| 02 | Counter lokal (saved/undone/edited + undo rate) | 7 test hijau |
| 03 | Integrasi jalur teks di Capture | 7 test layar hijau (ditulis worker, dijalankan ulang & diverifikasi sendiri) |
| 04 | Bar hasil + Batalkan 10 detik + Ubah + 4 marker | 6 test komponen hijau; marker terdaftar di registry |
| 05 | Baris alasan penolakan otomatis | 4 kasus alasan diuji di layar (ragu, 2 transaksi, kategori umum, nominal kosong) |
| 06 | Penjaga struk | Syarat `source === "text"` di fungsi murni + 2 test; hanya SATU titik mengaktifkan auto-save (`submitTextReview`) |
| 07 | Gerbang mutu | `tsc` exit 0; Jest 88/88 suite, 765 lulus, 8 dilewati, 0 gagal; `quality:live` exit 0 — registry 13 fitur / 39 marker, semua marker ada di bundle `entry-4121168ea216987c56783d3e4eb8b29b.js` |
| 08 | Rilis canary | BELUM — menunggu persetujuan pengguna |

**Pelajaran penting untuk fitur berikutnya:**
1. `required-markers.json` TIDAK boleh disunting manual. Tambahkan marker ke `scripts/live-feature-registry.json`, lalu jalankan `pnpm --filter mobile sync:required-markers`. Gerbang mutu akan menolak kalau tidak sinkron.
2. Cacat asli yang ditemukan & diperbaiki selama pengerjaan: baris alasan bisa "terbawa" dari input teks sebelumnya ke layar konfirmasi struk. Sekarang dibatasi `entryState.source === "text"`.
3. Test layar jalur struk penuh (pilih foto → review) tidak dapat dijalankan di harness jest yang ada (komponen crash karena mock image-picker/receipt belum lengkap), **bukan bug produk** — seluruh suite struk yang ada hijau dan jaminan "hanya teks" kini ditegakkan di fungsi murni + diuji unit.
4. Flag baru `aiAutosaveText`: getter di `src/config/features.ts`, default OFF di `rollout-flags.json`, bisa dinyalakan/dimatikan tanpa build ulang lewat blok runtime di `index.html` (pola yang sama dengan flag V2).

## 11. Catatan rilis canary (2026-10-02 malam)

**Urutan yang dijalankan:**
1. `feat/kaswise-ai-autosave-text` digabung ke `release/v2-transaction-entry` (merge commit).
2. Snapshot keadaan live: `/home/Danu88/services/nginx-proxy-manager/rollback-<ts>-canary-state/` (berisi `index.html.prev`, `flag-state.txt`, `entry-bundle.txt`).
3. Deploy PWA dengan `transactionEntryV2: true` (V2 jangan sampai mati) dan `aiAutosaveText: false` → bundle `entry-ee6da22ede17d6b7965848a8c0592890.js`, 39 marker terverifikasi di target + URL live.
4. Flag dinyalakan tanpa build ulang (`node /tmp/kw-flip-flag2.mjs EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT on`) → halaman live menyajikan `EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT = "true"`.
5. `rollout-flags.json` diset `aiAutosaveText: true` dan di-commit, supaya deploy berikutnya TIDAK mematikan fitur ini tanpa sengaja.

**Cacat proses yang ditemukan & ditutup saat rilis:**
- Blok runtime di `scripts/deploy-pwa.mjs` memakai daftar flag yang dipatok tetap, sehingga flag baru **tidak** ikut tersuntik. Akibatnya (a) flag tidak bisa dibalik lewat `index.html`, dan (b) deploy berikutnya akan menghapus suntikan manual dan mematikan auto-save tanpa suara. Diperbaiki: flag terdaftar di `ROLLOUT_FLAG_ENV_KEYS` (`scripts/rollout-flags.cjs`), disuntik di blok runtime, dan nama kunci config disamakan dengan hasil turunan env (`aiAutosaveText` ← `EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT`) karena gerbang mutu menurunkan nama secara mekanis. Test `rollout-flags.test.ts` menjaga keduanya tetap sinkron.

**Cara membalik (rollback):**
- Cepat (tanpa build): `node /tmp/kw-flip-flag2.mjs EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT off`
- Penuh: kembalikan `index.html` dari snapshot `rollback-<ts>-canary-state/index.html.prev` (pola lama), atau set `rollout-flags.json` lalu deploy ulang.

**Belum diverifikasi:** perilaku di HP secara nyata (Safari iOS) — menunggu uji pengguna. Draf pengujian: (a) `beli kopi 35rb` harus langsung tersimpan + muncul bar Tersimpan dengan Batalkan/Ubah; (b) `bayar listrik` (tanpa nominal) harus berhenti di review dengan alasan; (c) foto/struk harus selalu konfirmasi; (d) saldo dompet hanya berubah sekali; (e) Batalkan mengembalikan saldo.

## 12. Insiden pasca-rilis: auto-save tidak pernah jalan di UI Indonesia (diperbaiki 2026-10-02)

**Gejala (laporan pengguna + rekaman layar):** `Makan mie ayam 20rb` tetap berhenti di layar review
dengan catatan "Ada isian yang belum lengkap. Periksa dulu." — padahal hanya satu transaksi dan
semua bagian terbaca (nominal 20000, kategori "Makan & Minum", jenis Pengeluaran).

**Bukti:**
1. Rekaman layar pengguna menunjukkan catatan itu persis teks alasan `invalid_draft`
   ("Ada isian yang belum lengkap. Periksa dulu.") — jadi keputusan auto-save memang menolak, dan
   yang gagal adalah `allDraftsValid`, bukan syarat lain (unresolved / confidence / nominal).
2. Produksi (tabel `categories`): nama kategori tersimpan dalam **bahasa Inggris**
   ("Food & Beverage", "Transport", "Salary", "Other expenses"), sedangkan draf dari ekstraktor
   menyimpan **label bahasa aktif** ("Makan & Minum").
3. Harness memakai kode nyata (classifier → adapter → keputusan auto-save) dengan nama kategori
   produksi: draf `{amount:20000, category:"Makan & Minum", confidence:0.96, unresolved:[]}`
   → keputusan `{"auto":false,"reason":"invalid_draft"}` dan `validateDraft` →
   `{"category":"UNKNOWN_CATEGORY"}`. Dengan daftar kategori yang dilokalkan → `{"auto":true}`.
   (Berkas diagnostik sementara, sudah dihapus setelah dipakai.)

**Akar masalah:** `validateDraft` (`src/features/transaction-entry/draft.ts`) membandingkan nama
kategori sebagai **teks literal** (`categoryNames(ctx).has(name.toLowerCase())`). Draf teks memakai
label bahasa aktif, daftar kategori memakai nama tersimpan (Inggris) → setiap draf berbahasa
Indonesia ditolak. Dampaknya bukan hanya auto-save batal: karena
`savable = !saving && allDraftsValid(...)` di `TransactionReview`, **tombol Simpan ikut terkunci**
untuk entri teks di UI Indonesia — bug V2 yang sudah ada sebelumnya dan baru tersingkap oleh baris
alasan auto-save.

**Perbaikan:** kategori dibandingkan lewat identitas kanonik taksonomi
(`areCategoryNamesEquivalent`) — label id/en, beda huruf besar/kecil, dan alias dianggap kategori
yang sama; nama yang benar-benar asing tetap `UNKNOWN_CATEGORY`.

**Penjaga regresi (bentuk produksi: draf Indonesia vs kategori Inggris):**
- `draft.test.ts` → "accepts a localised label for a category stored under its English name"
- `auto-save.test.ts` → "auto-saves a draft whose category is labelled in the active language"

**Verifikasi:** `tsc` bersih · suite penuh **88/88, 767 lulus, 8 dilewati, 0 gagal** ·
`quality:live` exit 0 (13 fitur / 39 marker) · deploy ulang → bundle live
`entry-0adff89a422b742e38afec08d1bd736e.js` (berbeda dari `entry-ee6da22e…` pra-perbaikan) dengan
`TRANSACTION_ENTRY_V2 = "true"` dan `AI_AUTOSAVE_TEXT = "true"` tetap menyala.
**Commit:** `7420937`. **Snapshot rollback:** `…/placeholder/rollback-<ts>-fix-category/index.html`.
