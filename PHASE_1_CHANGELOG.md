# Phase 1 Changelog — AI Core Implementation

**Date**: 2026-05-06  
**Status**: ✅ Completed  
**Goal**: Implement async AI processing (text, OCR, voice) + confidence-based saving

---

## Summary

Phase 1 menambahkan fondasi async AI pipeline dengan 3 Edge Functions (process-text, process-image, process-voice), realtime subscription untuk status updates, dan mobile capture flow yang terintegrasi penuh.

---

## New Files Created

### Edge Functions

1. **`supabase/functions/process-text/index.ts`**
   - AI text extraction dengan Claude Haiku
   - Input: `{ transaction_id, raw_text, user_id }`
   - Output: `{ status, confidence, review_required, fields }`
   - Auto-save jika confidence ≥0.85

2. **`supabase/functions/process-image/index.ts`**
   - OCR receipt processing dengan Claude Haiku vision
   - Input: `{ transaction_id, image_url, user_id, is_physical_receipt? }`
   - Output: `{ status, confidence, review_required, fields }`
   - Auto-save jika confidence ≥0.85

3. **`supabase/functions/process-voice/index.ts`**
   - Voice transcription (Whisper) + extraction (Claude Haiku)
   - Input: `{ transaction_id, audio_path, user_id }`
   - Output: `{ status, confidence, review_required, fields }`
   - Auto-delete audio file di `finally` block
   - Auto-save jika confidence ≥0.85

### Mobile Hooks

4. **`apps/mobile/src/hooks/useTransactionRealtime.ts`**
   - React hook untuk subscribe realtime updates dari Supabase
   - Fetch initial state + subscribe ke postgres_changes
   - Return: `{ transaction, loading }`

---

## Modified Files

### Mobile App

1. **`apps/mobile/app/(tabs)/capture.tsx`**
   - **Before**: Placeholder dengan teks statis
   - **After**: 
     - 4 mode tabs: Teks / Foto / Rekam / Import
     - Mode Teks fully wired: input → insert `status='processing'` → invoke `process-text` → realtime update
     - Status card menampilkan `status`, `confidence`, `review_required`
     - Mode lain (Foto/Rekam/Import) placeholder untuk fase berikutnya

### Shared Types

2. **`packages/shared/types/index.ts`**
   - **Fixed**: Typo pada `BillRecurrence` type (line 38)
   - **Before**: `export type BillRecurrence = 'once' | 'monthly' | 'yearly'్`
   - **After**: `export type BillRecurrence = 'once' | 'monthly' | 'yearly'`

### Documentation

3. **`supabase/README.md`**
   - **Updated**: Section "Edge Functions (Future Phase 1)" → "Edge Functions (Phase 1 — AI Core)"
   - **Added**: 
     - Dokumentasi lengkap untuk 3 Edge Functions (input/output/flow)
     - Environment variables required
     - Deployment commands

---

## Technical Details

### Async AI Pipeline Flow

```
1. Client INSERT transaction dengan status='processing'
   ↓
2. Client invoke Edge Function (process-text/image/voice)
   ↓
3. Edge Function:
   - Extract data dengan AI (Claude Haiku / Whisper)
   - Calculate confidence score (0-1)
   - UPDATE transaction dengan status='done' atau 'error'
   ↓
4. Client subscribe Supabase Realtime
   ↓
5. UI auto-refresh saat status berubah (<1 detik)
```

### Confidence-Based Saving

- **High confidence (≥0.85)**: Auto-save + snackbar "Batalkan" (5 detik) — belum diimplementasi di UI
- **Low confidence (<0.85)**: Set `review_required=true`, user harus review manual
- **Error**: Set `status='error'`, tampilkan `error_message`

### Voice File Lifecycle

```typescript
try {
  // 1. Upload audio ke storage bucket 'voice-inputs'
  // 2. Generate signed URL
  // 3. Transcribe dengan Whisper
  // 4. Extract dengan Claude
  // 5. Update transaction
} finally {
  // 6. DELETE audio file (success atau fail)
  await supabase.storage.from('voice-inputs').remove([audioPath])
}
```

