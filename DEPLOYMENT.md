# Public Deployment Guide

Panduan ini mengikuti opsi biaya minimum yang kita pilih:

- `Vercel Hobby` untuk frontend web
- `Render Free` untuk backend FastAPI
- `Supabase Free` untuk database, auth, dan storage

Arsitektur ini cocok untuk:

- MVP public
- demo
- early user testing
- soft launch dengan biaya serendah mungkin

Catatan penting:

- backend Render Free bisa sleep saat idle
- request pertama setelah idle bisa lambat karena cold start
- jadi setup ini murah, tetapi belum sehalus deployment berbayar

## Yang Sudah Siap di Repo

Konfigurasi repo yang sudah disiapkan:

- `backend/Dockerfile` sudah mengikuti `PORT` dari platform hosting
- `backend/app/core/config.py` sudah mendukung `ALLOWED_ORIGINS` dan `ALLOWED_HOSTS`
- endpoint AI sekarang fail-safe jika `ANTHROPIC_API_KEY` belum diisi
- `apps/web/vercel.json` sudah menambahkan SPA rewrite agar route frontend tidak 404

## 1. Siapkan Supabase Cloud

1. Pastikan project Supabase cloud yang akan dipakai sudah benar.
2. Dari folder `backend`, jalankan migration:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

3. Verifikasi minimal kolom penting sudah ada:
- `wallets.currency`
- `bill_reminders.payment_history`
- `categories.is_default`

## 2. Konfigurasi Auth Supabase

Di Supabase Dashboard:

1. Buka `Authentication -> URL Configuration`
2. Isi `Site URL` dengan domain frontend production, misalnya:

```text
https://your-app.vercel.app
```

3. Tambahkan `Redirect URLs` berikut:

```text
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/reset-password
```

Jika nanti memakai domain custom, tambahkan juga URL domain custom tersebut.

## 3. Deploy Backend ke Render Free

1. Push repo ini ke GitHub jika belum.
2. Login ke Render dan buat `Web Service` baru dari repo GitHub.
3. Set `Root Directory` ke:

```text
backend
```

4. Anda bisa deploy memakai Dockerfile yang sudah ada di repo ini.

5. Isi environment variables minimal berikut di Render:

```text
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=replace-with-a-long-random-secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
ALLOWED_ORIGINS=https://your-app.vercel.app
ALLOWED_HOSTS=your-backend-service.onrender.com
```

Opsional tetapi disarankan:

```text
ANTHROPIC_API_KEY=sk-ant-api03-xxxx
ANTHROPIC_MODEL=claude-sonnet-4-6
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
UVICORN_WORKERS=2
```

6. Setelah deploy selesai, cek health endpoint:

```text
https://your-backend-service.onrender.com/health
```

Harus mengembalikan `status: ok`.

## 4. Deploy Frontend ke Vercel Hobby

1. Import repo yang sama ke Vercel.
2. Set `Root Directory` ke:

```text
apps/web
```

3. Isi environment variables frontend berikut:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_API_BASE_URL=https://your-backend-service.onrender.com/api/v1
VITE_MIDTRANS_CLIENT_KEY=
```

4. Deploy frontend.
5. `apps/web/vercel.json` sudah memastikan route SPA seperti `/login`, `/dashboard`, `/transactions`, dan `/reset-password` tetap bekerja.

## 5. Hubungkan Frontend, Backend, dan Supabase

Setelah URL frontend dan backend final sudah dapat:

1. update `ALLOWED_ORIGINS` di Render agar berisi domain Vercel final
2. update `ALLOWED_HOSTS` di Render agar berisi domain Render final
3. pastikan `VITE_API_BASE_URL` di Vercel menunjuk ke backend Render final
4. update `Site URL` dan `Redirect URLs` di Supabase Auth

## 6. Checklist Go-Live

Sebelum diumumkan ke user public, cek:

- `GET /health` backend production merespons normal
- signup user baru berhasil
- login email/password berhasil
- forgot password mengirim email reset
- reset password via link email berhasil
- create wallet berhasil
- create transaction berhasil
- create budget berhasil
- create bill dan pay bill berhasil
- create custom category berhasil
- AI chat dan OCR berjalan jika `ANTHROPIC_API_KEY` terisi
- route frontend langsung seperti `/login` dan `/transactions` tidak 404

## 7. Batasan Opsi Termurah

Hal yang perlu Anda antisipasi pada jalur `Vercel Hobby + Render Free + Supabase Free`:

- backend bisa cold start setelah idle
- performa awal request bisa terasa lambat
- cocok untuk MVP public, bukan pengalaman production premium
- jika user mulai aktif, upgrade pertama yang paling masuk akal biasanya backend dari `Render Free` ke plan berbayar

## 8. Hal yang Masih Perlu Anda Sediakan

Repo ini sekarang sudah siap untuk deployment public dengan biaya minimum, tetapi langkah berikut tetap membutuhkan akses akun Anda:

- membuat service Render di akun Anda
- membuat project Vercel di akun Anda
- mengisi secret production asli
- memverifikasi flow reset password lewat inbox production
- mengarahkan domain custom jika nanti dibutuhkan
