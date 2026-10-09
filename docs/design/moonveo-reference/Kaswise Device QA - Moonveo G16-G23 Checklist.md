# Device QA Checklist — Moonveo parity (G16–G23 + guardrail) — 2026-10-10

## Scope

Checklist QA **perangkat fisik** untuk menutup sisa verifikasi item audit G16–G23 dan memastikan guardrail G30/G31/G32 tidak rusak. Dokumen ini **tidak** mengubah kode, flag, data pengguna, atau aset produksi.

Sumber status: `docs/design/moonveo-reference/gap-matrix.json` + `Kaswise vs Moonveo - Master Reference dan Gap Checklist.md`.
Audit browser lokal sudah hijau (Playwright experience suite **237 passed / 0 failed**, viewport 360/390/430, bundle `entry-c75572…`). Yang belum bisa dibuktikan dari mesin ini hanya perilaku **keyboard fisik** (G17) dan **motion/smoothness perangkat** (G20), plus konfirmasi visual di layar HP nyata.

## Status deploy (penting — baca dulu)

- Kode yang diuji ada di HEAD `f2bbf9e` (branch `release/v2-transaction-entry`). Ini **belum di-deploy**.
- Laporan rilis terakhir yang tercatat: `docs/releases/2026-10-05-47508bf.md` (commit `47508bf`).
- Artinya: `https://app.kaswise.com/` **belum memuat** pekerjaan Paket A (G01/G02/G08/G24/G33/G35/G36) maupun perubahan B1/B2 terbaru.
- **Konsekuensi:** QA perangkat untuk kode baru harus lewat **Jalur A (preview lokal)** di bawah. Jalur B (produksi) baru relevan setelah deploy disetujui.

## Prasyarat

1. HP tersambung ke Tailnet (Tailscale) yang sama dengan VPS.
2. Jangan menyimpan transaksi nyata saat menguji AI/struk. Gunakan nominal kecil atau batalkan sebelum simpan.
3. Catat: model HP, OS + versi, browser + versi. Ini wajib untuk laporan G17/G20.

## Cara buka aplikasi

**Jalur A — preview lokal (kode terbaru, tanpa deploy)**

Server sudah jalan di VPS (bundle `entry-c75572…`, sama dengan bundle audit browser):

- URL di HP: `http://100.115.205.61:8090/`
- Jika perlu restart di VPS:
  `cd ~/apps/kaswise/apps/mobile && python3 -m http.server 8090 --bind 100.115.205.61 -d dist`
- Login pakai akun uji milikmu. Jika tampilan terasa "beku" karena cache PWA: buka mode Incognito / hapus data situs.

**Jalur B — produksi (hanya setelah deploy disetujui)**

- URL: `https://app.kaswise.com/`

## Checklist per item

Isi `LULUS` / `GAGAL` + catatan. Satu baris per item.

### G16 — Pola bottom sheet (native dismiss, safe area)
1. Buka **Catat** → ketuk pemilih **dompet** (sheet naik dari bawah).
2. Ketuk area gelap di luar sheet → sheet harus menutup, draf nominal tetap ada.
3. Buka lagi sheet **tanggal** → tekan tombol **Kembali** fisik HP → sheet menutup (bukan keluar aplikasi).
4. Buka sheet **tanggal** → ketuk **Tutup** → draf lain (nominal/dompet) tidak berubah.
- Yang harus terlihat: CTA tidak menutupi pilihan terakhir; konten tidak tertutup notch/gesture bar.
- [ ] LULUS / [ ] GAGAL — catatan:

