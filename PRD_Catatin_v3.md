# Product Requirements Document (PRD)
## Catat.in — Aplikasi Pencatatan Keuangan Personal Berbasis AI

| Atribut | Detail |
|---|---|
| **Versi** | 3.0 — Revised & Strengthened |
| **Tanggal** | 25 April 2026 |
| **Status** | Living Document — Acuan Pengembangan Aktif |
| **Platform Utama** | Web-first MVP (Mobile: Fase 3) |

> **Aturan Update Dokumen:** PRD ini harus diperbarui setiap kali ada perubahan signifikan pada scope web/backend/mobile, model data inti, tabel free/premium, acceptance criteria modul, atau roadmap fase. Dokumen yang tidak diperbarui akan menyesatkan pengembangan.

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Status Produk Saat Ini](#2-status-produk-saat-ini)
3. [Latar Belakang dan Masalah](#3-latar-belakang-dan-masalah)
4. [Target Pengguna](#4-target-pengguna)
5. [Tujuan Produk dan Indikator Keberhasilan](#5-tujuan-produk-dan-indikator-keberhasilan)
6. [Scope Produk](#6-scope-produk)
7. [Requirement Fungsional per Modul](#7-requirement-fungsional-per-modul)
8. [Platform Requirement](#8-platform-requirement)
9. [Model Bisnis dan Premium](#9-model-bisnis-dan-premium)
10. [Arsitektur Teknis](#10-arsitektur-teknis)
11. [Model Data Inti](#11-model-data-inti)
12. [Non-Functional Requirement](#12-non-functional-requirement)
13. [Error State dan Empty State](#13-error-state-dan-empty-state)
14. [User Flow Utama](#14-user-flow-utama)
15. [Risiko Produk dan Mitigasi](#15-risiko-produk-dan-mitigasi)
16. [Roadmap Berikutnya](#16-roadmap-berikutnya)
17. [Definisi Selesai (Definition of Done)](#17-definisi-selesai-definition-of-done)
18. [Penutup](#18-penutup)

---

## 1. Ringkasan Produk

Catat.in adalah aplikasi pencatatan keuangan personal berbahasa Indonesia dengan pendekatan web-first. Produk memadukan pencatatan manual, input transaksi via AI chat, OCR struk, import mutasi bank, budgeting, pengingat tagihan, grup, dan laporan keuangan.

Per 25 April 2026, web app dan backend sudah memiliki flow inti yang berjalan. Mobile app masih berada pada tahap scaffold UI dan onboarding, sehingga belum setara dengan web untuk penggunaan harian.

Dokumen ini adalah acuan pengembangan aktif — bukan dokumen aspirasional. Setiap modul memiliki acceptance criteria yang harus dipenuhi sebelum dianggap selesai.

---

## 2. Status Produk Saat Ini

### 2.1 Snapshot Implementasi

| Area | Status | Catatan |
|---|---|---|
| Web App | ✅ Implemented | Modul utama tersedia dan saling terhubung |
| Backend API | ✅ Implemented | FastAPI + Supabase, endpoint inti aktif |
| Mobile App | 🟡 Partial | Onboarding dan shell tab ada, belum tersambung ke API nyata |
| Premium Subscription | 🟡 Partial | `plan_type` ada di data model, flow billing belum selesai |
| Payment / Webhook | 🔴 Placeholder | Midtrans belum diimplementasikan end-to-end |
| Push Notification | 🔴 Placeholder | Fondasi UI ada, delivery nyata belum ada |
| Export Laporan | ❌ Belum Ada | PDF / Excel belum tersedia |

### 2.2 Yang Sudah Berjalan di Web

- Login, register, dan Google Sign-In via Supabase OAuth
- Dashboard ringkasan keuangan
- CRUD transaksi manual (income dan expense)
- AI chat input transaksi berbahasa Indonesia
- OCR struk dengan review sebelum simpan (JPG, PNG, WEBP, PDF)
- Import mutasi CSV / Excel dengan preview dan deteksi duplikat
- CRUD wallet / dompet (bank, e-wallet, cash, investment)
- CRUD budget / anggaran bulanan dengan progress dan threshold notifikasi
- CRUD bill reminder / tagihan dengan aksi tandai lunas
- Grup: buat, join via kode, lihat anggota, ubah role, keluarkan anggota, keluar grup
- Laporan: summary bulanan, tren, breakdown kategori, detail kategori
- Halaman settings sebagai fondasi preferensi akun

### 2.3 Yang Masih Partial atau Belum Lengkap

- Mobile belum memakai API nyata, state management produksi, atau navigator production-ready
- Insight AI premium masih berupa endpoint awal — belum memakai data keuangan riil pengguna
- Settings mayoritas tersimpan lokal di UI, belum persisten ke backend
- Push notification FCM belum aktif — struktur ada, delivery belum ada
- Payment subscription dan webhook masih placeholder
- Export PDF / Excel belum dibuat
- Privacy controls untuk sharing transaksi / budget grup belum lengkap
- AI chat saat ini auto-save jika wallet tersedia tanpa mempertimbangkan confidence level — perilaku ini harus diubah menjadi **auto-save hanya jika confidence tinggi, review-first jika confidence rendah**
- Kategori kustom masih bergantung pada localStorage — rentan hilang saat ganti browser / clear cache
- Limit bulanan free tier OCR belum benar-benar ditegakkan di database
- Error state dan empty state masih belum konsisten di seluruh modul

---

## 3. Latar Belakang dan Masalah

### 3.1 Problem Statement

Pengguna Indonesia sering gagal mencatat keuangan secara konsisten karena:

- Input manual terasa lambat dan repetitif
- Banyak aplikasi keuangan terlalu kompleks untuk kebutuhan harian
- Data yang sudah dicatat tidak otomatis berubah menjadi insight yang mudah dipahami
- Mutasi bank dan struk masih harus dipindahkan manual
- Kolaborasi keuangan rumah tangga atau grup kecil sering tidak rapi

### 3.2 Solusi Produk

Catat.in menyederhanakan pencatatan keuangan lewat kombinasi:

- Input cepat manual dengan form sederhana
- Input natural language berbasis AI (Bahasa Indonesia)
- OCR struk foto / PDF
- Import mutasi bank CSV / Excel
- Budgeting, tagihan, dan laporan ringkas
- Fondasi fitur kolaborasi grup

Fokus produk saat ini adalah membuat pengalaman web yang usable end-to-end, lalu membawa fondasi yang sama ke mobile.

---

## 4. Target Pengguna

### 4.1 Segmen Pengguna

| Segmen | Profil | Kebutuhan Utama |
|---|---|---|
| Profesional muda | Pekerja kantoran, pemasukan tetap | Tracking pengeluaran, budgeting, laporan bulanan |
| Mahasiswa / Gen Z | Mobile-first, anggaran terbatas | Catat cepat, visual sederhana, reminder |
| Keluarga muda | Pengeluaran bersama, tagihan rutin | Shared visibility, budget rumah tangga, tagihan |
| Freelancer / side hustler | Pemasukan tidak tetap | Pisahkan cashflow, pantau tren pemasukan dan pengeluaran |

### 4.2 Persona Utama — Web

> **Dania, 27 tahun — Profesional Swasta, Jakarta**
>
> - Sering lupa mencatat transaksi kecil di tengah kesibukan harian
> - Lebih nyaman mengetik kalimat natural daripada mengisi form panjang
> - Ingin tahu uang habis di kategori apa setiap bulan tanpa rekap manual
> - Perlu pengingat tagihan dan budget yang mudah dipantau
> - Mengakses aplikasi terutama lewat laptop / browser desktop

### 4.3 Persona Sekunder — Mobile (Target Fase 3)

> **Rafi, 21 tahun — Mahasiswa, Bandung**
>
> - Seluruh aktivitas digital dilakukan via smartphone
> - Anggaran terbatas — butuh alat yang membantu awareness pengeluaran harian
> - Tidak sabar mengisi form panjang — input harus dalam 2–3 tap
> - Mengandalkan notifikasi untuk reminder budget dan tagihan
> - Belum dilayani optimal oleh web-first experience saat ini

> ⚠️ **Gap:** Persona mobile (Rafi) belum tercermin dalam desain keputusan UX saat ini. Setiap UX decision di Fase 1 dan 2 harus divalidasi terhadap kedua persona agar tidak membangun produk yang bias web-only.

---

## 5. Tujuan Produk dan Indikator Keberhasilan

### 5.1 Tujuan Fase Saat Ini

- Menyediakan MVP web yang bisa dipakai untuk pencatatan keuangan harian end-to-end
- Mengurangi friksi input transaksi lewat AI chat, OCR, dan import mutasi
- Menyediakan fondasi monetisasi premium tanpa mengorbankan flow dasar gratis
- Menyiapkan mobile agar siap dihubungkan ke backend yang sama

### 5.2 Indikator Keberhasilan (OKR)

| Metrik | Target | Cara Ukur | Fase |
|---|---|---|---|
| Waktu input transaksi manual | < 30 detik rata-rata | Analytics event timing | Fase 1 |
| Transaksi berhasil di sesi pertama | ≥ 1 per pengguna baru | Funnel onboarding event | Fase 1 |
| 30-day retention | > 35% | Cohort analysis dari Supabase | Fase 1 |
| Pengguna pakai ≥ 2 lane input | > 40% DAU | Event per input type | Fase 1 |
| Conversion free → premium | ≥ 5% | Midtrans webhook events | Fase 2 |
| OCR accuracy rate | ≥ 80% tanpa edit | Edit rate setelah OCR | Fase 2 |
| Mobile DAU / Web DAU | ≥ 30% | Platform session tracking | Fase 3 |

> ⚠️ **Penting:** Semua metrik di atas membutuhkan event tracking yang diimplementasikan eksplisit. Tambahkan analytics layer (minimal custom events ke Supabase atau tool seperti PostHog) sebagai bagian dari Fase 1 — bukan afterthought.

---

## 6. Scope Produk

### 6.1 In Scope — Sudah Ada atau Dalam Pengerjaan

| Modul | Status | Ringkasan Requirement Aktual |
|---|---|---|
| Auth | ✅ Implemented | Login/register email, Google OAuth, session guard |
| Dashboard | ✅ Implemented | Landing page setelah login — ringkasan keuangan |
| Transaksi Manual | ✅ Implemented | Tambah, lihat, ubah, hapus — saldo wallet ter-update otomatis |
| AI Chat Input | ✅ Implemented | Ekstrak transaksi dari teks Bahasa Indonesia — **auto-save jika confidence tinggi, review-first jika confidence rendah** |
| OCR Struk | ✅ Implemented | Upload JPG/PNG/WEBP/PDF — review sebelum simpan |
| Import Mutasi | ✅ Implemented | Preview, deteksi duplikat, konfirmasi ke wallet |
| Wallet | ✅ Implemented | CRUD bank, e-wallet, cash, investment |
| Budget | ✅ Implemented | Budget bulanan, progress spent, threshold notifikasi |
| Bill Reminder | ✅ Implemented | Buat tagihan, lihat jatuh tempo, tandai lunas, hapus |
| Grup | 🟡 Partial | Create/join/role/remove/leave — enforcement premium belum menyeluruh |
| Laporan | ✅ Implemented | Summary bulanan, tren, detail kategori |
| Settings | 🟡 Partial | Profil dan preferensi — belum persisten ke backend |

### 6.2 Partial Scope — Fondasi Ada, Belum Selesai

| Modul | Gap yang Harus Ditutup |
|---|---|
| AI Financial Insight | Endpoint `/ai/insight` ada, belum memakai data riil user; perlu koneksi ke transaksi aktual pengguna |
| Premium Plan | `plan_type` ada di profil dan UI; enforcement per fitur harus didefinisikan eksplisit (lihat Bab 9) |
| Group Finance Sharing | Struktur data mendukung group/visibility; kontrol privacy belum lengkap di UX dan backend |
| Mobile App | Onboarding, home shell, tab shell, mock screens ada; belum terhubung ke auth atau API |
| Settings Persistence | Preferensi tema, mata uang, notifikasi masih di UI local state — harus disimpan ke backend |
| Kategori Kustom | Sebagian state tersimpan di localStorage — harus dipindahkan ke entity backend tersendiri |
| OCR Limit Free Tier | Struktur ada, enforcement di database belum aktif — rentan disalahgunakan |

### 6.3 Out of Current Scope

- Integrasi langsung Open Banking / BI API
- Export PDF / Excel (masuk Fase 2)
- Push notification FCM production-ready (masuk Fase 2)
- Midtrans subscription flow production-ready (masuk Fase 2)
- Sinkronisasi mobile penuh ke backend (masuk Fase 3)
- Multi-currency (field `currency` disiapkan di model data, tapi UI multi-currency belum)
- Fitur investasi / portofolio
- Offline-first sync lintas platform

---

## 7. Requirement Fungsional per Modul

Setiap modul memiliki requirement yang dapat diuji menggunakan format **Given / When / Then**.

- **Wajib** — harus selesai di fase ini sebelum modul dianggap done
- **Segera** — sprint berikutnya setelah yang Wajib selesai
- **Fase 3** — khusus mobile atau fitur yang dijadwalkan kemudian

---

### 7.1 Autentikasi

| Given (Kondisi Awal) | When (Aksi) | Then (Hasil yang Diharapkan) | Prioritas |
|---|---|---|---|
| Pengguna belum punya akun | Isi form register dengan email & password valid | Akun dibuat, pengguna masuk ke dashboard, wallet default dibuat otomatis | Wajib |
| Pengguna sudah punya akun | Login dengan email & password | Sesi aktif, pengguna diarahkan ke dashboard | Wajib |
| Pengguna belum login | Akses URL halaman utama langsung | Redirect ke `/login` — halaman utama tidak dapat diakses | Wajib |
| Pengguna klik "Lupa Password" | Isi email lalu submit | Email reset dikirim; jika email tidak terdaftar, tetap tampilkan pesan sukses generik (jangan bocorkan informasi akun) | Wajib |
| Pengguna login Google | Klik "Masuk dengan Google" | OAuth callback berhasil, akun dibuat atau disambungkan, pengguna masuk ke dashboard | Wajib |
| Pengguna sesi sudah expired | Akses halaman manapun | Redirect ke `/login` dengan pesan "Sesi berakhir, silakan masuk kembali" | Wajib |

> 🔴 **Gap:** Flow reset password belum ada di web. Ini adalah blocker keamanan dasar yang harus diselesaikan di Fase 1.

---

### 7.2 Transaksi Manual

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna punya ≥ 1 wallet aktif | Isi form transaksi dengan semua field wajib dan simpan | Transaksi tersimpan, saldo wallet berkurang (expense) atau bertambah (income) sesuai nominal | Wajib |
| Pengguna isi form | Nominal = 0 atau negatif | Form tidak dapat disubmit; tampilkan error: "Nominal harus lebih dari 0" | Wajib |
| Pengguna belum punya wallet aktif | Buka form tambah transaksi | Tampilkan empty state dengan CTA "Buat Wallet Dulu" — form tidak aktif | Wajib |
| Transaksi sudah tersimpan | Pengguna klik edit dan ubah nominal | Saldo wallet dikembalikan ke nilai sebelum transaksi, lalu disesuaikan dengan nominal baru | Wajib |
| Transaksi sudah tersimpan | Pengguna hapus transaksi | Transaksi dihapus, saldo wallet di-reverse, muncul konfirmasi sebelum hapus | Wajib |
| Pengguna simpan transaksi | Koneksi internet terputus | Tampilkan error "Gagal menyimpan, coba lagi" — data tidak hilang dari form | Segera |

---

### 7.3 AI Chat Input

Sistem menggunakan **confidence-based saving**: jika AI mengekstrak semua field wajib dengan confidence tinggi, transaksi langsung disimpan otomatis. Jika ada field yang ambigu atau confidence rendah, review card ditampilkan terlebih dahulu.

**Definisi confidence tinggi:** semua field wajib (tipe, nominal, kategori, wallet) berhasil diekstrak dengan skor confidence ≥ threshold yang ditentukan backend (nilai default: 0.85). Jika salah satu field di bawah threshold atau tidak terdeteksi, dianggap confidence rendah.

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna di halaman capture, confidence tinggi | Ketik transaksi natural language lalu kirim | Backend ekstrak semua field wajib dengan confidence ≥ threshold → transaksi **langsung tersimpan otomatis** → tampilkan notifikasi sukses ringkas dengan opsi "Batalkan" selama 5 detik | Wajib |
| Pengguna di halaman capture, confidence rendah | Ketik transaksi natural language lalu kirim | Backend mendeteksi field ambigu atau di bawah threshold → tampilkan **review card** dengan highlight pada field yang perlu diverifikasi — tidak auto-save | Wajib |
| Review card tampil | Pengguna klik "Simpan" | Transaksi tersimpan menggunakan data yang sudah diedit, saldo wallet ter-update, review card hilang | Wajib |
| Review card tampil | Pengguna klik "Edit" lalu ubah field | Field dapat diubah; simpan menggunakan data hasil edit, bukan hasil AI mentah | Wajib |
| Review card tampil | Pengguna klik "Batal" | Review card dihapus, tidak ada data yang tersimpan | Wajib |
| Transaksi auto-save berhasil | Pengguna klik "Batalkan" dalam 5 detik | Transaksi dihapus, saldo wallet di-reverse, notifikasi berubah menjadi "Dibatalkan" | Wajib |
| Teks < 2 atau > 500 karakter | Pengguna kirim input | Tampilkan error validasi, tidak ada request ke backend | Wajib |
| Pengguna mengirim 20 request dalam 1 menit | Request ke-21 dikirim | Tampilkan pesan: "Batas penggunaan AI tercapai. Coba lagi dalam 1 menit." — request tidak diproses | Wajib |
| Pengguna free tier mencapai limit bulanan | Kirim request AI chat | Tampilkan prompt upgrade ke premium dengan informasi batas yang digunakan | Segera |

**Catatan implementasi:**
- Endpoint: `POST /api/v1/ai/chat`
- Rate limit: 20 request / menit per user
- Panjang teks: 2–500 karakter

---

### 7.4 OCR Struk

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna upload file struk valid (JPG/PNG/WEBP/PDF) | File dikirim ke backend | Tampilkan loading state; hasil OCR (merchant, tanggal, nominal, kategori) muncul dalam review form | Wajib |
| Review form OCR tampil | Pengguna klik "Simpan" | Transaksi tersimpan ke wallet yang dipilih; saldo wallet ter-update | Wajib |
| Pengguna upload format tidak didukung (.gif, .doc, dll.) | File disubmit | Tampilkan error: "Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF." | Wajib |
| Pengguna upload file melebihi batas ukuran | File disubmit | Tampilkan error ukuran file sebelum upload — tidak mengirim ke server | Wajib |
| OCR gagal membaca struk (foto buram) | Hasil OCR dikembalikan | Tampilkan form kosong yang bisa diisi manual dengan pesan: "Tidak dapat membaca struk, isi manual" | Wajib |
| Pengguna free tier sudah pakai limit OCR bulanan | Upload struk | Tampilkan prompt upgrade premium; upload diblokir | Segera |

**Catatan implementasi:**
- Endpoint: `POST /api/v1/ai/receipt`
- Format didukung: JPG, PNG, WEBP, PDF
- Limit bulanan free tier: harus ditegakkan di database (saat ini belum aktif)

---

### 7.5 Import Mutasi Bank

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna upload file mutasi bank yang didukung | File disubmit ke `/imports/preview` | Tampilkan tabel preview semua baris terdeteksi; duplikat ditandai; pengguna bisa pilih baris yang akan diimpor | Wajib |
| Pengguna sudah review preview | Pilih wallet tujuan dan klik "Konfirmasi Import" | Hanya baris yang dipilih tersimpan; saldo wallet ter-update; laporan ikut berubah | Wajib |
| File berformat bank tidak dikenal | File disubmit | Tampilkan error: "Format tidak dikenali. Bank yang didukung: [daftar]. Hubungi kami jika bankmu belum didukung." | Wajib |
| File berisi duplikat transaksi yang sudah ada di sistem | Preview ditampilkan | Baris duplikat ditandai dengan label "Sudah ada" — dicentang off secara default | Wajib |
| File sangat besar (> 500 baris) | File disubmit | Tampilkan progress indicator; proses di background; notifikasi saat selesai | Segera |

**Parser yang didukung saat ini:** BCA, Mandiri, BNI, BRI, GoPay, OVO

> ⚠️ **Gap:** Belum ada manual column mapping untuk format tidak dikenal. Tambahkan sebagai fitur Fase 2.

---

### 7.6 Wallet / Dompet

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna di halaman wallet | Buat wallet baru dengan nama, tipe, dan saldo awal | Wallet tersimpan; saldo awal tercatat sebagai transaksi "initial balance" | Wajib |
| Wallet aktif dipakai transaksi | Pengguna nonaktifkan wallet | Wallet tidak muncul di dropdown transaksi baru — data historis tetap ada | Wajib |
| Wallet tidak punya transaksi | Pengguna hapus wallet | Wallet dihapus setelah konfirmasi | Wajib |
| Wallet punya transaksi | Pengguna coba hapus wallet | Tampilkan error: "Wallet tidak dapat dihapus karena masih memiliki transaksi. Nonaktifkan jika tidak ingin digunakan." | Wajib |

---

### 7.7 Budget / Anggaran

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna di halaman budget | Buat budget kategori dengan limit tertentu | Budget tersimpan; `spent_amount` otomatis dihitung dari transaksi bulan ini di kategori yang sama | Wajib |
| `spent_amount` mencapai `notify_at_percent` | Transaksi baru ditambahkan ke kategori budget | Tampilkan badge/warning pada card budget di dashboard | Wajib |
| `spent_amount` melebihi `limit_amount` | Pengguna melihat dashboard | Budget card tampil dengan warna merah dan pesan "Budget terlampaui" | Wajib |
| Bulan berganti | Sistem menjalankan reset periodik | `spent_amount` direset ke 0; `period_start` diperbarui; budget aktif tetap berlanjut | Wajib |
| Pengguna pakai kategori kustom | Buat budget untuk kategori kustom | Kategori kustom tersimpan di backend (bukan localStorage); tersedia di semua form yang relevan | Segera |

---

### 7.8 Bill Reminder / Tagihan

> ⚠️ **Gap Desain Data:** Field `is_paid` bersifat boolean flat — tidak ada riwayat pembayaran historis. Harus ditentukan: (1) Siapa yang mereset `is_paid` setiap periode — sistem atau user? (2) Bagaimana history tagihan yang sudah lunas disimpan untuk keperluan laporan? Solusi: tambahkan field `payment_history` (JSONB) ke tabel `BillReminder`.

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna di halaman tagihan | Buat tagihan baru dengan nominal, `due_day`, `recurrence` | Tagihan tersimpan; `next_due_date` dihitung otomatis dari `due_day` bulan ini atau berikutnya | Wajib |
| Tagihan belum lunas dan jatuh tempo dalam `notify_before_days` | Pengguna membuka dashboard | Tagihan tampil di widget "Mendatang" dengan badge "X hari lagi" | Wajib |
| Tagihan sudah lewat jatuh tempo | Pengguna membuka halaman tagihan | Tagihan ditandai "Terlambat" dengan warna merah | Wajib |
| Pengguna klik "Tandai Lunas" | — | `is_paid = true`; `next_due_date` diperbarui ke siklus berikutnya; riwayat pembayaran dicatat di `payment_history` | Wajib |
| Recurrence = bulanan, tagihan sudah lunas | Bulan berganti | `is_paid` direset otomatis ke `false`; `next_due_date` diperbarui; pengguna mendapat notifikasi (Fase 2) | Segera |

---

### 7.9 Groups

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna terautentikasi | Buat grup baru | Grup tersimpan; pengguna otomatis menjadi owner/admin; `invite_code` dibuat | Wajib |
| Pengguna punya invite code | Input kode dan join | Pengguna ditambahkan sebagai member; tampil di halaman grup | Wajib |
| Pengguna adalah admin grup | Ubah role anggota | Role ter-update; permission yang berlaku berubah sesuai role baru | Wajib |
| Pengguna adalah owner | Coba keluar dari grup | Tampilkan prompt: "Transfer ownership dulu sebelum keluar" — tidak bisa langsung keluar | Wajib |
| Pengguna adalah member non-admin | Keluar dari grup | Pengguna dikeluarkan; data transaksi grup tetap ada | Wajib |
| Pengguna free mencoba akses fitur grup premium | Buka halaman grup lanjutan | Tampilkan paywall dengan penjelasan fitur premium | Segera |

---

### 7.10 Laporan

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna buka halaman laporan | Pilih bulan tertentu | Tampilkan total income, expense, net; chart tren; breakdown per kategori | Wajib |
| Pengguna punya > 1 wallet | Filter berdasarkan wallet tertentu | Laporan hanya menampilkan transaksi dari wallet yang dipilih | Wajib |
| Pengguna di laporan | Klik kategori untuk detail | Tampilkan list transaksi yang masuk ke kategori itu di bulan terpilih | Wajib |
| Pengguna tidak punya transaksi di bulan yang dipilih | Buka laporan | Tampilkan empty state dengan pesan dan CTA "Catat transaksi pertamamu" | Wajib |
| Pengguna premium klik "Export" | Pilih format PDF atau Excel | File terunduh berisi data laporan bulan yang dipilih | Segera (Fase 2) |

---

### 7.11 Settings

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna di halaman settings | Ubah preferensi (tema/mata uang/notifikasi) dan simpan | Preferensi tersimpan ke backend; berlaku di session baru dan device lain | Segera |
| Pengguna ubah nama atau foto profil | Simpan perubahan | Profil ter-update di semua halaman yang menampilkan nama/foto | Segera |
| Pengguna klik "Hapus Akun" | — | Tampilkan konfirmasi 2 langkah; setelah konfirmasi, semua data dihapus permanen; pengguna logout | Segera |

---

## 8. Platform Requirement

### 8.1 Web (Platform Utama)

Web adalah satu-satunya platform yang bisa diandalkan untuk penggunaan harian saat ini. Semua flow inti produk harus dianggap web-first sampai mobile benar-benar terhubung ke backend.

| Halaman | Requirement |
|---|---|
| `/login`, `/register` | Form auth, Google OAuth, link ke reset password |
| `/dashboard` | Summary saldo, transaksi terbaru, budget ring, tagihan mendatang, wallet ringkasan |
| `/transactions` | List transaksi, filter wallet/kategori/tipe, CRUD |
| `/capture` | Tab: Manual / AI Chat / OCR Struk / Import Mutasi |
| `/wallets` | List wallet, CRUD, saldo aktual |
| `/budgets` | List budget, progress bar, CRUD, warning threshold |
| `/bills` | List tagihan, sort by due date, tandai lunas, CRUD |
| `/reports` | Summary, chart tren, breakdown kategori, filter wallet/bulan |
| `/groups` | List grup, detail grup, manajemen anggota, invite code |
| `/settings` | Profil, preferensi, plan info, hapus akun |

### 8.2 Mobile (Fase 3 — Belum Production-Ready)

> ⚠️ **Status Mobile:** Mobile belum tersambung ke Supabase Auth atau FastAPI. Semua screen masih menggunakan mock data. Jangan anggap mobile sebagai kanal aktif hingga Fase 3 selesai.

**Yang tersedia di scaffold saat ini:**
- Splash screen dan onboarding awal
- AI intro screen, setup account screen, welcome screen
- Bottom tab shell (home, transactions, budgets, reports, more)
- Tab mock screens — belum terhubung ke data nyata

**Target Fase 3:**
- Sambungkan ke Supabase Auth dan FastAPI
- Ganti mock data dengan real API calls
- State management production-ready (Zustand atau Redux Toolkit)
- Navigator production-ready (React Navigation v6)
- Push notification via FCM
- Offline-first basic (antrian transaksi saat tidak ada koneksi)

---

## 9. Model Bisnis dan Premium

### 9.1 Posisi Produk Saat Ini

Produk masih di tahap MVP. Struktur data sudah mengenal `free` dan `premium`, tetapi monetisasi belum bisa diaktifkan karena payment gateway belum selesai dan enforcement per fitur belum konsisten.

> 📌 **Aturan:** Fitur premium tidak boleh dipromosikan penuh sebelum Midtrans dan enforcement di seluruh backend selesai.

### 9.2 Tabel Fitur Free vs Premium

> 📌 Tabel ini adalah **kontrak produk**. Enforcement di backend dan UI harus mengikuti tabel ini secara konsisten sebelum monetisasi diaktifkan.

| Fitur | Free | Premium | Enforcement |
|---|---|---|---|
| Pencatatan transaksi manual | Tidak terbatas | Tidak terbatas | Tidak perlu |
| Jumlah wallet | Maks 3 | Tidak terbatas | Backend + UI |
| AI chat input | 30 req/bulan | 200 req/bulan | Backend rate limit |
| OCR struk | 10 scan/bulan | 100 scan/bulan | Backend + counter |
| Import mutasi bank | 2 kali/bulan | Tidak terbatas | Backend counter |
| Laporan dasar (summary + tren) | ✓ | ✓ | Tidak perlu |
| Export PDF / Excel | ✗ | ✓ | Feature gate |
| AI Financial Insight | ✗ | ✓ | Feature gate + endpoint guard |
| Budget (jumlah kategori) | Maks 5 | Tidak terbatas | Backend + UI |
| Grup finance | 1 grup | 5 grup | Backend + UI |
| Fitur grup lanjutan | ✗ | ✓ | Feature gate |
| Kategori kustom | Maks 5 | Tidak terbatas | Backend counter |
| Riwayat transaksi | 3 bulan | Tidak terbatas | Query filter by date |
| **Harga** | Gratis | Rp 29.000/bulan | — |

### 9.3 Logika Expiry Plan

- Saat `plan_expires_at` tercapai dan tidak ada perpanjangan → `plan_type` direset ke `"free"` secara otomatis via cron job
- Data yang melebihi batas free (wallet ke-4 dst., transaksi > 3 bulan) → tetap bisa dilihat (read-only) tapi tidak bisa ditambah data baru hingga upgrade
- Pengguna menerima email notifikasi 7 hari dan 1 hari sebelum expired (Fase 2)
- Downgrade **tidak menghapus data** — hanya membatasi aksi baru

### 9.4 Roadmap Monetisasi

- **Fase 1:** Definisikan dan terapkan enforcement per fitur sesuai tabel di atas
- **Fase 2:** Implementasikan Midtrans subscription flow dan webhook lifecycle
- **Fase 2:** Aktifkan cron job expiry plan
- **Fase 2:** Email notifikasi expiry via Supabase Edge Functions
- **Fase 3:** Eksplorasi paket keluarga atau tim (multi-user plan)

---

## 10. Arsitektur Teknis

### 10.1 Tech Stack Aktual

| Layer | Teknologi |
|---|---|
| Web Frontend | React 18 + Vite + TypeScript |
| Web State | Zustand |
| Web Charting | Recharts |
| Styling | Tailwind CSS + custom styles |
| Mobile | Expo 51 + React Native 0.74 (scaffold only) |
| Backend | FastAPI Python 3.12 |
| Database / Auth / Storage | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude API |
| Import Processing | Pandas + OpenPyXL + Chardet |
| Payment (Fase 2) | Midtrans (belum diimplementasikan) |
| Push Notification (Fase 2) | Firebase Cloud Messaging (FCM) |
| Analytics **(Fase 1 — Harus Ditambahkan)** | PostHog / Custom Supabase events |

### 10.2 Arsitektur High Level

```
[Web App]           [Mobile App Scaffold]
     |                     |
     +----------+----------+
                |
                v
         [FastAPI Backend]
            |        |
            v        v
      [Supabase]   [Anthropic API]
```

### 10.3 API Surface Utama

| Endpoint | Status | Keterangan |
|---|---|---|
| `/api/v1/auth` | ✅ Implemented | Register, login, Google OAuth, refresh token |
| `/api/v1/transactions` | ✅ Implemented | CRUD transaksi, filter, pagination |
| `/api/v1/wallets` | ✅ Implemented | CRUD wallet, saldo real-time |
| `/api/v1/budgets` | ✅ Implemented | CRUD budget, spent calculation |
| `/api/v1/bills` | ✅ Implemented | CRUD tagihan, tandai lunas, next_due_date |
| `/api/v1/ai/chat` | ✅ Implemented | Ekstraksi transaksi dari natural language |
| `/api/v1/ai/receipt` | ✅ Implemented | OCR struk foto / PDF |
| `/api/v1/ai/insight` | 🟡 Partial | AI insight — belum memakai data riil user penuh |
| `/api/v1/groups` | ✅ Implemented | CRUD grup, manajemen anggota, invite code |
| `/api/v1/imports` | ✅ Implemented | Preview + konfirmasi import mutasi bank |
| `/api/v1/reports` | ✅ Implemented | Summary, trends, category detail |
| `/api/v1/webhooks` | 🔴 Placeholder | Midtrans subscription lifecycle — belum aktif |
| `/health` | ✅ Implemented | Health check backend |

---

## 11. Model Data Inti

### 11.1 Entity dan Field

```
User
  id, email, full_name, plan_type, plan_expires_at, created_at

Wallet
  id, user_id, name, type, balance, bank_name, account_number,
  currency (default: 'IDR'),   ← TAMBAHKAN
  is_shared, group_id, is_active

Transaction
  id, wallet_id, user_id, type, amount, category, note, merchant,
  date, receipt_url, is_shared, visibility, group_id, on_behalf_of, created_by

Budget
  id, user_id, group_id, category, limit_amount, spent_amount,
  period, period_start, notify_at_percent, is_active

BillReminder
  id, user_id, name, amount, due_day, recurrence, next_due_date,
  notify_before_days, is_paid,
  payment_history (JSONB array)  ← TAMBAHKAN

Group
  id, name, description, owner_id, invite_code, invite_link, max_members

GroupMember
  id, group_id, user_id, role, status, invited_by, joined_at

Category  ← ENTITY BARU (menggantikan localStorage)
  id, user_id, name, icon, is_default
```

### 11.2 Schema Changes yang Diperlukan

| Perubahan | Tabel | Prioritas | Alasan |
|---|---|---|---|
| Tambah field `currency` (VARCHAR, default `'IDR'`) | `Wallet` | 🔴 Wajib | Memudahkan migrasi ke multi-currency tanpa schema overhaul di masa depan |
| Tambah field `payment_history` (JSONB) | `BillReminder` | 🔴 Wajib | Menyimpan riwayat kapan tagihan dibayar — tanpa ini history tagihan hilang |
| Buat tabel `Category` baru | — | 🔴 Wajib | Menggantikan kategori kustom yang saat ini tersimpan di localStorage |
| Validasi aktif `plan_expires_at` di semua endpoint premium | Semua | 🟡 Segera | Enforcement premium tidak konsisten tanpa ini |
| Tambah tabel atau integrasi analytics events | — | 🟡 Segera | Tanpa ini success metric di Bab 5 tidak bisa diukur |

### 11.3 Implikasi Produk dari Model Data

- Produk sudah siap untuk multi-wallet
- Produk mulai siap untuk group-based finance, tetapi UX dan aturan akses belum lengkap
- Plan premium sudah menjadi bagian dari model user
- Reminder tagihan dan threshold budget sudah punya fondasi data
- Kategori kustom **belum** punya fondasi backend yang memadai — harus dibangun di Fase 1

---

## 12. Non-Functional Requirement

### 12.1 Target Performa

| Area | Target | Cara Ukur | Status |
|---|---|---|---|
| API response time (non-AI) | p95 < 1 detik | APM / Supabase logs | Belum diukur |
| AI chat response | < 3 detik | Client-side timing event | Belum diukur |
| OCR processing | < 5 detik | Server-side timing log | Belum diukur |
| Web page load (LCP) | < 2.5 detik | Lighthouse / Web Vitals | Belum diukur |
| Form submission feedback | < 500ms | Client timing | Tidak ada baseline |

### 12.2 Keamanan dan Privasi

- Semua akses data harus melalui Supabase Row-Level Security (RLS) — setiap endpoint hanya mengembalikan data milik user yang terautentikasi
- Tidak ada endpoint yang mengembalikan data user lain tanpa permission group yang eksplisit
- File OCR (struk) disimpan di Supabase Storage dengan access control per-user — tidak boleh publik
- Input AI chat harus disanitasi sebelum dikirim ke Anthropic API
- **🔴 [UU PDP]** Tambahkan Privacy Policy dan mekanisme "Hapus Data Saya" sesuai UU Perlindungan Data Pribadi Indonesia (berlaku sejak 2024). Tanpa ini, aplikasi berisiko sanksi regulasi.
- Semua komunikasi antara client dan server harus menggunakan HTTPS
- API keys (Anthropic, Midtrans, dll.) tidak boleh ada di frontend code atau repository publik

### 12.3 NFR yang Belum Siap Dianggap Selesai

- Push notification delivery reliability (FCM belum aktif)
- Background job untuk import file besar (> 500 baris)
- Offline-first sync lintas platform
- Audit trail lengkap untuk shared finance group
- Performance budget khusus mobile production
- Monitoring dan alerting untuk error rate backend

---

## 13. Error State dan Empty State

Setiap modul harus memiliki error state dan empty state yang terdefinisi. Ini adalah syarat **Definisi Selesai** (Bab 17).

| Modul | Empty State | Error State | Error Network |
|---|---|---|---|
| Dashboard | Belum ada transaksi → ilustrasi + CTA "Catat pertamamu" | Gagal load → pesan + tombol Refresh | Banner "Koneksi bermasalah" non-blocking |
| Transaksi | Belum ada transaksi di filter aktif → pesan deskriptif + CTA | Gagal simpan → toast error dengan opsi retry | Form tetap aktif, error muncul saat submit |
| AI Chat | Belum ada percakapan → hint contoh kalimat input | AI gagal ekstrak → form manual kosong + pesan penjelasan | Timeout → pesan + opsi coba lagi |
| OCR | Belum upload file → drag-and-drop area dengan instruksi | OCR gagal baca → form kosong yang bisa diisi manual | Upload gagal → pesan + tombol upload ulang |
| Wallet | Belum ada wallet → CTA "Buat Wallet Pertama" | Gagal hapus (ada transaksi) → pesan penjelasan | Gagal load → pesan + Refresh |
| Budget | Belum ada budget → CTA "Set Budget Pertama" | Limit terlampaui → warning merah di card | Gagal simpan → toast error |
| Bill Reminder | Belum ada tagihan → CTA "Tambah Tagihan" | Lewat jatuh tempo → badge "Terlambat" merah | Gagal tandai lunas → toast error |
| Laporan | Belum ada transaksi bulan ini → pesan + CTA | Gagal load data → pesan + Refresh | Timeout → pesan + Refresh |
| Grup | Belum bergabung grup → CTA "Buat" atau "Join" | Invite code tidak valid → pesan error jelas | Gagal load → pesan + Refresh |

> 📌 **Aturan:** Error state **tidak boleh** menampilkan raw error message dari server ke pengguna. Semua pesan error harus ditulis dalam bahasa Indonesia yang mudah dipahami.

---

## 14. User Flow Utama

### 14.1 Flow Manual Transaction

1. User login → diarahkan ke dashboard
2. Buka `/capture` → pilih tab "Manual"
3. Pilih tipe (income / expense), isi nominal, pilih wallet aktif, pilih kategori, isi catatan, pilih tanggal
4. Klik "Simpan" → transaksi tersimpan → saldo wallet dan laporan ter-update → notifikasi sukses
5. Jika nominal = 0 atau wallet belum ada → form tidak dapat disubmit, tampilkan error

### 14.2 Flow AI Chat (Confidence-Based Saving)

**Jika confidence tinggi (semua field wajib ≥ threshold):**

1. Buka `/capture` → pilih tab "AI Chat"
2. Ketik transaksi natural language (contoh: *"beli makan siang di warteg 28rb pake bca"*)
3. Sistem mengirim ke backend → AI mengekstrak field transaksi
4. Semua field wajib terdeteksi dengan confidence ≥ threshold → **transaksi langsung tersimpan otomatis**
5. Tampilkan notifikasi sukses ringkas dengan opsi **"Batalkan"** selama 5 detik
6. Jika pengguna klik "Batalkan" → transaksi dihapus, saldo di-reverse

**Jika confidence rendah (ada field ambigu atau di bawah threshold):**

1. Buka `/capture` → pilih tab "AI Chat"
2. Ketik transaksi natural language
3. Sistem mengirim ke backend → AI mengekstrak field transaksi
4. Satu atau lebih field tidak terdeteksi atau di bawah threshold → tampilkan **review card**
5. Field yang perlu diverifikasi ditandai dengan highlight merah/kuning
6. Pengguna perbaiki field, pilih wallet, klik "Simpan"
7. Transaksi tersimpan → saldo wallet ter-update → review card hilang

### 14.3 Flow OCR Struk

1. Buka `/capture` → pilih tab "OCR Struk"
2. Upload atau drag-and-drop file struk (JPG/PNG/WEBP/PDF)
3. Backend validasi tipe dan ukuran file
4. AI menganalisis merchant, tanggal, nominal, kategori, item struk
5. Tampilkan **review form** dengan hasil OCR — **TIDAK auto-save**
6. Pengguna review dan edit jika perlu, pilih wallet, klik "Simpan"
7. Transaksi tersimpan → saldo wallet ter-update

### 14.4 Flow Import Mutasi

1. Buka `/capture` → pilih tab "Import Mutasi" → pilih sumber bank / e-wallet
2. Upload file CSV / Excel
3. Backend parsing file dan mendeteksi duplikat
4. Tampilkan tabel preview; duplikat ditandai dan dicentang off secara default
5. Pengguna pilih transaksi yang akan diimpor
6. Pilih wallet tujuan
7. Klik "Konfirmasi Import" → transaksi tersimpan → saldo wallet ter-update

### 14.5 Flow Group

1. User membuat grup atau join via invite code
2. User membuka detail grup
3. Admin mengelola role anggota (promote / demote / remove)
4. Owner tidak dapat keluar tanpa transfer ownership terlebih dahulu
5. Member bisa keluar dari grup — data transaksi grup tetap ada

---

## 15. Risiko Produk dan Mitigasi

| Risiko | Dampak | Mitigasi | Status |
|---|---|---|---|
| AI auto-save tanpa mempertimbangkan confidence → semua transaksi tersimpan meski hasil ekstraksi ambigu | 🔴 Tinggi | Terapkan confidence threshold — auto-save hanya jika ≥ threshold, review card jika di bawah | Harus diimplementasikan |
| AI salah ekstrak transaksi | 🔴 Tinggi | Review UI, highlight confidence rendah, validasi field di frontend | Partial — review ada, highlight belum |
| Kategori kustom hilang saat clear cache | 🔴 Tinggi | Pindahkan ke entity backend — tabel `Category` baru | Belum dimulai |
| Format file bank berubah | 🔴 Tinggi | Parser per sumber, maintenance berkala, fallback manual mapping | Parser ada, fallback belum |
| Gap schema cloud vs repo terbaru | 🔴 Tinggi | SQL migration script + schema compatibility layer | Partial |
| Tidak patuh UU PDP Indonesia | 🔴 Tinggi | Tambahkan Privacy Policy + endpoint hapus data + consent | Belum ada |
| Tagihan tidak punya riwayat pembayaran | 🟡 Sedang | Tambahkan `payment_history` JSONB ke `BillReminder` | Belum ada |
| Tidak ada analytics — metrik tidak bisa diukur | 🟡 Sedang | Implementasikan event tracking di Fase 1 | Belum ada |
| Premium enforcement tidak konsisten | 🟡 Sedang | Terapkan tabel free/premium Bab 9 sebelum launch monetisasi | Belum konsisten |
| OCR tidak akurat pada foto buram | 🟡 Sedang | Manual review sebelum simpan — sudah ada | ✅ Selesai |
| Mobile terlihat siap padahal belum production-ready | 🟡 Sedang | Dokumen dan roadmap menegaskan mobile masih partial | Dokumen ini |

---

## 16. Roadmap Berikutnya

### Fase 1 — Menutup Gap MVP Web

> 🎯 **Goal:** Web app stabil, tidak ada data integrity issue, semua metrik bisa diukur.

- **[KRITIS]** Implementasikan confidence-based saving pada AI chat — auto-save jika confidence ≥ threshold, review card jika di bawah threshold; tambahkan opsi "Batalkan" 5 detik setelah auto-save
- **[KRITIS]** Tambahkan flow reset password
- **[KRITIS]** Buat entity `Category` di backend — hapus dependency localStorage
- Implementasikan event analytics untuk mengukur success metric (Bab 5)
- Persist settings (tema, mata uang, notifikasi) ke backend
- Terapkan enforcement free/premium sesuai tabel Bab 9
- Tambahkan `payment_history` ke `BillReminder` + logika reset `is_paid` bulanan
- Tambahkan field `currency` ke `Wallet` (default `'IDR'`)
- Lengkapi error state dan empty state sesuai checklist Bab 13
- Lengkapi testing inti: auth, transaksi, import, laporan
- Tambahkan Privacy Policy dan mekanisme hapus data (UU PDP)

### Fase 2 — Fitur Premium dan Operasional

> 🎯 **Goal:** Monetisasi aktif, notifikasi berjalan, export tersedia.

- Implementasikan Midtrans subscription flow end-to-end
- Aktifkan webhook subscription lifecycle (upgrade, downgrade, expiry)
- Cron job auto-downgrade saat `plan_expires_at` tercapai
- Email notifikasi expiry via Supabase Edge Functions
- Implementasikan export PDF dan Excel untuk laporan
- Sambungkan bill reminder ke push notification FCM
- Manual column mapping untuk import file bank format tidak dikenal
- Background job untuk import file besar (> 500 baris)
- Kembangkan AI financial insight berbasis data riil pengguna

### Fase 3 — Mobile dan Shared Finance

> 🎯 **Goal:** Mobile production-ready, shared finance group lengkap.

- Sambungkan mobile ke Supabase Auth dan FastAPI
- Ganti mock data dengan real API calls di semua screen
- Implementasikan state management production (Zustand / Redux Toolkit)
- Navigator production-ready (React Navigation v6)
- Push notification FCM di mobile
- Offline-first basic: antrian transaksi saat tidak ada koneksi
- Lengkapi privacy / visibility control untuk transaksi dan budget grup
- Transfer ownership grup
- Optimasi performa mobile: lazy loading, image caching, bundle size

### Fase 2.5 — Professional Website Experience

> 🎯 **Goal:** Website terasa lebih matang, kredibel, dan siap scale.

- **Audit Log & Activity Timeline** (login, hapus transaksi, ubah budget, aksi grup)
- **Advanced Filter + Saved Views** untuk transaksi dan laporan
- **Recurring Transactions** (gaji, sewa, langganan) dengan scheduler bulanan
- **Goal-Based Savings** (target tabungan + progress + ETA)
- **Anomaly Detection Alerts** (peringatan pengeluaran tidak wajar vs rata-rata)
- **Monthly Financial Health Score** (0–100 + rekomendasi singkat)
- **In-app Help Center + Guided Product Tour** untuk onboarding dan adopsi fitur
- **Public Status Page** untuk transparansi incident/downtime

### Acceptance Criteria Ringkas — Fase 2.5

| Fitur | Given | When | Then |
|---|---|---|---|
| Audit Log | User membuka halaman aktivitas | Ada aksi penting terbaru | Timeline menampilkan siapa, aksi apa, kapan, dan context entity terkait |
| Saved Views | User menerapkan filter transaksi kompleks | Klik "Simpan View" | Filter tersimpan dan bisa dipakai ulang di sesi berikutnya |
| Recurring Transactions | User membuat transaksi berulang | Tanggal eksekusi tiba | Sistem membuat transaksi otomatis dan menandai sebagai recurring |
| Goal Savings | User membuat target tabungan | User mencatat pemasukan/pengeluaran | Progress goal ter-update otomatis berdasarkan alokasi saldo |
| Anomaly Alert | Pengeluaran kategori bulan ini naik signifikan | User buka dashboard/laporan | Muncul alert insight dengan kategori terdampak dan persen kenaikan |
| Health Score | User punya data transaksi minimal 1 bulan | User buka laporan bulanan | Skor kesehatan keuangan tampil beserta 2–3 rekomendasi tindakan |
| Guided Tour | User pertama kali login | User masuk dashboard | Tour interaktif tampil sekali, bisa di-skip, bisa dibuka lagi dari Help |
| Status Page | Ada gangguan layanan | User membuka status page | Komponen terdampak, waktu mulai, dan status pemulihan terlihat jelas |

---

## 17. Definisi Selesai (Definition of Done)

### 17.1 Sebuah Modul Dianggap Selesai untuk MVP bila:

- Endpoint backend aktif dan mengembalikan response yang benar
- UI web dapat menjalankan semua flow utama tanpa blocker
- Data tersimpan ke Supabase sesuai user yang terautentikasi (RLS aktif)
- Semua acceptance criteria di Bab 7 telah diverifikasi
- Error state dan empty state sesuai checklist Bab 13 sudah ada
- Tidak ada auto-save atau aksi destruktif tanpa konfirmasi pengguna
- Unit test atau integration test minimal untuk happy path sudah ada
- PR telah direview oleh minimal 1 developer lain

### 17.2 Sebuah Modul Belum Dianggap Selesai bila:

- Hanya ada UI mock tanpa koneksi ke backend nyata
- Hanya ada schema database tanpa flow pengguna
- Hanya ada placeholder endpoint yang mengembalikan hardcoded response
- AI chat auto-save tidak memiliki confidence threshold — semua input tersimpan tanpa mempertimbangkan kualitas ekstraksi
- Kategori kustom masih bergantung pada localStorage
- Error state menampilkan raw error message dari server ke pengguna
- Enforcement premium belum konsisten antara UI dan backend

### 17.3 Keputusan Produk yang Tidak Boleh Diubah Tanpa Diskusi

- Produk adalah **web-first MVP** — mobile adalah Fase 3
- Fitur premium tidak boleh dipromosikan penuh sebelum Midtrans dan enforcement selesai
- PRD harus mengikuti kondisi repo — bukan sebaliknya
- AI chat menggunakan confidence-based saving: **auto-save jika confidence ≥ threshold, review card jika di bawah threshold** — opsi "Batalkan" selalu tersedia selama 5 detik setelah auto-save
- RLS Supabase harus aktif di semua tabel yang menyimpan data user

---

## 18. Penutup

PRD ini merepresentasikan kondisi nyata proyek Catat.in per 25 April 2026 dan telah diperkuat dengan acceptance criteria, definisi error state, tabel free/premium yang eksplisit, logika model data yang lebih lengkap, dan identifikasi risiko yang lebih konkret dibanding versi sebelumnya.

Fokus utamanya bukan *"fitur apa yang menarik untuk dibangun"*, melainkan *"fitur mana yang benar-benar sudah berjalan, mana yang setengah jadi, apa yang harus diperbaiki sebelum melangkah ke fitur berikutnya, dan bagaimana cara mengukur keberhasilannya"*.

> 📌 **Aturan Update:** Dokumen ini harus diperbarui setiap kali ada perubahan signifikan pada scope web/backend/mobile, model data inti, tabel free/premium, acceptance criteria modul, atau roadmap fase. Dokumen yang tidak diperbarui akan menyesatkan pengembangan.
