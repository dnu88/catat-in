---
date: 2026-10-04
source: user-video-and-kaswise-live-ui-audit
tags: [kaswise, moonveo, ui-ux, premium, reference, gap-analysis]
status: reference-and-proposed-backlog
---

# Kaswise vs Moonveo — Master Reference dan Gap Checklist

## Tujuan
Referensi permanen dari video Moonveo milik pengguna agar tidak perlu kirim video berulang. Dipakai untuk diskusi, scope dan handoff engineering berikutnya. **Ini dokumentasi, bukan persetujuan otomatis untuk menjalankan semua item.**

## Keputusan yang tetap dikunci
- Kaswise mempertahankan identitas navy–blue, warm paper/light-first, bukan menyalin dark theme Moonveo.
- Menu pencatatan/Capture tetap desain existing. Redesign V2 dibatalkan.
- Tombol Kembali pada pilih struk sudah live; draf, ruang uang dan dompet tetap dipertahankan.
- Stack dompet Home tetap. Perubahan struktur hanya setelah before/after visual QA dan izin eksplisit.
- Fokus: UI rapi, minimalis berkarakter, cepat mencatat lewat kalimat/foto struk; bukan menambah kompleksitas.
- Tidak ada izin perubahan logika keuangan, backend, flag, data/kustomisasi pengguna atau deployment dari catatan ini.

## Cara pakai untuk sesi berikutnya
Minta: **“Pakai master reference Moonveo Kaswise, bahas/kerjakan Gxx.”** Gunakan ID stabil di bawah; tidak perlu meminta video ulang. Sebelum implementasi, baca kondisi aplikasi saat itu, tentukan scope, tunjukkan before/after dan jalankan regression. Status hanya boleh menjadi selesai setelah acceptance criteria dan bukti terpenuhi.

## Kesimpulan utama
Kaswise sudah memiliki fondasi premium: navy-blue hero, white/paper cards, floating navigation, grouped Settings, ID/EN, pilihan tema, period selector, cashflow chart, empty states dan personal/household contexts. **Gap utama adalah konsistensi, kejelasan dan keandalan detail, bukan ketidakadaan semua komponen.**

Prioritas pertama: Settings yang lebih terkurasi; tipografi/spacing/control hierarchy; bahasa produk dan preferensi yang jujur; preview editor; error feedback. Integrasi iOS, batch scanner dan model net worth dipisahkan sebagai keputusan fitur, bukan syarat tampilan premium.

## Bukti dan batas interpretasi
- Video asli: 141.181224 detik, 384×848, video 30 fps; disalin ke arsip permanen proyek dan diverifikasi SHA-256.
- Seluruh rentang video diperiksa lewat 29 frame full-resolution berinterval 5 detik dan 3 contact sheets. Jangan menganggap sampling ini pengukuran frame-by-frame terhadap smoothness, latency, haptics atau fps aplikasi.
- Kaswise saat pencatatan: 9 halaman live diperiksa di viewport 390×844 (Home, Setelan, Transaksi, Dompet, Laporan, Anggaran, Tagihan, Impor, Bantuan), termasuk area scroll Setelan/Laporan/Dompet/Home.
- Pengamatan memakai akun disposable tanpa transaksi; saldo nol bukan bug. Dua run screenshot selesai tanpa page error dan cleanup akun/data diverifikasi.
- Source audit melengkapi perbandingan untuk kemampuan conditional dan failure paths. Source bukan bukti semua fitur aktif live.
- Rekaman tidak menunjukkan seluruh aplikasi Moonveo, sukses OCR/save, seluruh dark/light behavior, jaringan buruk, nominal ekstrem atau font besar. Gap “Audit” adalah kebutuhan pengujian, bukan tuduhan defect yang sudah direproduksi.
- Video berisi profil/notification pribadi insidental. Tidak disalin ke mock, ringkasan publik atau materi promosi. Bukti mentah tetap privat.

## Timeline referensi Moonveo
| Timestamp | Layar / pola yang terlihat |
|---|---|
| 0–5s | **iOS Control Center** — Not Moonveo UI; exclude from premium benchmark. |
| 10s | **Settings upper** — Profile, Settings, Preferences grouped; row icons, chevrons and active values. Tracking Mode Full Net Worth, Tag Off, Currency Rp, budget period Day25, Language EN visible. |
| 15s / 55s | **Categories & Budget** — Expense/Income segmented control, add button, icon/name/budget subtitle rows. |
| 20s | **Category visual editor color** — Large selected preview, Color/Icon/Emoji tabs, custom color, palette selection ring, bottom Apply. |
| 25–40s | **Category visual editor icon** — Scrollable icon grid, Search icon, large preview, persistent bottom Apply. No demonstrated successful emoji selection. |
| 45s | **Category detail edit** — Category name and Monthly budget fields; keyboard open. Avoid conflating naming with icon editing. |
| 50s | **Category overview** — Category header/icon/budget state, progress area, expense/income summary, Transactions period selector, contextual empty state. |
| 60s / 95s | **Settings lower** — Preferences show Apple Shortcuts, Dark mode System, Export CSV, Import statement; Updates group; logout separated at bottom. Menu presence does not prove every function works. |
| 65s / 90s | **Home overview** — Space identity, notification icon, Overview visibility/period controls, Expenses/Income, Categories donut zero-state, expense/income segment and next-step text. Floating 5-icon bottom nav. |
| 70–75s | **Net worth / asset overview** — Net Worth Graph with period and headline value; Cash/Investments/Fixed Assets cards and add/disclosure controls. Native function results not demonstrated. |
| 80s | **Voice capture** — One central Tap to start, language control, dismissible example hint, secondary Add Manual and Scan or Attach. |
| 85s | **Camera capture** — Single Transaction/Multiple segment, camera preview, flash/camera controls, gallery and Take a picture. No completed OCR/save flow shown. |
| 100s / 140s | **Apple Shortcuts hub** — Voice and Screen Scanner Add rows; Apple Pay Sync Setup automation row. |
| 105–135s | **Screen Scanner guide** — Demonstration imagery/video, numbered Step by step instructions, Add action, persistent Done. In-guide screen examples are not evidence of live Kaswise capabilities. |

