# AI Continuation Handoff — Mobile First-Use Guide & Google Auth — 2026-06-01

## Ringkasan

Fokus kembali ke `apps/mobile` setelah Phase Web-2 landing dihentikan sementara di versi sederhana. Sesi ini menyelesaikan polish first-use/onboarding untuk user baru, memperbaiki Google Auth web/PWA yang sempat gagal, dan deploy PWA live.

Live PWA:

```text
https://kaswise.com
```

Landing preview sementara tetap di:

```text
https://www.kaswise.com
```

## Commit terbaru terkait sesi ini

```text
f0a095f feat(mobile): polish first-use dashboard onboarding
9c8267c fix(mobile): use full redirect for web Google auth
6344795 feat(mobile): guide new users through first setup steps
```

Commit sebelumnya yang relevan:

```text
ee053cc docs: add web landing handoff
3438783 fix(web): improve landing responsiveness and logo
938ac01 feat(web): polish landing with mobile design system
d61d9d9 chore(web): allow landing preview hosts
```

## Status live terakhir

PWA mobile sudah deploy setelah first-use stepper:

```text
/_expo/static/js/web/entry-ba424caef66ea9837f5dcb43beb790e1.js
```

Google Auth web/PWA sudah dicoba user dan dikonfirmasi berhasil setelah fix:

```text
9c8267c fix(mobile): use full redirect for web Google auth
```

## Perubahan utama

### 1. First-use guide dashboard

File:

```text
apps/mobile/app/(tabs)/index.tsx
```

Dashboard sekarang menampilkan guided setup untuk akun baru / akun yang belum lengkap setup finansialnya.

Guide punya 4 langkah:

1. Buat dompet pertama
   - route: `/(tabs)/wallets`
   - CTA: `Buka Dompet`
2. Catat satu transaksi nyata
   - route: `/(tabs)/capture`
   - CTA: `Buka Catat`
3. Buat budget kategori
   - route: `/(tabs)/budgets`
   - CTA: `Buka Budget`
4. Cek laporan pertama
   - route: `/(tabs)/reports`
   - CTA: `Buka Laporan`

Guide memiliki tombol:

```text
Lanjut / Next
```

Pengguna bisa:

- tekan step tertentu,
- tekan `Lanjut`,
- tekan CTA utama untuk masuk ke menu terkait,
- melihat status selesai pada step yang sudah terpenuhi.

Step completion saat ini:

```text
wallet  = wallets.length > 0
capture = recentTransactions.length > 0
budget  = activeBudgetCount > 0
reports = recentTransactions.length > 0
```

Catatan: step `reports` saat ini dianggap selesai jika sudah ada transaksi, karena Reports baru bermakna setelah ada data transaksi. Jika ke depan ingin lebih presisi, bisa tambah persisted flag misalnya `first-use.reports-visited` via AsyncStorage setelah user membuka Reports.

### 2. Dashboard data readiness

Masih di:

```text
apps/mobile/app/(tabs)/index.tsx
```

Ditambahkan state:

```text
dashboardReady
activeBudgetCount
currentGuideStep
```

`dashboardReady` mencegah guide muncul sebelum data selesai load.

`activeBudgetCount` dihitung dari active envelopes:

```ts
const activeEnvelopes = envelopes.filter(
  (envelope) => getEnvelopeStatus(envelope) === "active",
)
```

Jika user tidak ditemukan / error, state dashboard dikosongkan dengan aman.

### 3. Budget envelope date fix

File:

```text
apps/mobile/src/services/budget-envelopes.ts
```

Saat mengerjakan onboarding, test budget sync gagal karena tanggal sudah masuk Juni sementara fixture transaksi Mei. Akar masalah: `syncEnvelopeAllocationForTransaction` memakai periode budget berdasarkan bulan berjalan, bukan tanggal transaksi.

Perubahan:

- `mapBudgetEnvelope(row, referenceDate)` sekarang menerima reference date.
- `listBudgetEnvelopes(..., referenceDate)` menerima optional reference date.
- `syncEnvelopeAllocationForTransaction` memanggil `listBudgetEnvelopes` dengan `dateFromDateKey(transactionDate)`.

Tujuan: allocation sync memilih periode budget sesuai tanggal transaksi, bukan tanggal hari ini.

### 4. Google Auth web/PWA fix

File:

```text
apps/mobile/app/(auth)/login.tsx
```

Masalah user:

```text
Login could not be completed
```

Kondisi ditemukan di access log:

