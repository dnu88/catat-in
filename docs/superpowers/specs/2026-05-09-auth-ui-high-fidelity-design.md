# Kaswise Web — High-Fidelity Auth UI Redesign (Legacy Web)

Tanggal: 2026-05-09  
Scope: `apps/web` (Login, Register, Forgot Password, Reset Password)  
Status: Approved (conversation) — ready for implementation planning

## 1) Tujuan

Meningkatkan kualitas visual UI Auth agar lebih menarik dan mendekati mockup, dengan hasil yang konsisten di desktop + mobile, serta tetap mengikuti theme system (light/dark existing).

## 2) Scope

### In scope
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- Shared UI layer untuk seluruh halaman auth

### Out of scope
- Perubahan logika bisnis auth/store
- Perubahan route behavior
- Perubahan stack (tetap React + Vite legacy web)

## 3) Pendekatan yang dipilih

Dipilih **Approach #2: Shared Auth System**:
- Buat shared layout + shared stylesheet untuk auth
- Tiap halaman fokus pada form logic masing-masing
- Hilangkan inline style besar yang duplikatif

Alasan:
- Konsistensi visual antar halaman
- Maintainability jangka panjang
- High fidelity lebih mudah dijaga

## 4) Arsitektur UI

## Komponen baru
- `apps/web/src/components/auth/AuthShell.tsx`
  - Layout 2 panel (brand panel + form panel)
  - Responsif desktop/mobile
  - Menjadi wrapper standar semua halaman auth
- `apps/web/src/components/auth/auth-shell.css`
  - Semua gaya visual auth dipusatkan
  - Theme-aware via CSS variables existing (`--bg-*`, `--text-*`, `--accent`, dll)
- (Opsional ringan) `AuthCard`/subcomponent kecil untuk heading dan body form konsisten

## Halaman yang dimigrasi
- `LoginPage.tsx`
- `RegisterPage.tsx`
- `ForgotPasswordPage.tsx`
- `ResetPasswordPage.tsx`

## 5) Visual Direction

- Split layout desktop: panel brand kiri + form kanan
- Mobile: brand ringkas di atas, form tetap fokus
- Card form modern: radius, border, shadow, spacing ditingkatkan
- Tipografi: hierarchy jelas (title/subtitle/label/helper)
- Interaksi: focus state input premium, button state konsisten
- Light/dark: mengikuti mode aplikasi saat ini (A: follow existing theme)

## 6) Data Flow & Error Handling

- Tidak mengubah alur auth existing
- Error/success/loading tetap dari store/logic saat ini
- Notifikasi state (error/success) diseragamkan secara visual pada seluruh halaman auth
- Copy tetap bilingual mengikuti `useI18nStore().language`

## 7) Responsiveness & Accessibility

- Desktop >= 1024: split layout proporsional
- Tablet/mobile: single-column dengan visual brand dipadatkan
- Target aksesibilitas baseline:
  - Label terhubung ke input
  - Focus terlihat jelas
  - Kontras teks/komponen dijaga terhadap theme
  - CTA utama mudah dijangkau pada mobile

## 8) Rencana Implementasi Teknis (ringkas)

1. Buat shared auth component + css
2. Refactor `LoginPage` ke shared shell
3. Refactor `RegisterPage` ke shared shell
4. Refactor `ForgotPasswordPage` ke shared shell
5. Refactor `ResetPasswordPage` ke shared shell
6. Rapikan duplikasi class/style inline
7. Verifikasi build + smoke check visual semua halaman

## 9) Verifikasi

- Build web berhasil
- Smoke test 4 halaman auth:
  - Desktop: light + dark
  - Mobile viewport: light + dark
- Validasi state:
  - idle, loading, error, success
- Validasi navigasi antar halaman auth

## 10) Risiko & Mitigasi

- Risiko: visual regression pada halaman auth lama  
  Mitigasi: refactor bertahap per page + cek manual per route

- Risiko: style bentrok dengan global css  
  Mitigasi: namespace class auth (`auth-*`) dan konsolidasi style ke file khusus

- Risiko: dark mode tidak konsisten  
  Mitigasi: hanya pakai token/variables existing, hindari hardcoded warna utama

## 11) Kriteria Sukses

- Tampilan auth terasa modern dan mendekati mockup
- Konsistensi visual antar Login/Register/Forgot/Reset
- UX tidak regress (flow auth tetap berjalan)
- Tampilan tetap bagus di desktop + mobile, light + dark
