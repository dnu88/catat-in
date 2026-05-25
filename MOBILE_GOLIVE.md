# Kaswise Mobile — Panduan Go Live

**Last updated:** 2026-05-25
**Stack:** Expo SDK 54, React Native 0.74, Expo Router, Supabase Auth + DB
**Build system:** EAS Build (Expo Application Services)

---

## Ringkasan

Mobile app Kaswise adalah Expo managed workflow (tidak ada folder `android/` atau `ios/`). Build dilakukan via **EAS Build** di cloud Expo, bukan di mesin lokal. Tidak butuh Mac untuk build iOS.

**Backend tidak dibutuhkan** untuk fitur yang ada — semua CRUD langsung ke Supabase.

---

## Prasyarat

### 1. Akun & tools
- [ ] Akun **Expo** (`expo.dev`) — gratis, untuk EAS Build
- [ ] **Node.js ≥ 18** dan **pnpm** terinstall di mesin dev
- [ ] EAS CLI: `npm install -g eas-cli`
- [ ] Login: `eas login`

### 2. Google Play Console (Android)
- [ ] Akun Google Play Console (biaya pendaftaran $25 sekali)
- [ ] Buat app baru dengan package `com.kaswise.app`

### 3. Apple Developer Program (iOS — opsional)
- [ ] Akun Apple Developer ($99/tahun)
- [ ] Buat App ID `com.kaswise.app`

> Jika hanya mau Android dulu, iOS bisa dikerjakan belakangan.

---

## Langkah Go Live Android

### Step 1 — Setup EAS project
```bash
cd /path/to/catat-in/apps/mobile

# Login ke Expo
eas login

# Inisialisasi EAS project (sekali saja)
eas init

# Pastikan app.json sudah benar:
# - "slug": "kaswise"
# - "android.package": "com.kaswise.app"
# - "version": "1.0.0"
```

### Step 2 — Set environment variables di EAS
```bash
# Set Supabase secrets di EAS (agar tidak hardcode di kode)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://xqvtsgfakuehjwdmenuw.supabase.co"

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> ⚠️ Nilai SUPABASE_ANON_KEY ada di `/home/Danu88/catat-in/apps/mobile/.env`

### Step 3 — Build APK preview (test dulu)
```bash
cd apps/mobile

# Build APK untuk test internal (tidak perlu Play Console)
eas build --platform android --profile preview
```
- Proses ~10-20 menit di cloud EAS
- Setelah selesai, download APK dari `expo.dev/builds` dan install di HP untuk test

### Step 4 — Test APK
Verifikasi di HP:
- [ ] Login / Register berhasil (Supabase Auth)
- [ ] Tambah transaksi berhasil
- [ ] Data muncul di dashboard
- [ ] Logout berhasil

### Step 5 — Build production (AAB untuk Play Store)
```bash
# Build AAB (Android App Bundle) untuk Play Store
eas build --platform android --profile production
```
- Output: file `.aab` — download dari `expo.dev/builds`

### Step 6 — Submit ke Play Store
```bash
# Submit otomatis via EAS (butuh Google Play service account key)
eas submit --platform android

# Atau manual: upload .aab di Google Play Console
# → Production → Create new release → Upload AAB
```

---

## Langkah Go Live iOS (opsional, butuh Mac/Apple Developer)

```bash
# Build IPA untuk App Store
eas build --platform ios --profile production

# Submit ke App Store Connect
eas submit --platform ios
```

---

## Konfigurasi Supabase untuk Production

### Auth redirect URL
Di Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://kaswise.com`
- **Redirect URLs:** tambahkan `kaswise://` (deep link scheme dari `app.json`)

### Aktifkan Google OAuth (opsional)
Di Supabase Dashboard → Authentication → Providers → Google:
- Masukkan `Client ID` dan `Client Secret` dari Google Cloud Console
- Tambahkan authorized redirect: `https://xqvtsgfakuehjwdmenuw.supabase.co/auth/v1/callback`

---

## Checklist Sebelum Submit ke Store

- [ ] Icon app sudah ada (`assets/icon.png` — 1024x1024)
- [ ] Splash screen sudah ada (`assets/splash.png`)
- [ ] `app.json` version dan buildNumber sudah diisi
- [ ] Privacy policy URL tersedia (Play Store wajib)
- [ ] Screenshot app sudah disiapkan (minimal 2 screenshot per ukuran layar)
- [ ] Deskripsi app sudah ditulis
- [ ] Rating konten sudah diisi di Play Console

---

## File Konfigurasi Penting

| File | Fungsi |
|---|---|
| `apps/mobile/app.json` | Konfigurasi Expo (nama, package, version) |
| `apps/mobile/eas.json` | Profil build EAS (dev/preview/production) |
| `apps/mobile/.env` | Env lokal (Supabase keys) — jangan commit |
| `apps/mobile/src/lib/supabase.ts` | Inisialisasi Supabase client |

---

## Troubleshooting

### Build gagal "missing SUPABASE_URL"
→ Pastikan `eas secret:create` sudah dijalankan, atau `.env` sudah ada di folder mobile.

### Login Supabase gagal di app
→ Cek redirect URL di Supabase Dashboard sudah include `kaswise://`

### APK install gagal di HP
→ Aktifkan "Install dari sumber tidak dikenal" di pengaturan HP untuk test APK preview.

### EAS Build lambat / antri
→ Akun Expo gratis punya antrian lebih panjang. Upgrade ke EAS Pro ($29/bulan) untuk priority build, atau tunggu.
