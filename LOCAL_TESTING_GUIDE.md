# Local Testing Guide — Kaswise v1.0

**Date**: 2026-05-06  
**Status**: Phase 0–1 code complete, ready for local validation

---

## Prerequisites

### Software Required
- Node.js 18+ & pnpm 8+
- Supabase CLI (`npm install -g supabase`)
- Expo CLI (optional, `npm install -g expo-cli`)
- Git (for Supabase CLI auth)

### API Keys Required
1. **Anthropic API key** (Claude Haiku) — untuk AI extraction
2. **OpenAI API key** (Whisper) — untuk voice transcription
3. **Supabase project** (local atau cloud) — untuk Auth + Postgres + Edge Functions

---

## Step 1: Setup Supabase Local

### Option A: Local Supabase (Recommended for Development)
```bash
# Install Supabase CLI jika belum
npm install -g supabase

# Login ke Supabase (butuh akun)
supabase login

# Start local Supabase stack
supabase start

# Output akan tampil:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - Inbucket URL: http://localhost:54324
# - JWT secret: super-secret-jwt-token
```

### Option B: Supabase Cloud (Production-like)
1. Buat project di [supabase.com](https://supabase.com)
2. Note project URL dan publishable/anon key dari Settings → API
3. Link project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

---

## Step 2: Apply Database Migrations

```bash
# Apply semua migrations (2 file)
supabase db reset

# Atau push incremental
supabase db push

# Verify tables created
supabase db dump --data-only | grep -E "(profiles|transactions|wallets)"
```

**Tables yang harus ada:**
- `profiles`, `wallets`, `transactions`, `categories`, `budgets`
- `bill_reminders`, `groups`, `group_members`, `monthly_summaries`, `usage_counters`
- Storage buckets: `receipts`, `voice-inputs`

---

## Step 3: Configure Environment Variables

### Mobile App (`apps/mobile/.env.local`)
```bash
# Copy template
cp .env.example apps/mobile/.env.local

# Edit apps/mobile/.env.local
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321  # atau URL cloud
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-or-sb_publishable_key>  # dari supabase start/dashboard; jangan commit nilai asli
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...  # opsional untuk client-side (jika perlu)
EXPO_PUBLIC_OPENAI_API_KEY=sk-...         # opsional untuk client-side
```

### Edge Functions Secrets
```bash
# Set secrets untuk Edge Functions (local)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...

# Verify
supabase secrets list
```

---

## Step 4: Deploy Edge Functions

```bash
# Deploy ke local Supabase
supabase functions deploy process-text
supabase functions deploy process-image
supabase functions deploy process-voice

# Verify functions deployed
supabase functions list
```

**Expected output:**
```
process-text
process-image
process-voice
```

---

## Step 5: Start Mobile App

```bash
# Dari root project
pnpm dev:mobile

# Atau langsung dari apps/mobile
cd apps/mobile
npx expo start

# Pilih platform:
# - w: web browser
# - a: Android emulator
# - i: iOS simulator
```

**URLs:**
- Expo dev server: `http://localhost:8081`
- Web PWA: `http://localhost:19006`

---

## Step 6: Test Flow End-to-End

### Test 1: Auth Flow
1. Buka app di browser/emulator
2. Navigasi ke Register screen
3. Buat akun dengan email/password
4. Verify redirect ke Dashboard (tabs)
5. Logout → Login kembali

### Test 2: Capture Mode Teks (AI Async)
1. Navigasi ke tab "Catat"
2. Pilih mode "Teks"
3. Input: `beli makan 35000 di warteg`
4. Klik "Proses AI"
5. **Expected behavior**:
   - Transaction row created dengan `status='processing'`
   - Edge Function `process-text` invoked
   - Status berubah ke `'done'` via realtime update (<5 detik)
   - Confidence score muncul (0–1)
   - Review required: `true` jika confidence <0.85

### Test 3: Verify Database State
```bash
# Check transactions table
supabase db query "SELECT id, status, confidence, review_required FROM transactions ORDER BY created_at DESC LIMIT 5;"

# Check Edge Functions logs
supabase functions logs process-text
supabase functions logs process-image
supabase functions logs process-voice
```

---

## Step 7: Test Mode Foto & Rekam (Optional)

### Mode Foto
**Prerequisite**: Install `expo-image-picker`
```bash
cd apps/mobile
npx expo install expo-image-picker
```

**Test flow:**
1. Pilih mode "Foto"
2. Pick image dari gallery/kamera
3. Upload ke `receipts` bucket
4. Invoke `process-image` dengan `image_url`

### Mode Rekam
**Prerequisite**: Install `expo-av`
```bash
cd apps/mobile
npx expo install expo-av
```

**Test flow:**
1. Pilih mode "Rekam"
2. Record audio (max 30 detik)
3. Upload ke `voice-inputs` bucket
4. Invoke `process-voice` dengan `audio_path`
5. Verify audio auto-delete setelah processing

---

## Troubleshooting

### Issue 1: "Supabase environment variables are not configured"
**Solution**: Pastikan `apps/mobile/.env.local` ada dan variabel terisi.

### Issue 2: Edge Function timeout atau error
**Solution**: Check logs:
```bash
supabase functions logs process-text --follow
```

### Issue 3: Realtime updates tidak muncul
**Solution**: 
1. Verify Supabase client initialized dengan URL+key yang benar
2. Check network tab untuk WebSocket connection
3. Verify RLS policies aktif di tabel `transactions`

### Issue 4: ANTHROPIC_API_KEY / OPENAI_API_KEY invalid
**Solution**: 
1. Regenerate key di dashboard Anthropic/OpenAI
2. Update secrets: `supabase secrets set ANTHROPIC_API_KEY=new-key`
3. Redeploy functions: `supabase functions deploy process-text`

---

## Verification Checklist

### ✅ Core Infrastructure
- [ ] Supabase local/cloud running
- [ ] Migrations applied (12 tables + 2 storage buckets)
- [ ] Environment variables set (mobile + Edge Functions)
- [ ] Edge Functions deployed (3 functions)

### ✅ Mobile App
- [ ] App starts without error
- [ ] Auth flow works (register → login → logout)
- [ ] Protected routes guard active
- [ ] Capture mode Teks functional end-to-end

### ✅ Async AI Pipeline
- [ ] Transaction insert dengan `status='processing'` sukses
- [ ] Edge Function invoked dan return response
- [ ] Realtime update status dari `processing` → `done`/`error`
- [ ] Confidence score populated (0–1)
- [ ] `review_required` set sesuai confidence threshold (0.85)

### ✅ Database & Storage
- [ ] RLS policies aktif (user hanya akses data sendiri)
- [ ] Storage buckets accessible dengan RLS
- [ ] Transaction row updated dengan extracted fields

---

## Next Steps After Local Testing

1. **Implement confidence-based UI**:
   - High confidence auto-save + undo snackbar
   - Low confidence review card

2. **Wire mode Foto/Rekam**:
   - Image picker + upload flow
   - Audio recorder + upload flow

3. **Add premium gate**:
   - `check-usage` Edge Function
   - Free tier limits enforcement

4. **Manual transaction CRUD**:
   - Create/edit/delete dengan wallet balance update
   - Validasi nominal > 0

5. **Dashboard mobile-first**:
   - Saldo ringkasan
   - Transaksi terbaru
   - Budget warning indicator

---

## Useful Commands Reference

```bash
# Supabase
supabase start          # Start local stack
supabase stop           # Stop local stack
supabase status         # Check services status
supabase db reset       # Reset database + apply migrations
supabase db push        # Push schema changes
supabase functions deploy <name>  # Deploy Edge Function
supabase functions logs <name>    # View function logs
supabase secrets list   # List environment secrets

# Mobile
pnpm dev:mobile         # Start Expo dev server
npx expo start --web    # Web only
npx expo start --android # Android
npx expo start --ios    # iOS

# Type checking
pnpm --filter mobile type-check
pnpm --filter web type-check

# Clean install
rm -rf node_modules apps/mobile/node_modules
pnpm install
```

---

## Wave A UI Foundation Verification (Web + Mobile)

```bash
pnpm --filter @kaswise/web test
pnpm --filter @kaswise/web type-check
pnpm --filter @kaswise/web build
pnpm --filter mobile test
pnpm --filter mobile type-check
```

Expected:
- all tests pass
- no type errors
- web build succeeds

## Support

Jika stuck:
1. Check `supabase/README.md` untuk setup detail
2. Check `CLAUDE.md` untuk konteks project
3. Check `PHASE_0_CHANGELOG.md` dan `PHASE_1_CHANGELOG.md` untuk perubahan terkini
4. Run `pnpm --filter mobile type-check` untuk verify TypeScript errors
