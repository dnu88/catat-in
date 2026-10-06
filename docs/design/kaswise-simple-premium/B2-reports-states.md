# Paket B2 — Laporan: state, kontrol periode, hierarki

Status: **in progress** (verifikasi browser menyusul). Lanjutan dari B1 (`B1-visual-foundation.md`).
Rujukan gap: **G09** (hierarki Laporan), **G10** (kontrol periode), **G11** (empty state kontekstual).

## Masalah yang ditutup

Sebelum B2, empat situasi berbeda tampil nyaris sama di layar Laporan:

1. laporan masih **memuat** (teks kartu biasa),
2. permintaan **gagal** (teks error, tanpa aksi apa pun),
3. akun **belum punya transaksi sama sekali** (chart kosong + "0 transaksi ditemukan"),
4. akun punya transaksi, tetapi **periode terpilih kosong** (tampil sama seperti nomor 3).

Akibatnya pengguna baru melihat grafik kosong tanpa jalan keluar, dan kegagalan muat terbaca seperti "laporan saya kosong".

## Yang dikerjakan

### 1. Model state presentasi — `src/features/reports/report-state.ts` (baru)

Fungsi murni, tanpa query/agregasi/AI/entitlement:

- `resolveReportViewState({loading, error, scopeTransactionCount, periodTransactionCount})` → `loading | error | first-use | period-empty | ready`.
  - `scopeTransactionCount` = jumlah transaksi di scope **sebelum** filter periode (state baru `scopeTransactionCount`, diisi dari `allTransactions.length` di loader yang sudah ada).
- `reportStateCopy(state, isEn)` → judul, isi, dan aksi (`retry` / `capture` / `open-period`). `ready` mengembalikan `null` (tidak ada kartu state).
- `periodStatusLine(label, count, isEn)` → satu baris status periode ("Bulan ini · 12 transaksi" / "… · belum ada transaksi").
- `shouldRenderReportChart(state)` → chart hanya digambar saat `ready`.

### 2. Wiring di `app/(tabs)/reports.tsx` (semua premium-gated)

- Kartu state tunggal (`reports-state-card`) dengan aksi nyata:
  - gagal muat → **Coba lagi** memanggil mekanisme refresh yang sudah ada (`setRefreshTick`), bukan jalur baru;
  - belum ada transaksi → **Catat transaksi** (route Capture existing);
  - periode kosong → **Ubah periode** (membuka pemilih periode premium yang sudah ada).
- Chart **dan** daftar Top-5 tidak digambar saat state bukan `ready` (tidak ada lagi grafik kosong yang tampak seperti kerusakan).
- G10: kartu info "N transaksi ditemukan" dihapus pada premium dan diganti **satu** baris `reports-period-status` di bawah kontrol periode — periode dinyatakan satu kali, bukan dua kontrol yang terasa bertumpuk. Layout lama tetap untuk flag OFF.
- G09: hierarki tidak diubah strukturnya (hero → ringkasan → insight → periode → konten); yang dirapikan hanya kebisingan kartu info dan kejelasan state.

## Aturan yang dipegang

- Flag OFF identik baseline (diuji di browser: test "flag OFF keeps the pre-B2 rendering").
- Tidak ada perubahan perhitungan laporan, agregasi income/expense, jumlah panggilan AI, entitlement, atau query.
- Tidak ada commit/push/deploy/flag change dalam paket ini.

## Bukti

| Item | Hasil |
| --- | --- |
| Test unit `report-state` | 9 kasus, termasuk "empty period ≠ first use" dan "gagal muat bukan state kosong" |
| RED (sebelum wiring) | `b2-reports-states.spec.ts` di bundle pra-B2: **4 failed / 1 passed** — yang lulus justru test paritas OFF |
| Test fokus jest | `reports-screen` + `report-state` + `period-disclosure` + `cashflow-pulse-model`: 44 passed |
| `type-check` | exit 0 |
| Diff vs snapshot baseline `docs/qa/package-a-baseline/apps/mobile/app/(tabs)/reports.tsx` | **165 baris**, seluruhnya presentasi B2 (snapshot = pra-B2 untuk file ini) |

### Browser (bundle nyata, 360/390/430)

| Skenario | Sebelum wiring (pra-B2) | Sesudah wiring |
| --- | --- | --- |
| First use: kartu panduan + tanpa chart | ✘ gagal (chart kosong masih tampil) | ✓ |
| Paritas flag OFF pada akun kosong | ✓ | ✓ |
| Ready: chart ada, baris periode memuat jumlah, kartu info duplikat hilang | ✘ gagal | ✓ |
| Periode kosong ≠ first use | ✘ gagal | ✓ |
| Gagal muat → aksi **Coba lagi** | ✘ gagal | ✓ |

Total `b2-reports-states.spec.ts`: **RED 4 failed / 1 passed → GREEN 15 passed / 0 failed** (3 viewport).
Gabungan tiga spec B1+B2: **33 passed / 0 failed**, 0 page error.

Screenshot: `test-results/experience/b2-reports-{firstuse,ready,periodempty,error}-on-{360,390,430}.png` + `b2-reports-firstuse-off-*.png` (15 PNG).

### Koreksi setelah review screenshot (penting)

Screenshot pertama menunjukkan kartu state **di bawah lipatan layar** — assertion `toBeVisible()` Playwright tetap lulus karena elemen ada di layout, padahal pengguna harus menggulir. Perbaikan:

- kartu state dipindah ke **tepat di bawah kartu ringkasan** (sebelum Insight AI), sehingga penjelasan + aksinya terlihat tanpa menggulir;
- spec diperkuat dengan `toBeInViewport()` pada ketiga kartu state, supaya kelas kesalahan ini gagal di tes, bukan hanya di mata.

Verifikasi visual (390): first use → "Belum ada transaksi" + "Catat transaksi"; periode kosong → "Periode ini belum ada transaksi" + "Ubah periode"; gagal muat → "Laporan gagal dimuat" + "Coba lagi" (kartu bernuansa danger); ready → ringkasan langsung ke konten, tanpa kartu state.

### Gerbang akhir (revisi beku)

| Gerbang | Hasil |
| --- | --- |
| Suite lengkap jest | **114 suite / 1032 passed / 8 skipped (pre-existing) / 0 failed**, exit 0 |
| Preview Playwright (3 spec × 3 viewport) | **33 passed / 0 failed**, 0 page error |
| `quality:live` | **exit 0** — registry 13 fitur/43 marker, `type-check` lolos, regresi fokus 10 suite/156 test, bundle `entry-c7a279be962c7c243f5647fd33d4519f.js` (9.15 MB), **43/43 marker** |

Catatan jujur (belum dikerjakan, bukan disembunyikan):

1. Grafik Ritme Kas tetap berada di bawah kartu Insight AI/Dompet pada state ready — rencana melarang memindahkan layout secara otomatis, jadi urutan itu saya biarkan dan catat sebagai kandidat B2 lanjutan (hierarki G09).
2. Tab **Bandingkan** dan **Kategori** belum mendapat perlakuan state yang sama; B2 ini baru tab **Ringkasan**.
3. Tab bar di bagian bawah masih terpotong pada screenshot preview (masking browser, bukan regresi aplikasi — terlihat sama pada build pra-B2).

Blok yang masih terbuka dari laporan sebelumnya: migrasi `Card`/`Button`/`FilterChip` bersama ke `experienceElevation` (menyentuh banyak layar sekaligus).