## Koreksi agar tidak salah memahami referensi
- 0–5 detik adalah iOS Control Center, bukan UI Moonveo.
- Rekaman menampilkan kategori, suara/kamera dan tutorial Shortcuts; bukan hanya Settings dan grafik.
- Menu Apple Pay/CSV/import yang terlihat tidak membuktikan semua proses telah berhasil dijalankan.
- Single/Multiple pada kamera berbeda dari membagi item dalam satu struk.
- Kaswise sudah memiliki kategori-service, editor ikon/warna envelope dan import engine. Surface pengguna dan aktivasi fitur tetap perlu dibedakan.
- Kaswise sudah memiliki grouped Settings dan empty states; perbaikannya adalah kurasi/konsistensi, bukan membuat ulang dari nol.
- Premium tidak mensyaratkan warna gelap, emoji, semua warna pelangi, banyak animasi atau integrasi native.

## Status dan prioritas
- **Polish:** perbaikan presentasi/kejelasan berdasarkan bukti yang ada; usulan, belum dieksekusi.
- **Audit:** skenario QA atau risiko source yang harus diuji; belum disebut bug live tanpa reproduksi.
- **Opsional:** keputusan fitur terpisah, bukan wajib demi premium.
- **Guardrail:** bagian yang dipertahankan dan diuji regression.
- **Selesai—terverifikasi lokal:** implementasi ada di HEAD dan lolos tes otomatis lokal; belum live-verified.
- **Audit browser hijau—QA perangkat tertunda:** sudah diuji suite browser lokal (Playwright), masih menunggu QA perangkat fisik.
- **Terverifikasi perangkat—live-verified:** sudah diuji di perangkat fisik (iPhone 14 · Chrome iOS). Item yang diuji di produksi (`app.kaswise.com`) bersifat live-verified; yang diuji pada preview bundle dicatat di `verifikasi.perangkat.tingkat`.
- P1 = dampak/kepentingan awal; P2 = penyempurnaan/QA lanjutan; P3 = feature discovery. Prioritas ini rekomendasi, bukan urutan yang sudah disetujui pengguna.

**Total: 36 item = 17 polish + 11 audit + 5 opsional + 3 guardrail.**

## Matriks ringkas
| ID | Prioritas | Jenis | Area | Status |
|---|---|---|---|---|
| G01 | P1 | Polish | Struktur Setelan | Selesai—terverifikasi lokal |
| G02 | P1 | Polish | Nilai aktif preferensi | Selesai—terverifikasi lokal |
| G03 | P1 | Polish | Tipografi dan angka | Usulan—belum disetujui implementasi |
| G04 | P1 | Polish | Ritme spacing | Usulan—belum disetujui implementasi |
| G05 | P1 | Polish | Surface, border, shadow | Usulan—belum disetujui implementasi |
| G06 | P1 | Polish | Sistem kontrol | Usulan—belum disetujui implementasi |
| G07 | P1 | Polish | Ikon dan affordance | Usulan—belum disetujui implementasi |
| G08 | P1 | Polish | Bahasa produk | Selesai—terverifikasi lokal |
| G09 | P1 | Polish | Hierarki Laporan | Usulan—belum disetujui implementasi |
| G10 | P1 | Polish | Kontrol periode | Usulan—belum disetujui implementasi |
| G11 | P1 | Polish | Empty state kontekstual | Usulan—belum disetujui implementasi |
| G12 | P1 | Polish | Bantuan praktis | Usulan—belum disetujui implementasi |
| G13 | P2 | Polish | Kategori dan anggaran list | Usulan—belum disetujui implementasi |
| G14 | P2 | Polish | Editor visual kategori | Usulan—belum disetujui implementasi |
| G15 | P2 | Opsional | Detail kategori | Usulan—belum disetujui implementasi |
| G16 | P2 | Audit | Pola bottom sheet | Terverifikasi perangkat—live-verified |
| G17 | P2 | Audit | Keyboard dan formulir | Terverifikasi perangkat—live-verified |
| G18 | P2 | Audit | Navigasi bawah dan scroll | Terverifikasi perangkat—live-verified |
| G19 | P2 | Audit | Feedback interaksi | Terverifikasi perangkat—live-verified |
| G20 | P2 | Audit | Motion konsisten | Terverifikasi perangkat—live-verified |
| G21 | P2 | Audit | Loading, layoutshift, offline/error | Terverifikasi perangkat—live-verified |
| G22 | P2 | Audit | Kontras, tap target, fontbesar | Terverifikasi perangkat—live-verified |
| G23 | P2 | Audit | Chart berdata nyata | Audit browser hijau—QA perangkat tertunda |
| G24 | P2 | Polish | Tema yang benar-benar konsisten | Selesai—terverifikasi lokal |
| G25 | P2 | Audit | Context dan dompet | Usulan—belum disetujui implementasi |
| G26 | P3 | Opsional | Shortcut native iOS | Usulan—belum disetujui implementasi |
| G27 | P3 | Opsional | Scan single/multiple dan voice | Usulan—belum disetujui implementasi |
| G28 | P3 | Opsional | Net worth / investasi / fixed assets | Usulan—belum disetujui implementasi |
| G29 | P3 | Opsional | Export/import dan preferensi tambahan | Usulan—belum disetujui implementasi |
| G30 | P1 | Guardrail | Capture existing + Kembali | Dipertahankan |
| G31 | P1 | Guardrail | Home stack dompet | Dipertahankan |
| G32 | P1 | Guardrail | Scope rilis dan identitas | Dipertahankan |
| G33 | P1 | Audit | Keandalan toggle notifikasi | Selesai—terverifikasi lokal |
| G34 | P1 | Audit | Cakupan perubahan ikon/warna | Usulan—belum disetujui implementasi |
| G35 | P1 | Polish | Kejelasan nama tujuan menu | Selesai—terverifikasi lokal |
| G36 | P1 | Polish | Kelengkapan lokalisasi | Selesai—terverifikasi lokal |