```text
GET https://kaswise.com/callback?code=...
```

Root cause paling mungkin:

```text
PKCE code verifier hilang ketika Google OAuth dibuka via Expo WebBrowser/openAuthSessionAsync pada Chrome/PWA mobile.
```

Fix:

```ts
const shouldUseFullRedirect = Platform.OS === 'web'
```

Dengan ini Google OAuth di web/PWA memakai full-page redirect agar PKCE verifier tetap berada di konteks browser yang sama.

User sudah konfirmasi Google login berhasil setelah deploy fix.

## Validasi yang sudah dijalankan

Untuk first-use guide stepper:

```bash
git diff --check
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath src/services/budget-envelopes.test.ts
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa
```

Hasil:

```text
git diff --check ✅
mobile type-check ✅
budget-envelopes test ✅ 15 passed
export:pwa ✅
deploy:pwa ✅
```

Untuk Google Auth fix:

```bash
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath src/services/budget-envelopes.test.ts
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa
```

Hasil:

```text
mobile type-check ✅
budget-envelopes test ✅ 15 passed
export:pwa ✅
deploy:pwa ✅
user QA Google login ✅
```

## Known notes / caveats

1. First-use guide adalah dashboard card, bukan full-screen walkthrough overlay.
2. Guide belum punya persisted dismissal. Saat semua setup belum lengkap, guide akan tetap muncul.
3. Step `reports` belum tracking visit; completion pakai transaksi ada/tidak.
4. User belum QA stepper secara menyeluruh setelah deploy terakhir; perlu cek di akun baru/kosong.
5. `apps/web` landing tetap sederhana untuk sementara; jangan lanjut overbuild landing sebelum ada arahan baru.
6. `www.kaswise.com` masih temporary preview via manual NPM config. Detail ada di:

```text
docs/handoffs/AI_CONTINUATION_HANDOFF_WEB_LANDING_2026-06-01.md
```

## Rekomendasi next mobile work

### A. QA first-use guide end-to-end

Gunakan akun baru atau akun kosong dan cek:

1. login Google berhasil,
2. dashboard menampilkan guide,
3. step 1 `Buka Dompet` benar ke tab Dompet,
4. buat dompet pertama,
5. kembali dashboard → step dompet bertanda selesai,
6. `Lanjut` / step capture → `Buka Catat`,
7. catat transaksi pertama,
8. kembali dashboard → step capture selesai,
9. buka Budget dari guide dan buat budget kategori,
10. kembali dashboard → step budget selesai,
11. buka Laporan dari guide.

### B. Pertimbangkan persisted first-use state

Jika user ingin experience lebih halus:

- simpan guide progress/dismissal di AsyncStorage,
- track report visited,
- track budget visited/created per user,
- jangan tampilkan guide untuk user lama yang sudah punya setup cukup.

Suggested key shape:

```text
first-use-guide:v1:{userId}
```

Suggested fields:

```ts
{
  dismissed?: boolean
  reportsVisited?: boolean
  lastStep?: number
  updatedAt?: string
}
```

### C. Tambah tests untuk dashboard guide

Belum ada test khusus untuk dashboard guide. Jika lanjut, tambahkan test render untuk:

- no wallet → CTA `Buka Dompet`,
- wallet exists no tx → CTA `Buka Catat`,
- budget exists no report/tx edge,
- Next button changes active step.

## File penting untuk lanjutan

```text
apps/mobile/app/(tabs)/index.tsx
apps/mobile/app/(auth)/login.tsx
apps/mobile/src/services/budget-envelopes.ts
apps/mobile/src/services/budget-envelopes.test.ts
apps/mobile/src/lib/auth-redirects.ts
apps/mobile/src/lib/supabase.ts
docs/handoffs/AI_CONTINUATION_HANDOFF_WEB_LANDING_2026-06-01.md
```

## Commands useful berikutnya

```bash
git status --short
git log -8 --oneline
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath src/services/budget-envelopes.test.ts
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa
curl -fsS https://api.kaswise.com/health
curl -s https://kaswise.com/ | grep -o '/_expo/static/js/web/entry-[^"']*\.js' | head -1
```

## Do not forget

- Jangan ganggu `kaswise.com` live PWA tanpa validasi.
- Jangan expose secret di chat/commit.
- Jangan jalankan broad Supabase migration push tanpa review.
- Placeholder Foto/Suara/Import tetap sebaiknya tidak dimunculkan untuk first go-live.
