# Product

## Register

product

## Users

**Rafi, 21 tahun — mahasiswa di Bandung**
- Seluruh aktivitas digital via smartphone
- Anggaran terbatas — butuh alat yang membantu awareness pengeluaran harian
- Tidak sabar mengisi form panjang — input harus dalam 2–3 tap
- Lebih nyaman bicara cepat daripada mengetik di keyboard mobile
- Mengandalkan notifikasi untuk reminder budget dan tagihan

**Dania, 27 tahun — profesional swasta di Jakarta**
- Sering lupa mencatat transaksi kecil di tengah kesibukan harian
- Lebih nyaman mengetik kalimat natural daripada mengisi form panjang
- Ingin tahu uang habis di kategori apa setiap bulan tanpa rekap manual
- Akses Kaswise lewat PWA di laptop saat akhir bulan untuk review laporan

## Product Purpose

Kaswise adalah aplikasi pencatatan keuangan personal berbahasa Indonesia dengan pendekatan mobile-first. Produk memadukan tiga lane input cepat (teks AI chat, OCR struk, voice record), import mutasi bank, budgeting, pengingat tagihan, grup keuangan, dan laporan keuangan.

Tujuan: mengurangi friksi input transaksi lewat AI chat, OCR, voice, dan import mutasi, sehingga pengguna bisa mencatat keuangan secara konsisten tanpa merasa terbebani.

## Brand Personality

Praktis, hangat, cerdas

- **Praktis:** UI langsung ke inti, tidak ada dekorasi berlebihan, setiap tap ada tujuannya
- **Hangat:** Bahasa Indonesia natural, error messages membantu bukan menghakimi, ilustrasi sederhana
- **Cerdas:** AI bekerja di belakang layar, memberikan insight tanpa diminta, confidence-based auto-save dengan opsi batalkan

## Anti-references

- Aplikasi keuangan yang terlalu kompleks dengan puluhan chart di dashboard
- UI overload dengan sidebars, modals, dan nested cards
- Form panjang dengan 10+ field wajib untuk satu transaksi
- Dark mode "karena keren" tanpa alasan scene yang konkret
- Gradient text, glassmorphism, side-stripe borders sebagai default
- Hero-metric template (big number + small label + gradient accent) — SaaS cliché

## Design Principles

1. **Mobile-first ≤3 tap** — Flow utama harus selesai dalam ≤3 tap di smartphone Rafi. Jika tidak, redesain.
2. **Confidence-based AI** — Auto-save hanya jika confidence ≥0.85; selalu ada opsi "Batalkan" 5 detik. Confidence rendah → review card dengan field yang bisa diedit.
3. **Async feel** — AI processing tidak block UI. Edge Function + Supabase Realtime memberikan feel "magic" tanpa client polling.
4. **Bahasa Indonesia natural** — Error messages jelas dan membantu, tidak raw server error. Copy setiap layar diuji: apakah Rafi paham dalam 2 detik?
5. **Show, don't tell** — Data keuangan ditampilkan visual sederhana (chart hanya jika perlu), breakdown kategori jelas, tren mudah dibaca.

## Accessibility & Inclusion

- WCAG AA compliance
- Reduced motion option untuk animasi
- Color blindness aware — tidak mengandalkan warna saja untuk membedakan state
- Screen reader support untuk PWA
- Font size scalable di mobile settings