## Log verifikasi (2026-10-10)

Diverifikasi terhadap HEAD `f2bbf9e` pada branch `release/v2-transaction-entry` (working tree bersih).

| Sumber bukti | Hasil |
|---|---|
| Jest (lokal) — `package-a-settings`, `settings-screen`, `settings-notifications`, `notification-bell`, `help-localization`, `legal-route-screen`, `legal-support-section`, `legal-links`, `light-theme-accents` | **61 passed / 0 failed** |
| Playwright experience suite (lokal, preview bundle `entry-c75572…`, viewport 360/390/430) | **237 passed / 0 failed** |
| QA perangkat fisik (iPhone 14 · Chrome iOS) — G16–G22 | **7 LULUS / 0 GAGAL** |

- **Selesai—terverifikasi lokal (7):** G01, G02, G08, G24, G33, G35, G36.
- **Terverifikasi perangkat—live-verified (7):** G16, G17, G18, G19, G20, G21, G22. G19–G22 diuji di produksi (`app.kaswise.com`); G16–G18 diuji pada preview bundle (kode identik dengan yang live).
- **Audit browser hijau—QA perangkat tertunda (1):** G23 (chart berdata nyata — butuh akun dengan data).
- **Guardrail belum diuji di perangkat:** G30, G31, G32.
- **Batasan:** item Paket A belum dapat disebut *live-verified* sampai ada deploy frontend yang tercatat. G23 butuh akun uji berisi data nyata.
- **Hasil perangkat (rinci):** `Device QA Results - Moonveo G16-G23 2026-10-10.md`.
- **Checklist QA perangkat (langkah demi langkah):** lihat `Kaswise Device QA - Moonveo G16-G23 Checklist.md` di folder yang sama.

## Checklist detail: perbandingan → tindakan → bukti selesai

### G01 — Struktur Setelan (P1 · Polish)
- [x] **Status:** Selesai—terverifikasi lokal (implemented + local-tested, 2026-10-10; bukti di `gap-matrix.json`).
- **Moonveo / bukti:** 10/60/95s: grouped rows + nilai aktif
- **Kaswise sekarang:** Kaswise sudah mengelompokkan Akun/Pencatatan/Data/Preferensi/Bantuan; logout muncul sebelum Pencatatan.
- **Tindakan yang diusulkan:** Rapikan urutan, kelompokkan preferensi dalam row ringkas, letakkan logout di akhir.
- **Kriteria penerimaan:** Semua setting lama tetap dapat diakses; urutan dan row konsisten; logout tidak mendominasi area awal.

### G02 — Nilai aktif preferensi (P1 · Polish)
- [x] **Status:** Selesai—terverifikasi lokal (implemented + local-tested, 2026-10-10; bukti di `gap-matrix.json`).
- **Moonveo / bukti:** 10/60s: Currency Rp, Language EN, Dark mode System
- **Kaswise sekarang:** Bahasa dan tema Kaswise berupa pilihan inline; sudah berfungsi sebagai kontrol, bukan fitur yang hilang.
- **Tindakan yang diusulkan:** Ringkas menjadi label + nilai aktif + detail pilihan bila disetujui.
- **Kriteria penerimaan:** Nilai terbaca tanpa membuka detail; pilihan persist; bahasa ID/EN tetap benar.

