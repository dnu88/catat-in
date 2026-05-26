# AI Continuation Handoff — Mobile Auth, PWA, dan CRUD Stabilization

**Tanggal:** 2026-05-27  
**Scope:** `apps/mobile` Expo Android/iOS/Web PWA, Supabase Auth, Supabase CRUD, deploy PWA `kaswise.com`  
**Branch:** `main`

## Ringkasan perubahan terakhir

Perubahan terakhir berfokus pada membuat mobile/PWA bisa dipakai untuk login Google, reset password, dan CRUD dasar setelah deploy ke `kaswise.com`.

Sudah dilakukan:

1. **Google Auth mobile/PWA**
   - Supabase Auth dibuat PKCE.
   - Login Google ditambahkan di screen login mobile.
   - Callback OAuth ditambahkan.
   - PWA `kaswise.com` sudah rebuild dan redeploy beberapa kali.

2. **Forgot/reset password**
   - Route reset password ditambahkan.
   - Recovery link Supabase diproses di app.
   - Reset password diperketat agar tidak menerima session biasa tanpa recovery token/code.

3. **CRUD Supabase production hotfix**
   - Production Supabase sempat drift dari schema repo.
   - Hotfix sudah diterapkan untuk kompatibilitas tabel `budgets`, `bill_reminders`, dan `transactions`.
   - Migration compatibility sudah dibuat lebih defensive agar lebih aman untuk fresh schema.

4. **PWA deployment**
   - Script repeatable ditambahkan:
     - `corepack pnpm --filter mobile export:pwa`
     - `corepack pnpm --filter mobile deploy:pwa`
   - Deploy script menjaga manual Supabase env injection di HTML PWA server.

5. **Hapus transaksi di PWA**
   - `Alert.alert()` tidak reliable di web/PWA.
   - Untuk `Platform.OS === 'web'`, delete transaksi sekarang memakai `window.confirm`.
   - PWA sudah dideploy ulang.

## Commit penting terakhir

- `8c141c0 feat(mobile): add Google auth and password reset flow`
- `5c413bf fix(db): align mobile PWA CRUD schema`
- `3dc7118 fix(db): allow mobile transaction draft inserts`
- `d9b187f fix(mobile): address audit readiness issues`
- `9bf121b fix(mobile): support transaction delete on PWA`

## Validasi yang sudah dilakukan

Di `apps/mobile`:

```bash
npm run type-check
npm test -- --runInBand
npm test -- --runInBand __tests__/transactions-swipe-actions.test.tsx
```

Status terakhir yang diketahui:

- Type-check: **passed**
- Full Jest mobile: **passed** setelah fix fixture dashboard
- Focused delete transaction test: **passed**
- PWA export/deploy script: **berhasil dijalankan**
- `kaswise.com` live bundle terakhir setelah delete fix:
  - `/_expo/static/js/web/entry-b024dafecc2e477b882f395a3eb2c547.js`

## Fitur/area yang belum stabil

> Bagian ini sengaja eksplisit agar penerus tidak menganggap app sudah production-stable sepenuhnya.

### 1. Google Auth belum tervalidasi end-to-end di semua platform

Status:
- Google login sudah berhasil di `kaswise.com` menurut user.
- Mobile native production build belum berhasil dibuat karena EAS belum login di environment ini.

Risiko:
- Redirect URL Android/iOS native (`kaswise://callback`) perlu dites di dev build/APK, bukan hanya PWA.
- Supabase Dashboard dan Google Cloud Console config menjadi dependency eksternal.

Checklist lanjut:
- Test Google login di Android dev build.
- Test Google login di installed PWA fresh session.
- Pastikan Supabase Dashboard allowlist berisi:
  - `https://kaswise.com/callback`
  - `https://kaswise.com/reset-password`
  - `kaswise://callback`
  - `kaswise://reset-password`
- Pastikan Google Cloud OAuth redirect URI Supabase benar:
  - `https://xqvtsgfakuehjwdmenuw.supabase.co/auth/v1/callback`

### 2. Reset password perlu QA manual ulang

Status:
- Route reset sudah ada.
- Fallback session biasa sudah dihapus.

Risiko:
- Supabase recovery link bisa datang dalam format `code`, hash token, atau token pair tergantung config/email template.
- Flow belum terbukti di Android native dan PWA setelah strict recovery change.

Checklist lanjut:
- Request reset dari `kaswise.com/forgot-password`.
- Klik link email di browser yang sama dan browser berbeda.
- Test expired/used link menampilkan pesan ramah.
- Test native deep link dari email ke app build.

### 3. CRUD masih rawan karena schema production pernah drift

Status:
- Hotfix sudah diterapkan langsung ke remote Supabase.
- Migration sudah dicatat dan dibuat lebih defensive.

Risiko:
- Ada indikasi production schema sebelumnya tidak sama dengan migration repo.
- Mungkin masih ada kolom/constraint/policy lama yang belum terdeteksi di menu lain.
- CRUD yang sudah disentuh: transaksi, budget, bill reminders. Menu lain tetap perlu QA.

Area yang wajib dites manual:
- Wallets: create, edit, soft delete.
- Transactions: create manual, create via AI text, edit, delete.
- Budgets: create, edit, soft delete.
- Bills: create, edit, delete/mark paid.
- Categories/budget envelopes jika digunakan.
- Household/family context jika user punya membership.

