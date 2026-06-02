# Photo Receipt MVP Handoff — 2026-06-02

Status: **live and working on `https://kaswise.com`**.

This document records the implementation and production fixes for the Capture AI → Foto receipt flow.

## Scope shipped

The Photo Receipt MVP adds a guarded receipt intake flow to the mobile/PWA Capture screen:

```text
Capture AI → Foto → choose receipt image → process OCR → preview → confirm → save transaction
```

Current behavior:

- Only ready capture modes are exposed: **Teks/Text** and **Foto/Photo**.
- User must review a preview before a receipt transaction is saved.
- Receipt OCR uses backend endpoint: `POST https://api.kaswise.com/api/v1/ai/receipt`.
- Final transaction stores:
  - `input_type: "image"`
  - `status: "done"`
  - `receipt_url` when private storage upload succeeds
  - `raw_input` as the source file name/fallback
  - `ai_confidence`
  - `confidence`
  - `review_required`
- `ai_extracted` raw object is intentionally **not sent** to Supabase transactions because the live schema still has legacy `ai_extracted boolean` in some migrations/live surfaces.

## Main files

- `apps/mobile/app/(tabs)/capture.tsx`
  - Mode selector
  - Foto UI
  - Receipt preview/confirm flow
  - App-language-aware copy
  - Session hardening
  - Storage-RLS tolerant receipt upload
- `apps/mobile/src/services/receipt-intake.ts`
  - API base URL resolution
  - Receipt blob reading
  - MIME/size validation
  - Multipart upload for OCR
  - Session refresh/retry helper
  - Extraction-to-draft normalization
- `apps/mobile/app.json`
  - `expo-image-picker` plugin permission strings
  - production API URL config
- `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx`
  - Capture regression coverage
- `apps/mobile/src/services/receipt-intake.test.ts`
  - Receipt intake helper coverage
- `ops/pwa/server.py`
- `ops/nginx/kaswise-pwa-security-headers.conf`
  - PWA CSP updated to allow local receipt blobs/data fetches

## Production issues found and fixes

### 1. Receipt processing showed `Failed to fetch`

Cause:

- Browser/PWA represents selected local files as `blob:` URLs.
- The PWA must `fetch(blob:...)` to read the selected file before sending it to OCR/storage.
- Existing CSP allowed API/Supabase but not `blob:`/`data:` in `connect-src`, so the browser blocked the local file read and surfaced `Failed to fetch`.

Fix:

- Updated PWA CSP `connect-src` to include `blob:` and `data:`:

```text
connect-src 'self' blob: data: https://api.kaswise.com https://*.supabase.co wss://*.supabase.co;
```

Notes:

- The repo config was updated.
- Live Nginx Proxy Manager advanced config was also updated/reloaded because it is the active edge header source.

Commit:

- `02cc702 fix(ops): allow receipt blob uploads in PWA CSP`

### 2. Receipt save failed because of `ai_extracted`

Cause:

- The app initially sent raw AI extraction object in `ai_extracted`.
- Live database compatibility showed `ai_extracted` may still be boolean in the deployed transaction schema lineage.
- Insert failed during transaction save.

Fix:

- Stop sending `ai_extracted` object in receipt transaction insert.
- Preserve safe scalar fields: `ai_confidence`, `confidence`, `review_required`, `receipt_url`, `raw_input`.

Commit:

- `01a6ea8 fix(mobile): save receipt transactions`

### 3. Capture page language did not follow app language

Cause:

- Capture AI copy was mostly hardcoded in Indonesian.

Fix:

- Localized Capture AI text using the selected app language (`id`/`en`) for:
  - mode labels/helpers
  - placeholders
  - buttons
  - error messages
  - success messages
  - receipt preview actions

Commit:

- `e6c37f4 fix(mobile): harden receipt photo processing`

### 4. Session dropped/null during receipt processing

Cause:

- PWA OAuth/session state can briefly emit a null session during callback/storage settling.
- Receipt processing requires an active Supabase session for bearer token and storage ownership.

Fix:

- Added `getReceiptAuthSession()`:
  - `getSession()`
  - fallback `refreshSession()`
  - short retry before declaring session missing
- Tabs layout now confirms `getSession()` before redirecting to login on transient null auth events.

Commit:

- `2c8f910 fix(mobile): harden receipt photo session flow`

### 5. Storage RLS blocked receipt upload

Cause:

- Private Supabase Storage bucket `receipts` can reject object insert if storage RLS/policy/session/path does not match exactly.
- Original flow treated receipt storage upload as mandatory before OCR/preview.

Fix:

- Receipt image upload is now **best-effort**.
- OCR is performed independently.
- If storage upload fails with RLS, the flow still:
  - processes OCR
  - shows preview
  - allows transaction save
- Saved transaction may have `receipt_url: null` when storage upload fails.
- If wallet scope/RLS blocks transaction insert, the app retries saving without wallet so transaction creation does not fail total.

Commit:

- `3033ab3 fix(mobile): tolerate receipt storage RLS failures`

## Security posture

The MVP follows the transaction intake security baseline:

- Auth/session required before processing.
- AI endpoint is protected by Supabase bearer token.
- Backend AI endpoint is rate-limited.
- Client validates file MIME and size before upload/OCR.
- Allowed receipt MIME types in client: JPG, PNG, WEBP.
- Max receipt size in client: 10MB.
- Private receipt storage upload is user-scoped and best-effort.
- User must confirm preview before transaction is created.
- Wallet balance is still database-trigger managed; client does not mutate wallet balance directly.

## Known limitations / follow-up

1. **Receipt URL can be null**
   - By design after the RLS hardening fix.
   - Follow-up: audit/repair Supabase Storage `receipts` bucket policies and re-enable mandatory storage once verified.

2. **Raw extraction is not stored**
   - Avoided because of legacy `ai_extracted boolean` compatibility.
   - Follow-up: add a migration to introduce a JSONB column such as `ai_extracted_payload jsonb` or safely migrate `ai_extracted` to JSONB.

3. **Receipt image display is deferred**
   - Transaction history does not yet show the private receipt image.
   - Follow-up: use signed URLs to display private receipt images.

4. **No manual edit fields in preview yet**
   - MVP preview currently confirms extracted data.
   - Follow-up: allow editing amount/category/date/merchant before save.

## QA checklist

After any future receipt changes:

```bash
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath src/services/receipt-intake.test.ts __tests__/capture-envelope-suggestion.test.tsx --runInBand
corepack pnpm --filter mobile export:pwa
```

Live PWA checklist:

1. Hard refresh / reopen PWA.
2. Login.
3. Open Capture AI.
4. Confirm app language changes Capture text.
5. Select Foto/Photo.
6. Pick JPG/PNG/WEBP receipt.
7. Process receipt.
8. Confirm preview appears.
9. Save transaction.
10. Confirm transaction appears in Transactions.

## Latest live milestones

- Photo Receipt MVP: `7f08a03 feat(mobile): add photo receipt intake`
- Receipt multipart/language/session fixes: `e6c37f4`, `2c8f910`
- Receipt save/schema compatibility fix: `01a6ea8`
- PWA CSP fix: `02cc702`
- Storage RLS-tolerant flow: `3033ab3`