### G03 — Tipografi dan angka (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 65/70s: nominal menonjol dibanding label
- **Kaswise sekarang:** Nominal utama Kaswise sudah menonjol; judul, label, helper lintas layar perlu standardisasi.
- **Tindakan yang diusulkan:** Tetapkan skala type untuk title/amount/body/helper dan tabular digits untuk nominal.
- **Kriteria penerimaan:** Tidak ada clipping nominal besar atau font besar; angka sejajar; hierarchy terbaca pada 360/390/430px.

### G04 — Ritme spacing (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 10/15/60s: ritme row/kartu berulang
- **Kaswise sekarang:** Kaswise memiliki kartu terpisah dan header berbeda; kepadatan Setelan/Laporan bervariasi.
- **Tindakan yang diusulkan:** Tetapkan spacing tokens, tinggi row dan inset untuk komponen sejenis.
- **Kriteria penerimaan:** Elemen sejenis memakai ukuran yang sama; tidak mengubah struktur Capture atau stack dompet Home.

### G05 — Surface, border, shadow (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 10/50/70s: surface bertingkat konsisten
- **Kaswise sekarang:** Paper/white/gradient/glass Kaswise sudah ada; shadow header/kartu perlu dikurasi, bukan diganti tema.
- **Tindakan yang diusulkan:** Satu hierarchy surface dan shadow halus; gradient untuk area penting saja.
- **Kriteria penerimaan:** Perbandingan before/after menjaga navy-blue light-first; tidak semua kartu dibuat glass/gradient.

### G06 — Sistem kontrol (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 15/20/65s: segmented/pill/CTA berulang
- **Kaswise sekarang:** Kaswise memakai tab periode, chips, tombol kecil/besar dengan beberapa bentuk.
- **Tindakan yang diusulkan:** Samakan selected/pressed/disabled/loading untuk chip, segment dan CTA sesuai fungsi.
- **Kriteria penerimaan:** State aktif jelas tanpa hanya mengandalkan warna; tap target minimum 44 px; tidak menambah pilihan redundant.

### G07 — Ikon dan affordance (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 10/15/60s: ikon/chevron konsisten
- **Kaswise sekarang:** Kaswise sudah memiliki icon palette; screenshot Dompet masih menampilkan glyph bank bergaya emoji, lainnya outline.
- **Tindakan yang diusulkan:** Audit dan rapikan ukuran/stroke/tile ikon lintas layar; pertahankan mapping kategori.
- **Kriteria penerimaan:** Satu makna satu ikon; ikon custom user tidak direset; emoji tidak menjadi default identitas.

### G08 — Bahasa produk (P1 · Polish)
- [x] **Status:** Selesai—terverifikasi lokal (implemented + local-tested, 2026-10-10; bukti di `gap-matrix.json`).
- **Moonveo / bukti:** 50/65s: empty state dan bantuan menjelaskan tindakan
- **Kaswise sekarang:** Kaswise mencampur istilah Capture, Reports/Dompet, request, Track A di copy yang terlihat.
- **Tindakan yang diusulkan:** Hilangkan istilah pengerjaan/internal dan rapikan istilah Indonesia/Inggris.
- **Kriteria penerimaan:** Help tanpa Track A; label Reports/Capture diterjemahkan sesuai konteks; istilah konsisten ID/EN.

### G09 — Hierarki Laporan (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 70s: headline + chart + period satu konteks
- **Kaswise sekarang:** Kaswise sudah punya ringkasan dan Ritme Kas; Insight AI dan kartu pengelolaan muncul sebelum chart.
- **Tindakan yang diusulkan:** Usulkan memperjelas fokus laporan dan merapikan kontrol periode tanpa otomatis memindahkan layout.
- **Kriteria penerimaan:** Angka utama dan periode terhubung jelas; fitur AI tetap tersedia; before/after disetujui sebelum perubahan struktur.

### G10 — Kontrol periode (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 50/65/70s: periode dekat section title
- **Kaswise sekarang:** Kaswise punya chip periode di hero, 1 Bulan, Periode Aktif, dan tab waktu di Transaksi.
- **Tindakan yang diusulkan:** Konsolidasikan hierarchy kontrol dan status periode; hindari kesan filter ganda.
- **Kriteria penerimaan:** Satu sumber periode; semua kartu pakai periode yang sama; persisted filter diuji, tidak sekadar fresh browser.

### G11 — Empty state kontekstual (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 50/65s: No transactions yet + petunjuk relevan
- **Kaswise sekarang:** Kaswise sudah memiliki empty states Home/Transaksi/Anggaran/Tagihan dan chart kosong.
- **Tindakan yang diusulkan:** Bedakan akun baru, filter kosong, gagal muat dan tidak ada data untuk chart.
- **Kriteria penerimaan:** Copy relevan; CTA tunggal bila diperlukan; error tidak disamarkan sebagai saldo0/data kosong.

### G12 — Bantuan praktis (P1 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 105–135s: tutorial visual + numbered steps + Done
- **Kaswise sekarang:** Kaswise Help sudah punya3langkah tetapi masih pengantar umum, termasuk copy Track A.
- **Tindakan yang diusulkan:** Buat panduan berdasarkan tugas: kalimat, struk, pilih dompet, cek hasil; gambar contoh tersanitasi dan deep link relevan.
- **Kriteria penerimaan:** Pengguna dapat menyelesaikan tugas dari panduan; hanya fitur aktif dijelaskan; tidak perlu meniru Apple tutorial.