### G17 — Keyboard fisik (paling penting di perangkat)
1. Buka **Catat** → ketuk kolom **nominal** → keyboard naik.
2. Pastikan: kolom yang diketik **terlihat**, tombol aksi utama **masih dapat dijangkau** (tidak ketutup keyboard).
3. Ketik kalimat di kolom catatan AI → scroll tetap bisa; kursor tidak "hilang" di balik keyboard.
4. Ketuk kolom **nama** (form dompet) → urutan fokus wajar (nominal → kategori/dompet → catatan).
5. Tutup keyboard → layout kembali normal tanpa lompatan.
- [ ] LULUS / [ ] GAGAL — catatan: (model HP + OS + keyboard:

### G18 — Navigasi bawah & scroll
1. Scroll layar **Laporan** sampai paling bawah → tombol/kartu terakhir **tidak tertutup** floating nav.
2. Ketuk tab **Catat** (tengah) → kembali ke tab sebelumnya dengan tombol **Back** HP → kembali ke tab, bukan keluar.
3. Cek active state nav jelas (tab aktif berbeda).
- [ ] LULUS / [ ] GAGAL — catatan:

### G19 — Feedback interaksi
1. Di **Catat**, ketuk **Simpan** dua kali cepat → hanya **satu** proses simpan (tidak dobel).
2. Saat menyimpan: ada indikator loading, tombol tidak bisa ditekan ulang.
3. Isi kosong lalu Simpan → tidak ada sukses palsu; ada feedback.
- [ ] LULUS / [ ] GAGAL — catatan:

### G20 — Motion (ukur di perangkat)
1. Buka tiap tab → animasi masuk halus, **tidak** berkedip atau terasa lambat.
2. Aktifkan **Reduce Motion** di setelan OS, ulangi → animasi berkurang/hilang (dihormati).
3. Catat bila ada animasi yang terasa "nyangkut" atau menunda pencatatan.
- [ ] LULUS / [ ] GAGAL — catatan: (OS reduce-motion:

### G21 — Loading, layout shift, offline/error
1. Buka **Laporan** → saat memuat, konten lama tidak menumpuk dengan yang baru.
2. Matikan **mode pesawat** → buka/refresh Laporan → muncul **error + tombol Retry** (bukan tampak "kosong").
3. Nyalakan data, tekan **Retry** → data kembali tampil.
4. Loading tidak berputar tanpa henti.
- [ ] LULUS / [ ] GAGAL — catatan:

### G22 — Kontras, tap target, font besar
1. Di Setelan OS, naikkan **ukuran font** ke maksimum → buka Beranda, Laporan, Catat → tidak ada teks terpotong/overflow.
2. Ganti bahasa **ID ↔ EN** → label tetap rapi.
3. Ketuk kontrol kecil (pill **Filter**, toggle **Periode**) → mudah ditekan (≥44px).
- [ ] LULUS / [ ] GAGAL — catatan:

### G23 — Chart berdata nyata
*(butuh akun dengan data; jangan simpan data uji asal-asalan)*
1. Buka **Laporan** dengan akun berisi pemasukan + pengeluaran → chart Ritme Kas menampilkan batang.
2. Cocokkan angka total chart dengan daftar **Transaksi** pada periode yang sama.
3. Coba periode tanpa data → tampil **empty state** periode (bukan chart kosong menipu).
4. Jika ada pemasukan saja / pengeluaran saja → chart tetap benar (tidak salah skala).
- [ ] LULUS / [ ] GAGAL — catatan:

### G30 — Guardrail: Capture existing + Kembali
1. Buka **Catat → foto struk** → pilih struk → layar pilih struk punya tombol **Kembali**.
2. Tekan **Kembali** → draf teks/ruang uang/dompet tetap utuh.
- [ ] LULUS / [ ] GAGAL — catatan:

### G31 — Guardrail: Home stack dompet
1. Buka **Beranda** → stack dompet tampil sama seperti sebelumnya (tidak hilang/bergeser).
2. Nominal + CTA **Catat** benar.
- [ ] LULUS / [ ] GAGAL — catatan:

### G32 — Guardrail: identitas & scope
1. Konfirmasi tema tetap **navy-blue / light-first** (tidak berubah jadi tema gelap).
2. Setelan → **Tampilan** menampilkan "Terang" (bukan Gelap/Sistem).
- [ ] LULUS / [ ] GAGAL — catatan:

## Cara melaporkan hasil

Kirim di topik Forge ini dengan format ringkas:

```
HP: <model> | OS: <versi> | Browser: <versi>
Jalur: A (preview 8090) / B (produksi)
LULUS: G16, G18, G19, ...
GAGAL: G17 (langkah 3: kursor hilang) ...
Catatan motion (G20): ...
```

## Batas verifikasi (jujur)

- Audit browser = **local-tested** (preview bundle, Supabase stub + override flag). Bukan deployed, bukan live-verified.
- G17 (keyboard) & G20 (motion) **hanya** sah dibuktikan di perangkat fisik.
- Item Paket A (G01, G02, G08, G24, G33, G35, G36) sudah "Selesai—terverifikasi lokal" lewat Jest (61 passed / 0 failed), **belum** live-verified sampai ada deploy.
- Setelah semua LULUS: status boleh diubah menjadi *live-verified* setelah bukti perangkat + (bila relevan) readback di produksi.
