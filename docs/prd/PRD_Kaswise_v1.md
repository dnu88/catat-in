# Product Requirements Document (PRD)
## Kaswise — Aplikasi Pencatatan Keuangan Personal Berbasis AI

> **Tagline:** *Catat pengeluaran semudah ngobrol — ketik, foto, atau bicara.*

| Atribut | Detail |
|---|---|
| **Versi** | 1.0 |
| **Tanggal** | 6 Mei 2026 |
| **Status** | Pre-MVP — Living Document |
| **Platform Utama** | Mobile-first (Expo: Android + iOS + Web PWA) *(Updated from v3)* |

> **Aturan Update Dokumen:** PRD ini harus diperbarui setiap kali ada perubahan signifikan pada scope mobile/PWA/backend, model data inti, tabel free/premium, acceptance criteria modul, atau roadmap fase. Dokumen yang tidak diperbarui akan menyesatkan pengembangan.

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
11. [Async AI Processing Flow](#11-async-ai-processing-flow) *(New in v1.0)*
12. [Model Data Inti](#12-model-data-inti)
13. [Non-Functional Requirement](#13-non-functional-requirement)
14. [Error State dan Empty State](#14-error-state-dan-empty-state)
15. [User Flow Utama](#15-user-flow-utama)
16. [Risiko Produk dan Mitigasi](#16-risiko-produk-dan-mitigasi)
17. [Roadmap Berikutnya](#17-roadmap-berikutnya)
18. [Definisi Selesai (Definition of Done)](#18-definisi-selesai-definition-of-done)
19. [Penutup](#19-penutup)

---

## 1. Ringkasan Produk

Kaswise adalah aplikasi pencatatan keuangan personal berbahasa Indonesia dengan pendekatan **mobile-first** *(Updated from v3 — sebelumnya web-first)*. Produk memadukan tiga lane input cepat (teks AI chat, OCR struk, **voice record**), import mutasi bank, budgeting, pengingat tagihan, grup keuangan, dan laporan keuangan.

Kaswise dibangun dengan satu codebase Expo (React Native) yang berjalan di Android, iOS, dan Web (PWA via Vercel). Backend sepenuhnya managed melalui Supabase — tidak ada VPS yang harus di-maintain solo.

Per 6 Mei 2026, status produk adalah **Pre-MVP** — keputusan ganti stack dari versi sebelumnya membuat semua modul direset ke status "belum dimulai". Dokumen ini adalah acuan pengembangan aktif: setiap modul memiliki acceptance criteria yang harus dipenuhi sebelum dianggap selesai.

---

## 2. Status Produk Saat Ini *(Updated from v3)*

### 2.1 Snapshot Implementasi

| Area | Status | Catatan |
|---|---|---|
| Mobile App (Expo) | ⬜ Belum dimulai | Setup Fase 0 |
| Web PWA (Expo Web) | ⬜ Belum dimulai | Build sama dengan mobile, deploy via Vercel |
| Supabase Backend | ⬜ Belum dimulai | Project belum dibuat |
| AI Edge Functions | ⬜ Belum dimulai | Text, OCR, Voice |
| Premium Subscription | ⬜ Belum dimulai | Midtrans integration di Fase 4 |
| Push Notification | ⬜ Belum dimulai | Expo Push di Fase 5 |
| Export Laporan | ⬜ Belum dimulai | PDF/Excel di Fase 4 |

### 2.2 Catatan Reset Stack

> 📌 **Keputusan ganti stack** dari Catat.in v3 (FastAPI + React + Vite + Supabase tanpa RLS lengkap) → Kaswise v1.0 (Expo + Supabase Cloud full-managed) untuk **menyederhanakan infrastruktur**. Supabase dipilih karena:
>
> - SQL lebih natural untuk data keuangan (relasi wallet ↔ transaksi ↔ budget)
> - Dokumentasi terbaik untuk pemula / solo developer
> - Komunitas terbesar dibanding alternatif
> - Auth + DB + Storage + Edge Functions + Realtime dalam satu platform

### 2.3 Implikasi Reset

- Tidak ada legacy code yang harus dimigrasi
- AC dari v3 tetap berlaku sebagai blueprint, hanya re-implementasi di stack baru
- Persona tetap sama, namun **Rafi (mobile) menjadi persona utama** *(Updated from v3)*

---

## 3. Latar Belakang dan Masalah

### 3.1 Problem Statement

Pengguna Indonesia sering gagal mencatat keuangan secara konsisten karena:

- Input manual terasa lambat dan repetitif
- Banyak aplikasi keuangan terlalu kompleks untuk kebutuhan harian
- Data yang sudah dicatat tidak otomatis berubah menjadi insight yang mudah dipahami
- Mutasi bank dan struk masih harus dipindahkan manual
- Kolaborasi keuangan rumah tangga atau grup kecil sering tidak rapi
- **Mengetik di mobile saat sedang sibuk lebih menyebalkan daripada bicara** *(New in v1.0)*

### 3.2 Solusi Produk

Kaswise menyederhanakan pencatatan keuangan lewat kombinasi:

- Input cepat manual dengan form sederhana
- Input natural language berbasis AI (Bahasa Indonesia)
- OCR struk foto / PDF
- **Voice record — bicara sebentar, transaksi tercatat otomatis** *(New in v1.0)*
- Import mutasi bank CSV / Excel
- Budgeting, tagihan, dan laporan ringkas
- Fondasi fitur kolaborasi grup

Fokus produk adalah membuat pengalaman mobile yang usable end-to-end sejak hari pertama, dengan PWA sebagai bonus di-build dari codebase yang sama.

---

## 4. Target Pengguna

### 4.1 Segmen Pengguna

| Segmen | Profil | Kebutuhan Utama |
|---|---|---|
| Mahasiswa / Gen Z | Mobile-first, anggaran terbatas | Catat cepat, visual sederhana, reminder |
| Profesional muda | Pekerja kantoran, pemasukan tetap | Tracking pengeluaran, budgeting, laporan bulanan |
| Keluarga muda | Pengeluaran bersama, tagihan rutin | Shared visibility, budget rumah tangga, tagihan |
| Freelancer / side hustler | Pemasukan tidak tetap | Pisahkan cashflow, pantau tren pemasukan dan pengeluaran |

### 4.2 Persona Utama — Mobile *(Updated from v3 — naik dari sekunder ke utama)*

> **Rafi, 21 tahun — Mahasiswa, Bandung**
>
> - Seluruh aktivitas digital dilakukan via smartphone
> - Anggaran terbatas — butuh alat yang membantu awareness pengeluaran harian
> - Tidak sabar mengisi form panjang — input harus dalam 2–3 tap
> - Lebih nyaman bicara cepat daripada mengetik di keyboard mobile
> - Mengandalkan notifikasi untuk reminder budget dan tagihan

### 4.3 Persona Sekunder — PWA / Desktop

> **Dania, 27 tahun — Profesional Swasta, Jakarta**
>
> - Sering lupa mencatat transaksi kecil di tengah kesibukan harian
> - Lebih nyaman mengetik kalimat natural daripada mengisi form panjang
> - Ingin tahu uang habis di kategori apa setiap bulan tanpa rekap manual
> - Akses Kaswise lewat PWA di laptop saat akhir bulan untuk review laporan

> ⚠️ **Catatan UX:** Karena mobile-first, semua keputusan UX diprioritaskan untuk Rafi. Pastikan flow utama selesai dalam ≤ 3 tap dan ≤ 1 layar tanpa scroll panjang.

---

## 5. Tujuan Produk dan Indikator Keberhasilan

### 5.1 Tujuan Fase Saat Ini

- Menyediakan MVP mobile yang bisa dipakai untuk pencatatan keuangan harian end-to-end
- Mengurangi friksi input transaksi lewat AI chat, OCR, voice, dan import mutasi
- Menyediakan fondasi monetisasi premium tanpa mengorbankan flow dasar gratis
- PWA sebagai bonus channel untuk pengguna desktop, build dari codebase yang sama

### 5.2 Indikator Keberhasilan (OKR)

| Metrik | Target | Cara Ukur | Fase |
|---|---|---|---|
| Waktu input transaksi (semua mode) | < 15 detik rata-rata | Analytics event timing | Fase 2 |
| Transaksi berhasil di sesi pertama | ≥ 1 per pengguna baru | Funnel onboarding event | Fase 2 |
| 30-day retention | > 35% | Cohort analysis dari Supabase | Fase 2 |
| Pengguna pakai ≥ 2 lane input | > 40% DAU | Event per input type | Fase 2 |
| Voice input adoption | ≥ 25% DAU memakai voice | Event input_type='voice' *(New in v1.0)* | Fase 2 |
| Conversion free → premium | ≥ 5% | **Midtrans webhook events** | Fase 4 |
| OCR accuracy rate | ≥ 80% tanpa edit | Edit rate setelah OCR | Fase 4 |
| Mobile DAU / PWA DAU | ≥ 70% mobile | Platform session tracking | Fase 4 |

> ⚠️ **Penting:** Semua metrik di atas membutuhkan event tracking. Tambahkan analytics layer (PostHog atau custom event tracking ke Supabase) di Fase 5.

---

## 6. Scope Produk

### 6.1 In Scope — MVP Kaswise

| Modul | Fase | Ringkasan Requirement |
|---|---|---|
| Auth | Fase 0 | Login/register email, Google OAuth via Supabase Auth |
| Dashboard | Fase 2 | Ringkasan saldo, transaksi terbaru, shortcut 4 mode input |
| Transaksi Manual | Fase 2 | Tambah, lihat, ubah, hapus — saldo wallet ter-update otomatis |
| AI Chat Input | Fase 1 | Ekstrak transaksi dari teks BI — confidence-based saving |
| OCR Struk | Fase 1 | Upload JPG/PNG/WEBP/PDF — review sebelum simpan |
| **Voice Input** *(New in v1.0)* | Fase 1 | Rekam suara → Whisper → Claude → review/auto-save |
| Import Mutasi | Fase 3 | Preview, deteksi duplikat, konfirmasi ke wallet |
| Wallet | Fase 3 | CRUD bank, e-wallet, cash, investment |
| Budget | Fase 3 | Budget bulanan, progress spent, threshold notifikasi |
| Bill Reminder | Fase 3 | Buat tagihan, jatuh tempo, tandai lunas |
| Laporan | Fase 3 | Summary bulanan, tren, breakdown kategori |
| Grup | Fase 5 | Create/join/role/remove/leave |
| Settings | Fase 2 | Profil, plan info, upgrade CTA |

### 6.2 Out of Current Scope

- Integrasi langsung Open Banking / BI API
- Fitur investasi / portofolio
- Offline-first sync penuh lintas platform (basic queue di Fase 5)
- Multi-currency UI (field `currency` disiapkan di model data)

---

## 7. Requirement Fungsional per Modul

Setiap modul memiliki requirement format **Given / When / Then**.

- **Wajib** — harus selesai di fase ini sebelum modul dianggap done
- **Segera** — sprint berikutnya setelah yang Wajib selesai

---

### 7.1 Autentikasi *(Updated from v3 — Supabase OAuth → Supabase Auth)*

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna belum punya akun | Isi form register email & password valid | Akun dibuat via Supabase Auth, masuk ke dashboard, wallet default dibuat | Wajib |
| Pengguna sudah punya akun | Login email & password | Sesi aktif, diarahkan ke dashboard | Wajib |
| Pengguna belum login | Akses route protected | Redirect ke `/login` via Expo Router guard | Wajib |
| Pengguna klik "Lupa Password" | Isi email lalu submit | Email reset dikirim Supabase Auth; pesan sukses generik tanpa membocorkan info akun | Wajib |
| Pengguna login Google | Klik "Masuk dengan Google" | OAuth callback Supabase berhasil, akun dibuat/disambungkan | Wajib |
| Sesi expired | Akses screen manapun | Redirect ke `/login` dengan pesan "Sesi berakhir" | Wajib |

---

### 7.2 Transaksi Manual

| Given | When | Then | Prioritas |
|---|---|---|---|
| Pengguna punya ≥ 1 wallet aktif | Isi form transaksi dan simpan | Tersimpan, saldo wallet ter-update sesuai type | Wajib |
| Nominal = 0 atau negatif | Submit form | Form tidak dapat disubmit; error: "Nominal harus lebih dari 0" | Wajib |
| Belum punya wallet aktif | Buka form tambah | Empty state + CTA "Buat Wallet Dulu" | Wajib |
| Edit transaksi nominal | Simpan perubahan | Saldo wallet di-reverse ke nilai sebelum, lalu disesuaikan ulang | Wajib |
| Hapus transaksi | Konfirmasi hapus | Saldo wallet di-reverse, transaksi terhapus | Wajib |

---

### 7.3 AI Chat Input *(Updated from v3 — tambah async flow note)*

Sistem menggunakan **confidence-based saving**: jika Claude mengekstrak semua field wajib dengan confidence tinggi, transaksi langsung disimpan otomatis. Jika ada field ambigu, review card ditampilkan.

**Definisi confidence tinggi:** semua field wajib (type, nominal, kategori, wallet) berhasil diekstrak dengan skor confidence ≥ threshold (default 0.85). Jika di bawah, dianggap rendah.

> 📌 **Catatan async flow:** Semua input AI berjalan async via Supabase Edge Functions + Realtime. Lihat Bab 11 untuk detail lengkap.

| Given | When | Then | Prioritas |
|---|---|---|---|
| Di tab "Teks", confidence tinggi | Ketik natural language → kirim | Edge Function ekstrak via Claude Haiku → row UPDATE status="done" → UI auto-refresh via Realtime → notifikasi sukses + opsi "Batalkan" 5 detik | Wajib |
| Confidence rendah | Kirim teks ambigu | Row status="done" + flag review_required → review card muncul, field ambigu di-highlight | Wajib |
| Review card tampil | Klik "Simpan" | Tersimpan dengan data hasil edit, saldo wallet ter-update | Wajib |
| Auto-save berhasil | Klik "Batalkan" dalam 5 detik | Transaksi dihapus, saldo wallet di-reverse | Wajib |
| Teks < 2 atau > 500 karakter | Submit | Error validasi client-side, tidak ada request | Wajib |
| Free tier mencapai limit bulanan | Kirim request | Paywall upgrade dengan info batas terpakai | Wajib |

---

### 7.4 OCR Struk *(Updated from v3 — split digital/fisik)*

Digital (screenshot e-receipt, PDF struk e-commerce) → free tier dengan **claude-haiku-3-5**.
Fisik (foto struk kertas, kondisi tidak ideal) → premium dengan **claude-sonnet-4** untuk akurasi tinggi.

| Given | When | Then | Prioritas |
|---|---|---|---|
| Upload struk digital (JPG/PNG/WEBP/PDF screenshot) | File ke Supabase Storage → Edge Function | Claude Haiku ekstrak merchant/tanggal/nominal/kategori → review form muncul | Wajib |
| Upload foto struk fisik, user free | File disubmit | Paywall: "Foto struk fisik tersedia di Premium untuk akurasi tinggi" | Wajib |
| Upload foto struk fisik, user premium | File disubmit | Edge Function pakai Claude Sonnet 4 → review form | Wajib |
| Klik "Simpan" di review form | — | Transaksi tersimpan, saldo wallet ter-update | Wajib |
| Format tidak didukung (.gif, .doc) | Submit | Error: "Format tidak didukung. Gunakan JPG/PNG/WEBP/PDF" | Wajib |
| OCR gagal baca | Hasil dikembalikan | Form kosong yang bisa diisi manual + pesan "Tidak dapat membaca struk" | Wajib |
| Free tier limit OCR digital tercapai | Upload | Paywall upgrade premium | Wajib |

**Catatan:**
- Bucket Supabase Storage: `receipts` (RLS private per-user)
- Limit free tier ditegakkan **server-side di Edge Function**, bukan client-side

---

### 7.5 Voice Input *(New in v1.0)*

Mode input baru — user merekam suara, file audio diunggah ke Supabase Storage, Edge Function memanggil Whisper untuk transkripsi lalu Claude untuk ekstraksi.

| Given | When | Then | Prioritas |
|---|---|---|---|
| Di tab "Rekam" | Tekan tombol rekam, bicara, lepas | File `.m4a` upload ke Supabase Storage (`voice-inputs` bucket) → status "processing" muncul di UI | Wajib |
| Audio terupload | Edge Function memproses | Whisper API (`whisper-1`) transkrip auto-detect ID/EN → Claude ekstrak → row UPDATE status="done" → UI refresh via Realtime | Wajib |
| Transkripsi selesai, confidence tinggi | Proses done | Transaksi tersimpan otomatis + opsi "Batalkan" 5 detik | Wajib |
| Transkripsi selesai, confidence rendah | Proses done | Review card muncul, user bisa edit transkripsi & field sebelum simpan | Wajib |
| User free, rekaman ke-31 di bulan ini | Coba rekam | Paywall: "Batas 30 rekaman/bulan — upgrade untuk lanjut" | Wajib |
| Audio noise berlebihan / tidak terdeteksi | Whisper gagal | Error: "Suara tidak dikenali, coba di tempat lebih tenang" → row status="error" | Wajib |
| User tutup app saat processing | Buka kembali | Query rows status="processing" → tampilkan sebagai pending state | Wajib |

**Catatan teknis:**
- Bucket `voice-inputs` — RLS private per-user
- File audio **auto-delete** dari Supabase Storage di `finally` block Edge Function (sukses atau gagal)
- Model Whisper: `whisper-1` (~$0.006/menit) — bilingual ID + EN
- Durasi maksimum rekaman: 60 detik per input

---

### 7.6 Import Mutasi Bank

| Given | When | Then | Prioritas |
|---|---|---|---|
| Upload file mutasi yang didukung | Edge Function parsing | Tampil tabel preview semua baris; duplikat ditandai & dicentang off | Wajib |
| Sudah review preview | Pilih wallet tujuan, klik "Konfirmasi" | Hanya baris dipilih tersimpan; saldo wallet ter-update | Wajib |
| Format tidak dikenal | Submit | Error: "Format tidak dikenali. Bank yang didukung: [daftar]" | Wajib |
| File berisi duplikat | Preview | Ditandai "Sudah ada", dicentang off default | Wajib |
| File > 500 baris | Submit | Background processing di Edge Function; notifikasi saat selesai | Segera |

**Parser yang didukung:** BCA, Mandiri, BNI, BRI, GoPay, OVO

---

### 7.7 Wallet / Dompet

| Given | When | Then | Prioritas |
|---|---|---|---|
| Buat wallet baru dengan nama, tipe, saldo awal | Simpan | Wallet tersimpan; saldo awal jadi transaksi "initial balance" | Wajib |
| Wallet aktif dipakai transaksi | Nonaktifkan | Tidak muncul di dropdown transaksi baru; data historis tetap ada | Wajib |
| Wallet tidak punya transaksi | Hapus | Wallet dihapus setelah konfirmasi | Wajib |
| Wallet punya transaksi | Coba hapus | Error: "Wallet tidak dapat dihapus karena masih memiliki transaksi" | Wajib |

---

### 7.8 Budget / Anggaran

| Given | When | Then | Prioritas |
|---|---|---|---|
| Buat budget kategori dengan limit | Simpan | `spent_amount` dihitung dari transaksi bulan ini di kategori sama | Wajib |
| `spent_amount` mencapai `notify_at_percent` | Transaksi baru ditambah | Badge/warning pada card budget di dashboard | Wajib |
| `spent_amount` melebihi limit | Lihat dashboard | Card merah dengan pesan "Budget terlampaui" | Wajib |
| Bulan berganti | Sistem reset periodik | `spent_amount`=0; `period_start` diperbarui | Wajib |

---

### 7.9 Bill Reminder / Tagihan

| Given | When | Then | Prioritas |
|---|---|---|---|
| Buat tagihan baru dengan nominal, `due_day`, recurrence | Simpan | `next_due_date` dihitung otomatis dari `due_day` bulan ini/berikutnya | Wajib |
| Belum lunas, dalam `notify_before_days` | Buka dashboard | Tampil di widget "Mendatang" dengan badge "X hari lagi" | Wajib |
| Lewat jatuh tempo | Buka halaman tagihan | Ditandai "Terlambat" warna merah | Wajib |
| Klik "Tandai Lunas" | — | `is_paid=true`; `next_due_date` diperbarui; entry baru di `payment_history` | Wajib |
| Recurrence bulanan, sudah lunas, bulan berganti | Cron | `is_paid` reset; `next_due_date` diperbarui; notifikasi (Fase 5) | Segera |

---

### 7.10 Groups *(Fase 5)*

| Given | When | Then | Prioritas |
|---|---|---|---|
| User terautentikasi | Buat grup baru | Grup tersimpan; user otomatis owner/admin; `invite_code` dibuat | Wajib |
| Punya invite code | Input kode dan join | User ditambahkan sebagai member; tampil di halaman grup | Wajib |
| User adalah admin | Ubah role anggota | Role ter-update; permission berubah | Wajib |
| User adalah owner | Coba keluar | Prompt: "Transfer ownership dulu sebelum keluar" | Wajib |
| User free coba akses fitur grup premium | Buka halaman lanjutan | Paywall dengan penjelasan fitur premium | Segera |

---

### 7.11 Laporan

| Given | When | Then | Prioritas |
|---|---|---|---|
| Buka laporan, pilih bulan | — | Total income/expense/net; chart tren; breakdown per kategori | Wajib |
| Punya > 1 wallet | Filter wallet tertentu | Hanya transaksi wallet tersebut | Wajib |
| Klik kategori untuk detail | — | List transaksi kategori itu di bulan terpilih | Wajib |
| Tidak ada transaksi bulan dipilih | Buka laporan | Empty state + CTA "Catat transaksi pertamamu" | Wajib |
| User premium klik "Export" | Pilih PDF/Excel | File terunduh berisi data laporan | Segera (Fase 4) |

---

## 8. Platform Requirement *(Updated from v3 — total restruktur)*

### 8.1 Mobile + PWA dari Codebase yang Sama

Tidak ada lagi pembagian "web platform" vs "mobile platform". Satu codebase Expo dibangun untuk tiga target:

- **Android** — build via EAS, distribusi Play Store
- **iOS** — build via EAS, distribusi App Store
- **Web (PWA)** — Expo Web di-deploy ke Vercel

### 8.2 Screen Map (Expo Router — file-based routing)

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (tabs)/
│   ├── index.tsx          → Dashboard
│   ├── transactions.tsx   → List + filter
│   ├── capture.tsx        → 4 tab: Teks / Foto / Rekam / Import
│   ├── reports.tsx        → Summary + breakdown
│   └── settings.tsx       → Profil + plan + logout
├── wallets/[id].tsx
├── budgets/[id].tsx
├── bills/[id].tsx
└── groups/[id].tsx
```

### 8.3 Catatan Platform-specific

- Voice input: gunakan `expo-av` (recording API yang sama Android/iOS)
- PWA tidak mendukung voice input optimal di iOS Safari — fallback ke teks dengan informasi "Rekam tidak tersedia di Safari, gunakan teks atau aplikasi mobile"
- Notifikasi: Expo Push (Fase 5)

---

## 9. Model Bisnis dan Premium *(Updated from v3)*

### 9.1 Posisi Produk

Produk masih di tahap Pre-MVP. Struktur data sudah mengenal `free` dan `premium`, monetisasi diaktifkan di Fase 4.

> 📌 **Aturan:** Fitur premium tidak boleh dipromosikan penuh sebelum Midtrans dan enforcement di Edge Function selesai.

### 9.2 Tabel Fitur Free vs Premium

| Fitur | Free | Premium | Enforcement |
|---|---|---|---|
| Pencatatan transaksi manual | Tidak terbatas | Tidak terbatas | Tidak perlu |
| Jumlah wallet | Maks 3 | Tidak terbatas | Supabase RLS + Edge Function server-side plan check |
| AI chat input (teks) | 30 req/bulan | 200 req/bulan | Edge Function rate limit |
| OCR struk **digital** *(Updated from v3)* | Unlimited (claude-haiku-3-5) | Unlimited (claude-haiku-3-5) | Tidak perlu |
| OCR struk **fisik** *(New in v1.0)* | ❌ | Unlimited (claude-sonnet-4) | Edge Function plan gate |
| **Voice record** *(New in v1.0)* | 30x/bulan | Unlimited | Edge Function counter |
| Import mutasi bank | 2 kali/bulan | Tidak terbatas | Edge Function counter |
| Laporan dasar (summary + tren) | ✓ | ✓ | Tidak perlu |
| Export PDF / Excel | ✗ | ✓ | Feature gate |
| AI Financial Insight (claude-sonnet-4) | ✗ | ✓ | Feature gate + endpoint guard |
| Budget (jumlah kategori) | Maks 5 | Tidak terbatas | RLS + UI |
| Grup finance | 1 grup | 5 grup | RLS + UI |
| Kategori kustom | Maks 5 | Tidak terbatas | Edge Function counter |
| Riwayat transaksi | 3 bulan | Tidak terbatas | Query filter by date |
| **Harga** | Gratis | Rp 29.000/bulan | — |

### 9.3 Logika Expiry Plan

- Saat `plan_expires_at` tercapai dan tidak ada perpanjangan → `plan` direset ke `"free"` via Edge Function cron (Supabase Scheduled Functions)
- Data yang melebihi batas free → tetap bisa dilihat (read-only) hingga upgrade
- Email notifikasi 7 hari dan 1 hari sebelum expired (Fase 4)
- Downgrade **tidak menghapus data** — hanya membatasi aksi baru

### 9.4 Roadmap Monetisasi

- **Fase 4:** Implementasikan Midtrans subscription flow + webhook lifecycle
- **Fase 4:** Aktifkan cron job expiry plan
- **Fase 4:** Email notifikasi expiry via Supabase Edge Functions
- **Fase 5+:** Eksplorasi paket keluarga / tim multi-user

---

## 10. Arsitektur Teknis *(Updated from v3 — total ganti stack)*

### 10.1 Tech Stack Final

**Frontend:**

| Layer | Teknologi |
|---|---|
| App Framework | Expo SDK + Expo Router (file-based routing) |
| Styling | NativeWind v4 (Tailwind untuk React Native) |
| State Management | Zustand |
| Audio Recording | expo-av |
| Charting | Victory Native (mobile) / Recharts (web) |
| Backend SDK | @supabase/supabase-js |

**Backend (Supabase Cloud — managed, no VPS):**

| Layer | Teknologi |
|---|---|
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | Supabase PostgreSQL (SQL — relational) |
| Storage | Supabase Storage (struk + audio, RLS private) |
| Compute | Supabase Edge Functions (Deno + TypeScript) — AI orchestration |
| Realtime | Supabase Realtime — push update setelah AI selesai |
| Security | Row Level Security (RLS) di **semua** tabel |

**AI Layer:**

| Use Case | Model | Tier |
|---|---|---|
| Input teks → ekstrak transaksi | Anthropic `claude-haiku-3-5` | Free |
| OCR struk digital | Anthropic `claude-haiku-3-5` | Free |
| OCR struk fisik (foto kondisi tidak ideal) | Anthropic `claude-sonnet-4` | Premium |
| AI Financial Insight (anomali, saran hemat) | Anthropic `claude-sonnet-4` | Premium |
| Speech-to-text (bilingual ID+EN) | OpenAI `whisper-1` | Free 30/bulan |

**Deployment:**

- **Vercel** — Expo Web build (PWA only)
- **Supabase Cloud** — semua backend, no VPS

**Payment:**

- **Midtrans** — QRIS, Virtual Account, kartu kredit *(dipertahankan dari v3)*

### 10.2 Arsitektur High-Level

```
┌──────────────┐         ┌─────────────────────┐        ┌─────────────────┐
│  Expo App    │ ──────► │   Supabase Cloud    │ ─────► │  Anthropic API  │
│ (iOS/Android)│         │   Auth + DB + RLS   │        │ Claude Haiku/Son│
└──────────────┘         │   Storage + Realtime│        └─────────────────┘
                         │   Edge Functions    │
┌──────────────┐         │                     │        ┌─────────────────┐
│ Vercel PWA   │ ──────► │                     │ ─────► │  OpenAI Whisper │
│ (Expo Web)   │         └─────────────────────┘        │   whisper-1     │
└──────────────┘                                        └─────────────────┘
```

### 10.3 Edge Function Surface Utama

| Function | Trigger | Keterangan |
|---|---|---|
| `process-text` | INSERT row di transactions input_type='text' | Claude Haiku ekstrak → UPDATE row |
| `process-image` | INSERT row di transactions input_type='image' | Claude Haiku/Sonnet ekstrak → UPDATE row |
| `process-voice` | INSERT row di transactions input_type='voice' | Whisper → Claude → UPDATE row → DELETE audio |
| `process-import` | POST manual via client | Parse CSV/Excel → preview → batch insert |
| `expiry-cron` | Supabase Scheduled | Cek `plan_expires_at` → auto-downgrade |
| `midtrans-webhook` | HTTP POST dari Midtrans | Update plan setelah pembayaran |

---

## 11. Async AI Processing Flow *(New in v1.0)*

Semua AI processing via Supabase Edge Functions berjalan **asynchronous** — client tidak menunggu AI selesai. Ini wajib untuk semua mode input AI (teks, foto, voice, import).

### 11.1 Step-by-step Flow

```
1. User submit input (teks / foto / audio / CSV)
   ↓
2. Client INSERT row ke tabel transactions:
   { status: "processing", input_type, raw_input, user_id, created_at }
   ↓
3. Client langsung dapat acknowledgment — UI tidak block
   ↓
4. Client subscribe Supabase Realtime pada tabel transactions
   filter: user_id = current_user AND id = inserted_id
   ↓
5. Edge Function trigger (via Supabase pg_net atau manual invoke):
   ├── [jika audio] → Whisper API → teks transkripsi
   └── [semua]      → Claude API  → ekstrak JSON
                     { nominal, kategori, merchant, tanggal, type }
   ↓
6. Edge Function UPDATE row:
   { status: "done", nominal, kategori, merchant, tanggal, ... }
   ↓
7. Realtime trigger → UI Expo auto-refresh dengan hasil
   ↓
8. Jika error: UPDATE row { status: "error", error_message }
   → UI tampilkan error state dengan opsi retry
```

### 11.2 UI Requirements

- Tampilkan **skeleton / spinner** antara step 2–7
- Jangan block user dari aksi lain selama processing — user bisa lanjut ke screen lain
- Jika user tutup app dan buka lagi: query rows dengan `status="processing"` lebih dari 5 menit lalu → tampilkan sebagai pending state, beri opsi "Batalkan"

### 11.3 Kenapa Async?

- Voice processing bisa makan 5–15 detik (Whisper + Claude) — tidak boleh block UI
- Edge Function timeout default 150 detik — async lebih aman
- Realtime menjamin UX feel "magic" tanpa client polling

---

## 12. Model Data Inti *(Updated from v3 — schema baru dengan RLS)*

### 12.1 Skema PostgreSQL Supabase

Semua tabel pakai UUID, timestamps, dan **RLS aktif** di setiap tabel. RLS policy wajib:
- SELECT/INSERT/UPDATE/DELETE: `auth.uid() = user_id`
- Untuk tabel grup: cek membership via `group_members`

```sql
-- profiles (extend dari auth.users Supabase)
profiles
  id (uuid, FK auth.users)
  name, plan (free|premium), plan_expires_at, created_at

-- transaksi
transactions
  id, user_id (FK), wallet_id (FK), group_id (FK nullable)
  input_type (text|image|voice|import|manual)
  raw_input (text)
  status (processing|done|error)
  error_message (nullable)
  nominal, type (income|expense)
  kategori, merchant, tanggal, catatan, receipt_url
  is_verified, created_at, updated_at

-- dompet
wallets
  id, user_id (FK), name
  type (cash|bank|ewallet|investment)
  balance, currency (default 'IDR')
  bank_name, account_number
  is_shared, group_id (FK nullable), is_active, created_at

-- anggaran
budgets
  id, user_id (FK), group_id (FK nullable)
  category, limit_amount, spent_amount
  period (monthly|weekly), period_start
  notify_at_percent, is_active, created_at

-- tagihan
bill_reminders
  id, user_id (FK), name, amount
  due_day, recurrence (monthly|yearly|once)
  next_due_date, notify_before_days, is_paid
  payment_history (jsonb), created_at

-- kategori
categories
  id, user_id (FK), name, icon
  is_default, budget_limit, created_at

-- grup
groups
  id, name, owner_id (FK), invite_code, max_members, created_at

group_members
  id, group_id (FK), user_id (FK)
  role (admin|member), joined_at

-- ringkasan bulanan (cache utk performa)
monthly_summaries
  id, user_id (FK), bulan, tahun
  total_pengeluaran, total_pemasukan
  by_kategori (jsonb), ai_insight, created_at
```

### 12.2 Storage Buckets (RLS private per-user)

| Bucket | Isi | Auto-delete |
|---|---|---|
| `receipts` | Foto/PDF struk OCR | Tidak |
| `voice-inputs` | File `.m4a` rekaman voice | Ya — di `finally` block Edge Function |

### 12.3 Implikasi Produk

- Schema sudah siap multi-wallet, multi-grup, multi-currency
- `transactions.status` kunci async flow — wajib indexed
- `payment_history` JSONB di `bill_reminders` simpan history kapan tagihan dibayar
- Tidak ada localStorage untuk kategori kustom — semua di tabel `categories`

---

## 13. Non-Functional Requirement *(Updated from v3)*

### 13.1 Target Performa

| Area | Target | Cara Ukur |
|---|---|---|
| API response time non-AI | p95 < 1 detik | Supabase logs |
| AI chat (teks → done di UI) | < 5 detik | Client timing event |
| OCR processing (image → done) | < 8 detik | Edge Function log |
| **Voice end-to-end** *(New in v1.0)* | **< 15 detik** | Client timing event |
| **Realtime latency** *(New in v1.0)* | **< 1 detik** (status done → UI update) | Realtime ack timing |
| **Edge Function cold start** *(New in v1.0)* | **< 2 detik** | Supabase metrics |
| App launch (mobile) | < 2 detik | Expo metrics |
| PWA LCP | < 2.5 detik | Lighthouse |

### 13.2 Keamanan dan Privasi

- **Supabase RLS aktif di semua tabel** — endpoint hanya kembalikan data milik user terautentikasi
- File audio di Supabase Storage harus **private (RLS)** dan **auto-delete setelah processing** selesai (sukses atau gagal) *(New in v1.0)*
- File struk OCR di Supabase Storage juga private per-user
- Input AI disanitasi sebelum dikirim ke Anthropic / OpenAI
- **🔴 [UU PDP]** Tambahkan Privacy Policy + endpoint hapus data + consent dialog sesuai UU PDP Indonesia
- HTTPS untuk semua komunikasi
- API keys (Anthropic, OpenAI, Midtrans) **hanya** di Supabase Edge Function env vars — tidak ada di client

### 13.3 Reliability

- Edge Function timeout default 150 detik — set `max_tokens` Claude secukupnya
- Rate limiting per user di Edge Function untuk cegah abuse Anthropic API
- Retry mechanism: client otomatis retry jika status="processing" > 60 detik

---

## 14. Error State dan Empty State *(Updated from v3 — tambah voice)*

| Modul | Empty State | Error State | Error Network |
|---|---|---|---|
| Dashboard | Belum ada transaksi → ilustrasi + CTA "Catat pertamamu" | Gagal load → pesan + Refresh | Banner "Koneksi bermasalah" non-blocking |
| Transaksi | Belum ada di filter aktif → pesan + CTA | Gagal simpan → toast + retry | Form tetap aktif |
| AI Chat (teks) | Belum ada percakapan → hint contoh kalimat | Status="error" → pesan + form manual | Timeout → opsi coba lagi |
| OCR | Belum upload → drag-and-drop area | Status="error" → form manual + pesan | Upload gagal → upload ulang |
| **Voice** *(New in v1.0)* | **Belum pernah rekam → ilustrasi mic + tip "Tekan dan tahan untuk rekam"** | **Whisper gagal → "Suara tidak dikenali" + retry** | **Upload audio gagal → opsi rekam ulang** |
| Wallet | Belum ada wallet → CTA "Buat Wallet Pertama" | Gagal hapus → pesan penjelasan | Refresh |
| Budget | Belum ada budget → CTA "Set Budget Pertama" | Limit terlampaui → warning merah | Toast error |
| Bill Reminder | Belum ada tagihan → CTA "Tambah Tagihan" | Lewat jatuh tempo → badge "Terlambat" | Toast error |
| Laporan | Tidak ada transaksi bulan ini → empty + CTA | Gagal load → pesan + Refresh | Refresh |
| Grup | Belum bergabung → CTA "Buat" / "Join" | Invite code tidak valid → pesan jelas | Refresh |

> 📌 **Aturan:** Error state **tidak boleh** menampilkan raw error message dari server. Semua pesan error dalam Bahasa Indonesia yang mudah dipahami.

---

## 15. User Flow Utama *(Updated from v3 — tambah voice + async note)*

### 15.1 Flow Manual Transaction

1. User login → diarahkan ke dashboard
2. Buka tab "Capture" → pilih sub-tab "Manual"
3. Pilih type, isi nominal, pilih wallet, kategori, catatan, tanggal
4. Klik "Simpan" → transaksi tersimpan → saldo + laporan ter-update

### 15.2 Flow AI Chat — Teks (Async + Confidence-Based)

**Confidence tinggi:**
1. Tab "Capture" → sub-tab "Teks"
2. Ketik *"beli makan siang di warteg 28rb pake bca"*
3. Client INSERT row status="processing" → spinner muncul
4. Edge Function: Claude Haiku ekstrak → UPDATE row status="done"
5. Realtime → UI auto-refresh → notifikasi sukses + "Batalkan" 5 detik

**Confidence rendah:**
1–4 sama
5. UI tampilkan review card → user edit → klik "Simpan"
6. Transaksi tersimpan, saldo ter-update

### 15.3 Flow OCR Struk

1. Tab "Capture" → sub-tab "Foto"
2. Upload/ambil foto struk
3. Client INSERT row status="processing" + upload ke Storage
4. Edge Function: Claude Haiku (digital) atau Sonnet (fisik, premium only) ekstrak → UPDATE
5. Realtime → review form muncul (TIDAK auto-save)
6. User review/edit → "Simpan"

### 15.4 Flow Voice Input *(New in v1.0)*

1. Tab "Capture" → sub-tab "Rekam"
2. Tekan & tahan tombol mic, bicara *"makan siang dua puluh ribu di warteg pake bca"*, lepas
3. File `.m4a` upload ke `voice-inputs` bucket → Client INSERT row status="processing"
4. Edge Function: Whisper transkripsi → Claude Haiku ekstrak → UPDATE row → DELETE audio
5. Realtime → UI auto-refresh
6. **Confidence tinggi:** auto-save + "Batalkan" 5 detik
7. **Confidence rendah:** review card dengan transkripsi + field yang bisa diedit

### 15.5 Flow Import Mutasi

1. Tab "Capture" → sub-tab "Import"
2. Upload file CSV/Excel
3. Edge Function parsing + deteksi duplikat
4. Tabel preview muncul; duplikat ditandai
5. User pilih wallet tujuan + transaksi yang diimpor
6. Klik "Konfirmasi" → batch insert → saldo wallet ter-update

---

## 16. Risiko Produk dan Mitigasi *(Updated from v3 — tambah risiko stack baru)*

| Risiko | Dampak | Mitigasi |
|---|---|---|
| AI auto-save tanpa confidence threshold | 🔴 Tinggi | Confidence threshold ≥ 0.85, review card di bawah threshold |
| AI salah ekstrak transaksi | 🔴 Tinggi | Review UI, highlight field confidence rendah, validasi frontend |
| Tidak patuh UU PDP Indonesia | 🔴 Tinggi | Privacy Policy + endpoint hapus data + consent dialog |
| **Edge Function timeout (150 detik) jika AI lambat** *(New in v1.0)* | 🟡 Sedang | Set `max_tokens` Anthropic secukupnya; monitor p95 latency |
| **Whisper akurasi rendah untuk dialek/noise** *(New in v1.0)* | 🟡 Sedang | Tampilkan transkripsi sebelum konfirmasi; opsi edit |
| **Biaya Anthropic API tidak terkontrol** *(New in v1.0)* | 🔴 Tinggi | Rate limiting per user di Edge Function; alert dashboard Anthropic |
| **File audio tidak terhapus → Storage penuh** *(New in v1.0)* | 🟡 Sedang | DELETE di `finally` block Edge Function, bukan hanya di `try` |
| **Supabase free tier project paused (1 minggu inactive)** *(New in v1.0)* | 🟡 Sedang | Reminder akses project minimal 1x/minggu saat development |
| **Solo developer bottleneck di Fase 2+** *(New in v1.0)* | 🟡 Sedang | Selesaikan satu fitur sampai DoD sebelum pindah |
| Format file bank berubah | 🔴 Tinggi | Parser per sumber, maintenance berkala, fallback manual mapping |
| Premium enforcement tidak konsisten | 🟡 Sedang | Server-side check di Edge Function, bukan client-side |
| OCR tidak akurat foto buram | 🟡 Sedang | Manual review sebelum simpan; upgrade ke Sonnet di premium |

---

## 17. Roadmap Berikutnya *(Updated from v3 — total ganti)*

### Fase 0 — Setup *(Minggu 1–2)*

- Buat Supabase project, setup semua tabel + RLS policies
- Setup Supabase Auth (email + Google OAuth)
- Setup Expo project + Expo Router + NativeWind
- Test koneksi Expo ↔ Supabase (Auth + DB + Realtime)
- Setup Vercel untuk Expo Web

### Fase 1 — AI Core *(Minggu 3–5)*

- Edge Function `process-text`: text → Claude Haiku → ekstrak JSON → UPDATE row
- Validasi async flow + Supabase Realtime di Expo
- Edge Function `process-image`: foto struk → Claude Vision → ekstrak
- Edge Function `process-voice`: audio → Whisper → Claude → ekstrak
- Unit test tiap Edge Function via Supabase CLI

### Fase 2 — Mobile MVP *(Minggu 6–9)*

- Screen Auth (login/register/Google OAuth)
- Screen Dashboard (ringkasan bulan, shortcut 4 mode input)
- Screen Capture (4 tab: Teks / Foto / Rekam / Import)
- Screen Transaction List (filter kategori + tanggal)
- Screen Settings (plan info, upgrade CTA, logout)
- Internal testing: TestFlight + Play Store Internal Testing

### Fase 3 — Fitur Advanced *(Minggu 10–14)*

- Wallet management (CRUD + saldo otomatis)
- Budget bulanan per kategori
- Bill reminder dengan recurrence
- Import mutasi CSV/Excel via Edge Function
- Laporan bulanan + breakdown kategori + chart

### Fase 4 — Monetisasi *(Minggu 15–18)*

- Midtrans integration (subscription bulanan)
- Freemium gating di Edge Function (server-side)
- Export PDF/Excel (premium)
- AI Financial Insight pakai claude-sonnet-4 (anomali, saran hemat)
- Public launch Play Store + App Store

### Fase 5 — Scale *(setelah launch)*

- Group finance (shared wallet, split bill)
- Anomaly detection + Financial Health Score
- Push notification (Expo Push + Supabase webhook)
- Analytics (PostHog atau custom event tracking)

---

## 18. Definisi Selesai (Definition of Done)

### 18.1 Sebuah Modul Selesai untuk MVP bila:

- Edge Function aktif dan mengembalikan response benar
- UI Expo (mobile + PWA) dapat menjalankan flow utama tanpa blocker
- Data tersimpan ke Supabase sesuai user terautentikasi (**RLS aktif**)
- Semua acceptance criteria di Bab 7 telah diverifikasi
- Error state dan empty state sesuai Bab 14
- Tidak ada auto-save / aksi destruktif tanpa konfirmasi
- Async flow terverifikasi: Realtime mengupdate UI dalam < 1 detik setelah Edge Function selesai
- Unit test minimal happy path sudah ada

### 18.2 Sebuah Modul Belum Selesai bila:

- Hanya UI mock tanpa koneksi backend nyata
- Hanya schema database tanpa flow pengguna
- Edge Function placeholder return hardcoded response
- AI tanpa confidence threshold — semua input auto-save
- File audio voice tidak ter-delete setelah processing
- Error state tampilkan raw error dari server
- Enforcement premium di client-side saja, bukan Edge Function
- RLS belum aktif di salah satu tabel user data

### 18.3 Keputusan Produk yang Tidak Boleh Diubah Tanpa Diskusi

- Produk **mobile-first** — PWA adalah bonus channel dari codebase yang sama *(Updated from v3)*
- Stack **Expo + Supabase Cloud** — tidak ada VPS, tidak ada FastAPI *(New in v1.0)*
- Semua AI processing **async via Edge Functions + Realtime** *(New in v1.0)*
- AI menggunakan **confidence-based saving** — opsi "Batalkan" 5 detik setelah auto-save
- **Supabase RLS aktif** di semua tabel user data
- Premium enforcement **server-side di Edge Function**, bukan client-side
- File audio voice **wajib auto-delete** setelah processing *(New in v1.0)*

---

## 19. Penutup

PRD Kaswise v1.0 merepresentasikan reset total stack dari Catat.in v3 ke arsitektur yang lebih ramping: Expo + Supabase Cloud, dengan AI processing async dan mode input baru (voice). Fokus utamanya bukan *"fitur apa yang menarik"*, melainkan *"fitur mana yang harus dibangun dulu, dengan stack apa, dan bagaimana mengukurnya"*.

Mobile-first bukan slogan — Rafi (mahasiswa, 21, Bandung) adalah pengguna nomor satu. Setiap keputusan UX harus dimulai dari pertanyaan: *"Apakah ini work dalam ≤ 3 tap di smartphone Rafi?"* Jika tidak, redesain.

> 📌 **Aturan Update:** Dokumen ini harus diperbarui setiap kali ada perubahan signifikan pada scope mobile/PWA/backend, model data inti, tabel free/premium, acceptance criteria modul, atau roadmap fase. Dokumen yang tidak diperbarui akan menyesatkan pengembangan.