### G13 — Kategori dan anggaran list (P2 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 15/55s: nama + ikon + Budget not set
- **Kaswise sekarang:** Anggaran Kaswise sudah memiliki progress, sisa/overbudget dan section aktif/review/arsip. Tampilan live akun kosong tidak membuktikan bentuk baris berdata.
- **Tindakan yang diusulkan:** Poles informasi kategori/progress/budget status tanpa menyamakan konsep budget envelope dengan Moonveo.
- **Kriteria penerimaan:** Status belum disetel/aktif/terlampaui jelas; nominal/progress sesuai data; financial semantics tetap.

### G14 — Editor visual kategori (P2 · Polish)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 20–40s: preview + Color/Icon/Emoji + search + Apply
- **Kaswise sekarang:** Source menunjukkan form anggaran dengan dropdown ikon, color swatches, Cancel/Save; belum ada preview terpadu, icon search/grid atau tab emoji.
- **Tindakan yang diusulkan:** Poles preview dan pemilih ikon/warna yang sudah ada. Jangan mewajibkan emoji atau palette confetti.
- **Kriteria penerimaan:** Preview sebelum simpan; cancel tidak mutasi; existing custom icon/color tidak hilang; tidak mewajibkan emoji/confetti.

### G15 — Detail kategori (P2 · Opsional)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 50s: overview budget + summary + transactions
- **Kaswise sekarang:** Kaswise memiliki laporan kategori dan anggaran; parity satu detail page belum menjadi kebutuhan disetujui.
- **Tindakan yang diusulkan:** Pertimbangkan drilldown kategori setelah polish dasar, bukan wajib tambah halaman.
- **Kriteria penerimaan:** Jika dibuat: filterkategori/periode benar, personal/household benar, back mempertahankan filter.

### G16 — Pola bottom sheet (P2 · Audit)
- [x] **Status:** Terverifikasi perangkat—live-verified (QA perangkat iPhone 14 · Chrome iOS, 2026-10-10; rincian di `Device QA Results - Moonveo G16-G23 2026-10-10.md`).
- **Moonveo / bukti:** 10–60/80/100s: handle/back/close + hierarchy
- **Kaswise sekarang:** Finance context sheet dan modal lain sudah ada; presentasi berbeda menurut fungsi. Audit lintas modal belum selesai.
- **Tindakan yang diusulkan:** Audit header, back/close, scroll, CTA dan backdrop pada setiap sheet.
- **Kriteria penerimaan:** CTA tidak menutup pilihan; safe area aman; dismiss tidak menghapus draf; viewer tetap readonly.

### G17 — Keyboard dan formulir (P2 · Audit)
- [x] **Status:** Terverifikasi perangkat—live-verified (QA perangkat iPhone 14 · Chrome iOS, 2026-10-10; rincian di `Device QA Results - Moonveo G16-G23 2026-10-10.md`).
- **Moonveo / bukti:** 45s: category fields dengan keyboard
- **Kaswise sekarang:** Manual entry dan berbagai formulir sudah ada; screenshot mobile viewport tidak membuktikan perilaku keyboard HP.
- **Tindakan yang diusulkan:** Uji nominal, nama, fokus dan keyboard di HP nyata; pertahankan Capture existing.
- **Kriteria penerimaan:** Field aktif dan tombol terlihat; scroll tidak terjebak; draf utuh saat kembali.

### G18 — Navigasi bawah dan scroll (P2 · Audit)
- [x] **Status:** Terverifikasi perangkat—live-verified (QA perangkat iPhone 14 · Chrome iOS, 2026-10-10; rincian di `Device QA Results - Moonveo G16-G23 2026-10-10.md`).
- **Moonveo / bukti:** 65/70/90s: floating nav active state
- **Kaswise sekarang:** Floating5tab Kaswise sudah ada dan active navy jelas.
- **Tindakan yang diusulkan:** Audit overlap konten, tombol terakhir, active state dan browser Back.
- **Kriteria penerimaan:** Tidak ada konten/tombol tertutup navigasi; rute kembali benar; tidak menambah CTA ganda.

### G19 — Feedback interaksi (P2 · Audit)
- [x] **Status:** Terverifikasi perangkat—live-verified (QA perangkat iPhone 14 · Chrome iOS, 2026-10-10; rincian di `Device QA Results - Moonveo G16-G23 2026-10-10.md`).
- **Moonveo / bukti:** 20/40s: Apply tunggal; Moonveo success latency tidak diukur
- **Kaswise sekarang:** Komponen animasi sudah ada; feedback dan error state perlu diuji pada setiap flow.
- **Tindakan yang diusulkan:** Samakan feedback tekan, saving, success, retry dan pengaman double-submit.
- **Kriteria penerimaan:** Simpan hanya sekali; status jelas; animasi tidak memperlambat pencatatan.