Jika error CRUD muncul:
1. Buka browser devtools Network.
2. Catat endpoint Supabase, status code, dan body error.
3. Cek Supabase Logs.
4. Bandingkan kolom payload dengan remote schema.

### 4. Delete transaksi di PWA baru hotfix, belum UX-final

Status:
- Web/PWA sekarang memakai `window.confirm`.
- Native tetap memakai `Alert.alert`.

Risiko:
- UX `window.confirm` bawaan browser kurang sesuai desain Kaswise.
- Swipe action di web bisa terasa kurang natural tergantung pointer/touch device.

Rekomendasi lanjut:
- Ganti confirm browser dengan modal custom lintas platform.
- Tambahkan loading/disabled state saat delete sedang berjalan.
- Tambahkan optimistic update atau toast sukses/gagal.

### 5. PWA deploy masih semi-manual dan tergantung server lokal

Status:
- Script deploy sudah ada:
  - `apps/mobile/scripts/deploy-pwa.mjs`
- Target default:
  - `/home/Danu88/nginx-proxy-manager/placeholder`

Risiko:
- Deploy hanya akan berhasil di server yang punya path tersebut.
- Script masih bergantung pada HTML injection yang sudah ada di target lama.
- Root `package.json` masih build `apps/web`, bukan `apps/mobile` PWA.

Rekomendasi lanjut:
- Buat script root khusus mobile PWA, misalnya:
  - `build:mobile-pwa`
  - `deploy:mobile-pwa`
- Simpan template injection env secara eksplisit, bukan mengambil dari target index lama.
- Pertimbangkan pindah ke Vercel/CI agar deploy lebih repeatable.

### 6. PWA belum benar-benar installable/offline-stable

Status:
- Expo web export menghasilkan `index.html`, `_expo`, `assets`, `metadata.json`, favicon.
- Tidak ditemukan service worker/offline strategy yang matang.

Risiko:
- Disebut PWA, tapi installability/offline behavior belum diaudit Lighthouse.
- Cache browser bisa membuat user melihat bundle lama.

Checklist lanjut:
- Jalankan Lighthouse PWA audit.
- Tambahkan/validasi manifest final.
- Tentukan strategi cache dan update notification.

### 7. Edge Function `process-text` belum diaudit setelah schema hotfix

Status:
- Insert draft transaksi dari Capture sudah diperbaiki dari sisi schema lama.
- Tetapi proses AI text bergantung pada Supabase Edge Function `process-text`.

Risiko:
- Jika Edge Function masih menulis kolom lama/baru yang tidak sinkron, transaksi bisa stuck `processing` atau gagal.

Checklist lanjut:
- Test Capture AI text di `kaswise.com`.
- Cek row `transactions.status` berubah dari `processing` ke `done`.
- Cek Supabase Edge Function logs untuk `process-text`.

### 8. EAS production build Android belum jalan

Status:
- EAS config ada.
- Environment ini belum login EAS.

Blocker:
```text
npx eas-cli whoami -> Not logged in
```

Perintah lanjut:

```bash
cd /home/Danu88/catat-in/apps/mobile
npx eas-cli login
npx eas-cli build --platform android --profile production --non-interactive
```

### 9. Test warnings masih banyak

Status:
- Tests passed, tapi log Jest masih berisi warning `Animated(View) inside a test was not wrapped in act(...)`.

Risiko:
- Warning bisa menutupi error penting di CI log.

Rekomendasi lanjut:
- Mock/disable entrance animation untuk Jest.
- Atau wrap helper render/animation dengan act-aware utilities.

## Cara deploy PWA saat ini

```bash
cd /home/Danu88/catat-in
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa
```

Untuk target custom:

```bash
KASWISE_PWA_TARGET=/path/to/static/root corepack pnpm --filter mobile deploy:pwa
```

Setelah deploy:

```bash
curl -I https://kaswise.com
```

Lalu hard refresh browser atau clear site data jika bundle lama masih muncul.

## Rekomendasi prioritas berikutnya

1. **Manual QA semua CRUD di `kaswise.com`** dengan user Google baru dan user lama.
2. **Audit remote Supabase schema vs migrations** sampai tidak ada drift.
3. **Test reset password end-to-end** setelah strict recovery change.
4. **Buat custom modal confirm delete** untuk PWA/native supaya UX konsisten.
5. **Setup EAS login/build** untuk Android production.
6. **Jalankan Lighthouse PWA audit** dan perbaiki installability/offline.
7. **Kurangi Jest animation warnings** agar CI log bersih.

## Catatan penting untuk penerus

- Jangan menganggap `apps/web` sebagai PWA utama Kaswise saat ini. `kaswise.com` sedang serve hasil Expo web dari `apps/mobile`.
- Jangan hapus manual Supabase env injection di `/home/Danu88/nginx-proxy-manager/placeholder/index.html` tanpa menggantinya dengan mekanisme env yang jelas.
- Jika melakukan migration baru, test terhadap schema fresh dan remote drifted schema.
- Jika CRUD gagal, kemungkinan besar penyebabnya salah satu dari:
  1. RLS policy,
  2. FK ke `profiles`,
  3. kolom production drift,
  4. trigger wallet/budget/envelope,
  5. Edge Function payload tidak sinkron.