---

## Environment Variables Required

Edge Functions membutuhkan environment variables berikut:

```bash
# Anthropic API (untuk Claude Haiku extraction)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI API (untuk Whisper transcription)
OPENAI_API_KEY=sk-...

# Supabase (auto-injected oleh platform)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Set via Supabase CLI:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## Deployment Commands

```bash
# Deploy Edge Functions
supabase functions deploy process-text
supabase functions deploy process-image
supabase functions deploy process-voice

# Verify deployment
supabase functions list
```

---

## Verification Checklist

### Completed ✅
- [x] Edge Functions created (process-text, process-image, process-voice)
- [x] Realtime hook implemented (`useTransactionRealtime`)
- [x] Mobile capture flow wired untuk mode Teks
- [x] TypeScript type-check passed (`pnpm --filter mobile type-check`)
- [x] Shared types typo fixed (`BillRecurrence`)
- [x] Documentation updated (`supabase/README.md`)

### Pending (Next Phase)
- [ ] Wire mode Foto: upload image → invoke `process-image`
- [ ] Wire mode Rekam: record audio → upload → invoke `process-voice`
- [ ] Wire mode Import: CSV/Excel parser
- [ ] Implement high-confidence auto-save + undo snackbar (5 detik)
- [ ] Implement low-confidence review card UI
- [ ] Premium gate server-side (`check-usage` Edge Function)
- [ ] Usage counters tracking (`ai_text_count`, `voice_count`, `import_count`)
- [ ] End-to-end testing dengan Supabase project real

---

## Known Issues / Notes

1. **Mode Foto/Rekam/Import belum fully wired**  
   Saat ini hanya mode Teks yang invoke Edge Function. Mode lain menampilkan placeholder.

2. **Auto-save + undo snackbar belum diimplementasi**  
   High confidence (≥0.85) seharusnya auto-save dengan opsi "Batalkan" 5 detik, tapi UI ini belum ada.

3. **Review card UI belum ada**  
   Low confidence (<0.85) seharusnya menampilkan review card dengan field ambigu di-highlight.

4. **Premium gate belum ditegakkan**  
   `check-usage` Edge Function belum dibuat, free tier limits belum enforced server-side.

5. **Belum ada error handling user-friendly bahasa Indonesia**  
   Error message dari Edge Function masih raw English.

---

## Next Steps

1. **Implement mode Foto**:
   - Add image picker (expo-image-picker)
   - Upload ke storage bucket `receipts`
   - Invoke `process-image` dengan `image_url`

2. **Implement mode Rekam**:
   - Add audio recorder (expo-av)
   - Upload ke storage bucket `voice-inputs`
   - Invoke `process-voice` dengan `audio_path`

3. **Implement confidence-based UI**:
   - High confidence: auto-save + snackbar "Batalkan" (5 detik)
   - Low confidence: review card dengan field ambigu highlight

4. **Add premium gate**:
   - Create `check-usage` Edge Function
   - Enforce free tier limits server-side
   - OCR fisik premium-only enforcement

5. **Testing end-to-end**:
   - Setup Supabase project real
   - Deploy Edge Functions
   - Test semua lane AI (text/image/voice)
   - Verify realtime updates <1 detik

---

## Files Changed Summary

```
Created:
  supabase/functions/process-text/index.ts
  supabase/functions/process-image/index.ts
  supabase/functions/process-voice/index.ts
  apps/mobile/src/hooks/useTransactionRealtime.ts

Modified:
  apps/mobile/app/(tabs)/capture.tsx
  packages/shared/types/index.ts (line 38 typo fix)
  supabase/README.md (Edge Functions documentation)
```

---

## Wave A UI Foundation Verification

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

**Phase 1 Status**: ✅ Core foundation complete, ready for UI polish + premium gate (Phase 1.5)
