# AI Continuation Handoff — Web Landing Preview — 2026-06-01

## Ringkasan

Phase Web-2 untuk `apps/web` sudah dijalankan dan dipreview sementara di:

```text
https://www.kaswise.com
```

Landing page dibuat sederhana sebagai public marketing/landing candidate, sementara PWA utama tetap di:

```text
https://kaswise.com
```

User kemudian meminta agar landing page untuk sementara dibuat sederhana dulu dan fokus berikutnya kembali ke `apps/mobile`.

## Status saat ini

### Live / preview routing

```text
kaswise.com      = PWA mobile live, jangan diganggu
www.kaswise.com  = temporary web landing preview via Nginx Proxy Manager → Vite preview
```

Preview Vite berjalan di server pada port:

```text
4173
```

Nginx Proxy Manager temporary config dibuat manual di:

```text
/home/Danu88/nginx-proxy-manager/data/nginx/proxy_host/4.conf
```

`proxy_host/3.conf` sebelumnya melayani `kaswise.com` dan `www.kaswise.com`; untuk preview, `www.kaswise.com` dipisahkan sementara ke `4.conf`. Backup awal dibuat di folder seperti:

```text
/home/Danu88/nginx-proxy-manager/data/nginx/proxy_host/backup-preview-20260531173649/3.conf
```

Catatan: NPM UI/database belum menjadi sumber kebenaran untuk temporary preview ini. Jika NPM regenerate config, cek ulang `www.kaswise.com`.

## Perubahan web yang sudah dibuat

### Landing MVP

File utama:

```text
apps/web/src/pages/LandingPage.tsx
apps/web/src/index.css
apps/web/src/main.tsx
apps/web/src/App.test.tsx
apps/web/vite.config.ts
apps/web/public/brand/logo-kaswise-mark.svg
```

Landing page saat ini:

- sederhana dan static,
- tidak membutuhkan Firebase/auth config untuk render publik,
- memakai design direction Kaswise mobile: matte black, emerald action, rounded card, 44px touch target,
- memakai copy Indonesia konkret, bukan generic AI SaaS,
- memakai logo mark existing dari:

```text
Kaswise Design System/assets/logo-kaswise-mark.svg
```

### Routing

`apps/web/src/main.tsx`:

- `/` lazy-load `LandingPage`,
- `/*` lazy-load legacy web app di `apps/web/src/legacy/LegacyApp.tsx`,
- loading shell menggunakan logo SVG.

### Preview host

`apps/web/vite.config.ts` mengizinkan preview host:

```text
www.kaswise.com
preview.kaswise.com
```

## Validasi terakhir

Validasi yang sudah pass setelah perubahan landing responsiveness/logo:

```bash
git diff --check
corepack pnpm --filter web type-check
corepack pnpm --filter web test
corepack pnpm --filter web build
corepack pnpm --filter mobile type-check
```

Hasil:

```text
web type-check ✅
web test ✅ 3 files, 9 tests
web build ✅
mobile type-check ✅
www.kaswise.com HTTP 200 ✅
/brand/logo-kaswise-mark.svg HTTP 200 ✅
```

## Commit terkait web landing

```text
4fa9b07 docs(web): add landing phase 1 audit
b6a1d94 feat(web): add Kaswise landing MVP
d61d9d9 chore(web): allow landing preview hosts
938ac01 feat(web): polish landing with mobile design system
3438783 fix(web): improve landing responsiveness and logo
```

## Catatan desain / keputusan

- Landing untuk sementara cukup sederhana; jangan overbuild marketing site dulu.
- Hindari generic SaaS/AI copy, fake metrics, dan klaim fitur yang belum live.
- `kaswise.com` tetap prioritas sebagai PWA mobile live.
- `www.kaswise.com` boleh dipakai sebagai landing candidate/preview, tapi jangan mengubah routing `kaswise.com` tanpa persetujuan eksplisit.

## Rollback preview `www.kaswise.com`

Jika ingin mengembalikan `www.kaswise.com` ke PWA lama:

1. Stop Vite preview jika tidak dipakai:

```bash
kill $(cat /tmp/kaswise_web_preview.pid)
```

2. Restore NPM config manual:

- hapus/disable:

```text
/home/Danu88/nginx-proxy-manager/data/nginx/proxy_host/4.conf
```

- kembalikan `server_name` di `3.conf` agar berisi:

```nginx
server_name kaswise.com www.kaswise.com;
```

3. Test dan reload Nginx:

```bash
docker exec nginx-proxy-manager nginx -t
docker exec nginx-proxy-manager nginx -s reload
```

4. Verifikasi:

```bash
curl -I https://www.kaswise.com/
curl -I https://kaswise.com/
```

## Fokus berikutnya: kembali ke apps/mobile

User meminta lanjut build `apps/mobile`. Status mobile terakhir sebelum kembali ke fase ini:

- PWA live di `https://kaswise.com` sudah go-live signed off.
- Auth/PWA login, Google OAuth standalone redirect, profile/avatar, budgets, AI category matching, category color sync, smoke test, dan hardening phase 1/2 light sudah selesai.
- Placeholder Import/Foto/Suara tetap sebaiknya tidak dimunculkan untuk first go-live.
- Jangan disrupt live PWA; validasi sebelum deploy.

Rekomendasi awal untuk mobile berikutnya:

1. Tentukan prioritas mobile berikutnya secara eksplisit: polish UX, bugfix QA, onboarding, reports, budget, transaction capture, atau settings.
2. Jalankan audit kecil terhadap target screen sebelum edit.
3. Validasi minimal:

```bash
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runInBand
corepack pnpm --filter mobile export:pwa
```

4. Deploy PWA hanya setelah perubahan mobile jelas dan teruji:

```bash
corepack pnpm --filter mobile deploy:pwa
```

## Perintah monitoring yang relevan

```bash
curl -fsS https://api.kaswise.com/health
curl -I https://kaswise.com/
curl -I https://www.kaswise.com/
docker logs kaswise-backend --tail 100
tail -n 100 /home/Danu88/nginx-proxy-manager/data/logs/proxy-host-3_error.log
tail -n 100 /home/Danu88/nginx-proxy-manager/data/logs/proxy-host-4_error.log
```