### G20 — Motion konsisten (P2 · Audit)
- [x] **Status:** Terverifikasi perangkat—live-verified (QA perangkat iPhone 14 · Chrome iOS, 2026-10-10; rincian di `Device QA Results - Moonveo G16-G23 2026-10-10.md`).
- **Moonveo / bukti:** Sheet/navigation pada video; durasi transisi belum diukur
- **Kaswise sekarang:** Source memiliki entrance animation dan reduced-motion support. Durasi/kualitas real-device belum diukur.
- **Tindakan yang diusulkan:** Audit animasi dan reduced motion di perangkat nyata; ukur sebelum menetapkan target durasi.
- **Kriteria penerimaan:** Reduced motion dihormati; tidak berkedip atau menunggu animasi; hasil pengukuran dicatat.

### G21 — Loading, layoutshift, offline/error (P2 · Audit)
- [x] **Status:** Terverifikasi perangkat—live-verified (QA perangkat iPhone 14 · Chrome iOS, 2026-10-10; rincian di `Device QA Results - Moonveo G16-G23 2026-10-10.md`).
- **Moonveo / bukti:** Tidak ada benchmark loading/offline Moonveo dari video
- **Kaswise sekarang:** Screenshot Setelan menunjukkan spinner preferensi; belum ada bukti durasi atau kegagalan menetap.
- **Tindakan yang diusulkan:** Uji loading, request gagal dan offline; gunakan placeholder dengan ukuran stabil.
- **Kriteria penerimaan:** Layout tidak meloncat; loading tidak tanpa akhir; error tidak disamarkan sebagai sukses/data kosong.

### G22 — Kontras, tap target, fontbesar (P2 · Audit)
- [x] **Status:** Terverifikasi perangkat—live-verified (QA perangkat iPhone 14 · Chrome iOS, 2026-10-10; rincian di `Device QA Results - Moonveo G16-G23 2026-10-10.md`).
- **Moonveo / bukti:** Teks sekunder/card title terlihat; nilai contrast Moonveo tidak diukur
- **Kaswise sekarang:** Palette dan beberapa tap-target helpers sudah ada; accessibility lengkap belum diuji.
- **Tindakan yang diusulkan:** Audit kontras WCAG, target sentuh, accessible labels, fokus dan pembesaran teks.
- **Kriteria penerimaan:** Target usulan: AA 4.5:1 teks normal/3:1 teks besar; touch 44 px; ID/EN dan font besar tidak overflow.

### G23 — Chart berdata nyata (P2 · Audit)
- [x] **Status:** Audit browser hijau—QA perangkat tertunda (Playwright experience suite 237 passed / 0 failed, bundle `entry-c75572…`; QA perangkat fisik belum).
- **Moonveo / bukti:** 70/75s: NetWorth Graph; recording data terbatas
- **Kaswise sekarang:** Ritme Kas sudah live. Audit ini memakai akun kosong; pengujian chart berdata adalah pekerjaan verifikasi terpisah.
- **Tindakan yang diusulkan:** Uji data pemasukan/pengeluaran/outlier/periodee; chart kosong bukan bukti kerusakan.
- **Kriteria penerimaan:** Nilai cocok readback; skala bersama tidak menipu; nol, defisit, outlier dan tooltip benar.

### G24 — Tema yang benar-benar konsisten (P2 · Polish)
- [x] **Status:** Selesai—terverifikasi lokal (implemented + local-tested, 2026-10-10; bukti di `gap-matrix.json`).
- **Moonveo / bukti:** 60/95s: Dark mode System label
- **Kaswise sekarang:** Pilihan Sistem/Terang/Gelap terlihat live, tetapi resolver tema operasional di source selalu light sesuai kebijakan desain.
- **Tindakan yang diusulkan:** Selaraskan pilihan dan penjelasan dengan efek yang nyata; jangan otomatis membangun dark theme.
- **Kriteria penerimaan:** Pilihan tidak menyesatkan. Kebijakan navy-blue light-first tetap, kecuali ada persetujuan baru.

### G25 — Context dan dompet (P2 · Audit)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 65s: Space identity; 70s: Cash card
- **Kaswise sekarang:** Personal/household, pemilih dompet dan amount visibility sudah ada; bukan fitur yang hilang.
- **Tindakan yang diusulkan:** Audit kejelasan konteks, nama panjang, loading dan viewer; poles presentasi saja.
- **Kriteria penerimaan:** Tidak ada saldo/laporan lintas konteks tercampur; pilihan utuh saat kembali; Home stack tidak berubah.

### G26 — Shortcut native iOS (P3 · Opsional)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 100/140s: Voice/Scanner Add, ApplePaySync Setup
- **Kaswise sekarang:** Apple Shortcuts tidak ditemukan pada surface yang diaudit; kemampuan PWA berbeda dari integrasi native iOS.
- **Tindakan yang diusulkan:** Discovery terpisah untuk kemampuan PWA/iOS, permission dan privasi.
- **Kriteria penerimaan:** Spec kompatibilitas disetujui sebelum build; bukan prasyarat premium.

### G27 — Scan single/multiple dan voice (P3 · Opsional)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 80/85s: voice language; camera single/multiple
- **Kaswise sekarang:** Kaswise memiliki receipt picker dan interpretasi satu total/per item. Itu berbeda dari single/multiple gambar; voice conditional menurut flag.
- **Tindakan yang diusulkan:** Evaluasi batch scan dan suara sebagai fitur terpisah setelah alur utama mantap.
- **Kriteria penerimaan:** Jika disetujui: izin, biaya AI, review dan kegagalan aman; Capture existing tidak rusak.

