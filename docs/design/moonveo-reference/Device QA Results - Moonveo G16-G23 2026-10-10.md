# Hasil QA Perangkat — Moonveo parity (G16–G23 + guardrail) — 2026-10-10

Catatan hasil **QA perangkat fisik** untuk item audit G16–G23. Sumber: laporan
user langsung di topik Forge (chat). Dokumen ini hanya mencatat hasil; tidak
mengubah kode, flag, data pengguna, atau aset produksi.

- Perangkat: **iPhone 14**
- Browser: **Chrome (iOS)**
- Versi iOS: **belum dilaporkan** (diminta untuk laporan G17/G20; belum diterima)
- Jalur B (produksi): `https://app.kaswise.com/`
- Jalur A (preview lokal): `http://100.115.205.61:8090/` (bundle `entry-c75572…`)

## Ringkasan

| ID | Area | Hasil | Jalur | Bukti |
|---|---|---|---|---|
| G16 | Pola bottom sheet | ✅ LULUS | A (pre-deploy) | `G16 lulus` |
| G17 | Keyboard fisik | ✅ LULUS | A (pre-deploy) | `G17 lulus` |
| G18 | Navigasi bawah & scroll | ✅ LULUS | A (pre-deploy) | `G18 lulus` |
| G19 | Feedback interaksi | ✅ LULUS | B (produksi) | `G19 lulus` |
| G20 | Motion konsisten | ✅ LULUS | B (produksi) | `G20 lulus, iphone 14 browser chrome` |
| G21 | Loading, layout shift, offline/error | ✅ LULUS | B (produksi) | `G21 lulus` |
| G22 | Kontras, tap target, font besar | ✅ LULUS | B (produksi) | `G22 lulus` |
| G23 | Chart berdata nyata | ✅ LULUS | B (produksi) | `G23 lulus` + 2 screenshot: bubble chart (Okt 2026) & Cashflow Pulse (1 Tahun), data riil |
| G30 | Guardrail: Capture existing + Kembali | ⏳ BELUM | — | belum diuji di perangkat |
| G31 | Guardrail: Home stack dompet | ⏳ BELUM | — | belum diuji di perangkat |
| G32 | Guardrail: identitas & scope | ⏳ BELUM | — | belum diuji di perangkat |

**Progres: 8/8 item audit perangkat LULUS.** Sisa: tiga guardrail (G30/G31/G32).

## Catatan kejujuran verifikasi

- G19–G22 diuji langsung di **produksi live** (`app.kaswise.com`) → boleh disebut
  *live-verified* untuk perilaku UI perangkat.
- G16–G18 diuji **sebelum** konfirmasi deploy (Jalur A preview). Kode yang diuji
  identik dengan bundle yang kemudian live, tetapi pengujian itu tidak dijalankan
  terhadap URL produksi. Status tercatat sebagai *device-verified (preview bundle)*.
- G20 & G17 adalah dua item yang **hanya sah dibuktikan di perangkat fisik**;
  keduanya sudah LULUS di perangkat.
- G23 (chart berdata nyata) kini **LULUS di produksi live**: screenshot menunjukkan
  bubble chart kategori (Okt 2026) dan bar chart Cashflow Pulse (1 Tahun) dengan
  angka riil (Income 23,4 jt / Expense 21,8 jt / Savings 1,6 jt / 6,7% rate).
  Sub-langkah empty-state periode kosong & edge case income/expense-only tercakup
  klaim `lulus` user, belum ditampilkan terpisah dalam screenshot.
- Item Paket A (G01, G02, G08, G24, G33, G35, G36) tetap *local-tested* (Jest
  61 lulus) — bukan bagian dari QA perangkat ini.

## Sisa pekerjaan

1. **G30/G31/G32** — guardrail belum diuji di perangkat.
2. **Versi iOS** iPhone 14 belum dilaporkan → lengkapi bila ingin laporan utuh.

Detail langkah tiap item: `Kaswise Device QA - Moonveo G16-G23 Checklist.md`
(folder yang sama).