### G28 — Net worth / investasi / fixed assets (P3 · Opsional)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 70–75s: assettypecards
- **Kaswise sekarang:** Dompet memiliki jenis investment, tetapi itu bukan bukti model valuasi portofolio atau net worth lengkap.
- **Tindakan yang diusulkan:** Pisahkan net worth dari polish UI; tentukan aset, liabilitas dan valuasi dahulu.
- **Kriteria penerimaan:** Saldo dompet tidak dilabeli net worth tanpa formula dan model data yang disetujui.

### G29 — Export/import dan preferensi tambahan (P3 · Opsional)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 10/60s: Currency, budgetday, CSV/import menupresence
- **Kaswise sekarang:** Engine import dan preview/confirm ada di source tetapi flag live off; route live menampilkan belum tersedia. Share ringkasan bukan CSV export.
- **Tindakan yang diusulkan:** Putuskan impor/ekspor, mata uang dan siklus secara terpisah; hanya tampilkan janji fitur yang aktif.
- **Kriteria penerimaan:** Import/export diuji; perubahan currency/cycle tidak diam-diam mengubah histori.

### G30 — Capture existing + Kembali (P1 · Guardrail)
- [x] **Status:** Dipertahankan. Ini aturan yang sudah dikunci, bukan pekerjaan baru yang selesai.
- **Moonveo / bukti:** Moonveo80/85s hanya inspirasi, bukan strukturwajib
- **Kaswise sekarang:** Existing Capture dipertahankan; tombol Kembali dari pilih struk sudah deployed dan live verified.
- **Tindakan yang diusulkan:** Pertahankan desain existing; jalankan regression saat komponen bersama berubah.
- **Kriteria penerimaan:** Tidak ada V2 redesign; teks/konteks/dompet utuh saat kembali; pengaman proses berjalan tetap aman.

### G31 — Home stack dompet (P1 · Guardrail)
- [x] **Status:** Dipertahankan. Ini aturan yang sudah dikunci, bukan pekerjaan baru yang selesai.
- **Moonveo / bukti:** Moonveo65/70s bukan izin menggantiHome Kaswise
- **Kaswise sekarang:** Home wallet stack existing dikunci; referensi Moonveo bukan izin menggantinya.
- **Tindakan yang diusulkan:** Polish token saja; perubahan struktur perlu before/after dan izin eksplisit.
- **Kriteria penerimaan:** Stack tidak hilang/bergeser; nominal dan CTA benar; perubahan struktur disetujui pengguna.

### G32 — Scope rilis dan identitas (P1 · Guardrail)
- [x] **Status:** Dipertahankan. Ini aturan yang sudah dikunci, bukan pekerjaan baru yang selesai.
- **Moonveo / bukti:** Seluruhvideo referensi, bukan designexactclone
- **Kaswise sekarang:** Kaswise memakai navy-blue paper, bukan tema gelap Moonveo. Catatan ini tidak mengubah izin pengerjaan.
- **Tindakan yang diusulkan:** Dokumentasi bukan izin commit/push/deploy, mengubah flag atau data pengguna.
- **Kriteria penerimaan:** Checklist per item, before/after, tests dan live QA saat disetujui; rollback tersedia; jangan reset ikon/warna DB.

### G33 — Keandalan toggle notifikasi (P1 · Audit)
- [x] **Status:** Selesai—terverifikasi lokal (implemented + local-tested, 2026-10-10; bukti di `gap-matrix.json`).
- **Moonveo / bukti:** 10/60s: reminder/notification settings; persistensi Moonveo tidak diuji
- **Kaswise sekarang:** Source Kaswise mengubah state lokal secara optimistis lalu mengabaikan error penyimpanan. Belum mereproduksi kegagalan live.
- **Tindakan yang diusulkan:** Uji gagal simpan; sediakan rollback, feedback atau retry, bukan sukses visual palsu.
- **Kriteria penerimaan:** Saat request gagal, pengguna tahu dan state sesuai server; retry aman; reload membuktikan persistensi.

### G34 — Cakupan perubahan ikon/warna (P1 · Audit)
- [ ] **Status:** Usulan—belum disetujui implementasi. Tidak ada implementasi dari pencatatan ini.
- **Moonveo / bukti:** 20–40s: editor dengan preview dan Apply
- **Kaswise sekarang:** Form anggaran Kaswise mengubah visual kategori bersama sebelum menyimpan envelope. Ada risiko hasil parsial jika penyimpanan kedua gagal.
- **Tindakan yang diusulkan:** Jelaskan dampak kategori vs envelope; uji save gagal, cancel dan konsistensi. Perubahan backend perlu scope terpisah.
- **Kriteria penerimaan:** Tidak ada perubahan diam-diam ke kategori lain; efek shared jelas; kegagalan tidak meninggalkan status sukses palsu.

### G35 — Kejelasan nama tujuan menu (P1 · Polish)
- [x] **Status:** Selesai—terverifikasi lokal (implemented + local-tested, 2026-10-10; bukti di `gap-matrix.json`).
- **Moonveo / bukti:** 15/55s: Categories & Budget mencakup income/expense
- **Kaswise sekarang:** Link Kaswise Kategori & anggaran menuju pengelolaan envelope yang memfilter kategori pengeluaran.
- **Tindakan yang diusulkan:** Sesuaikan nama/helper dengan kemampuan nyata, atau spesifikasikan manager kategori sebagai fitur terpisah.
- **Kriteria penerimaan:** Judul/menu sesuai tujuan; tidak menjanjikan pengelolaan income yang belum ditampilkan.

### G36 — Kelengkapan lokalisasi (P1 · Polish)
- [x] **Status:** Selesai—terverifikasi lokal (implemented + local-tested, 2026-10-10; bukti di `gap-matrix.json`).
- **Moonveo / bukti:** 10/60s: language EN terlihat; kelengkapan seluruh Moonveo tidak dibuktikan
- **Kaswise sekarang:** Kaswise punya pilihan ID/EN; source Help dan sebagian Import masih berbahasa Indonesia tanpa selector locale.
- **Tindakan yang diusulkan:** Lengkapi terjemahan konten bantuan dan jalur impor yang aktif, serta audit istilah bersama.
- **Kriteria penerimaan:** ID/EN konsisten di seluruh flow yang dirilis; tidak ada label internal atau campuran bahasa yang tak disengaja.

## Temuan teknis konkret yang perlu perhatian (bukan klaim kegagalan live)
1. **Pilihan tampilan vs hasil nyata:** source resolver operasional selalu light, sementara Setelan menawarkan Sistem/Terang/Gelap. Perbaiki ekspektasi, bukan otomatis ubah identitas desain. G24.
2. **Toggle notifikasi:** update optimistis menelan error tanpa rollback/feedback. Uji failure path dan readback persistensi. G33.
3. **Save visual kategori/anggaran:** category visual ditulis sebelum envelope, sehingga perlu menguji hasil parsial dan menjelaskan dampak shared. G34.
4. **Nama menu kategori:** tujuan envelope pengeluaran tidak sama dengan manager income/expense lengkap. G35.
5. **Lokalisasi dan copy:** Help memuat istilah internal; Help dan sebagian Import belum mengikuti ID/EN. G08/G12/G36.

## Paket pengerjaan yang disarankan
### Paket A — coherence dulu
G01, G02, G08, G24, G33, G35, G36: Setelan, label yang jujur, bahasa dan persistence feedback. QA failure paths tetap terpisah dari polish yang terlihat.
### Paket B — konsistensi visual
G03–G07, G09–G12: type/angka, spacing, surface, kontrol, ikon, hierarchy Laporan, filter, empty states dan help.
### Paket C — editor dan interaksi
G13–G14, G16–G23, G25, G34: editor preview, sheet, keyboard, nav, feedback, motion, loading, accessibility, chart dan scope save.
### Paket D — discovery opsional
G15, G26–G29: drilldown kategori, iOS shortcut, voice/batch capture, aset/net worth, export/currency/cycle. Tidak dijalankan tanpa keputusan fitur.
### Selalu dipertahankan
G30–G32: existing Capture + Kembali, Home stack, scope rilis/identitas.

## Definition of Done untuk perubahan yang nanti disetujui
- Checklist per ID dan bukti before/after; jangan centang karena baru membuat rencana.
- Focused tests, typecheck dan build/marker gates; izin deploy tetap terpisah.
- ID/EN, nama panjang, nominal besar, font besar, 360/390/430 px, personal/household, viewer, loading/error, keyboard dan reduced motion diuji sesuai scope.
- Jalur input kalimat, foto struk dan Kembali tidak kehilangan draf/konteks/dompet.
- Tidak mengubah perhitungan/trigger saldo atau menghapus kustomisasi ikon/warna pengguna.
- Status laporan dipisah: local-tested / deployed / live-verified; rollback disiapkan.

## Evidence index untuk handoff engineering
Arsip proyek: `/home/Danu88/apps/kaswise/docs/design/moonveo-reference/`.
- `moonveo-reference.mp4`: video asli permanen, tidak bergantung cache Telegram.
- `reference-metadata.json`, `reference-index.json`: metadata/hash, aturan privasi dan timeline.
- `frame-000.jpg` s.d. `frame-140.jpg`, interval 5 detik; `sheet-1.jpg` s.d. `sheet-3.jpg`.
- `gap-matrix.json`: 36 ID stabil untuk tracking.
- `source-audit.md`: sumber capability/failure-path dengan file:line, bukan bukti live enablement.
- `Kaswise vs Moonveo - Master Reference dan Gap Checklist.md`: master ini.
- Live screenshot/readback: `docs/qa/moonveo-comparison-live-runs/chromium-2026-10-04T01-58-15-377Z-6297a5c4/` dan `chromium-2026-10-04T01-59-54-521Z-faffe123/`.
- Existing Capture/Back: hasil live `docs/qa/receipt-back-live-runs/`; release summary `docs/qa/receipt-back-verified-summary.json`.

Second Brain hanya menyimpan Markdown. Video dan screenshot tetap privat di arsip proyek, dengan pointer dalam note ini. Catatan tidak mengandung kredensial atau nama/notifikasi pribadi dari rekaman.
