# AI Continuation Handoff — Next Steps Kaswise

Date: 2026-06-05
Repo: `/home/Danu88/catat-in`
Current branch observed: `ops/hardening-bundle`
Live PWA: `https://kaswise.com`
Live API: `https://api.kaswise.com`

## Purpose

Dokumen ini dibuat supaya model/developer berikutnya bisa langsung lanjut tanpa eksplorasi ulang. Fokusnya adalah **langkah selanjutnya** setelah Photo Receipt MVP, transaction intake itemization, dan hardening ops sudah live/didokumentasikan.

## Current state summary

Kaswise sudah berada di fase **production PWA live + post-go-live hardening/polish**.

Status terakhir yang perlu dipertahankan:

- `apps/mobile` adalah prioritas utama dan source aktif untuk PWA `kaswise.com`.
- `apps/web` adalah legacy/maintenance, tetapi ada landing sederhana/preview di `www.kaswise.com` dari fase sebelumnya.
- `backend` FastAPI dipakai untuk endpoint spesialis: AI/OCR/import/webhook, bukan CRUD utama.
- CRUD finansial utama mobile berjalan langsung ke Supabase via client SDK dan RLS.
- Host/container hardening sudah diterapkan; deploy backend berikutnya wajib menyertakan overlay hardening.

Latest commits yang terlihat saat handoff ini dibuat:

```text
029392e docs(product): document intake itemization updates
4430ace feat(mobile): refine item category rules
0d28260 feat(mobile): itemize receipt and date intake flows
0ab914d ops: add host/container hardening bundle + applied handover
e3c23c8 main/origin/main fix(mobile): clear manual form after canceling edit
```

Working tree saat dicek hanya menunjukkan untracked `.pi/` dari tooling lokal.

## Key docs to read first

Baca dokumen ini sebelum mengubah kode:

```text
docs/product/TRANSACTION_INTAKE_ITEMIZATION_HANDOFF_2026-06-05.md
docs/product/PHOTO_RECEIPT_MVP_HANDOFF_2026-06-02.md
docs/product/TRANSACTION_INTAKE_PIPELINE_V1.md
docs/handoffs/AI_CONTINUATION_HANDOFF_MOBILE_FIRST_USE_GUIDE_2026-06-01.md
docs/status/GO_LIVE_SIGNOFF_MOBILE_PWA_2026-05-31.md
docs/security/HARDENING_OPS_APPLIED_2026-06-03.md
docs/deployment/DEPLOY_VPS_HANDOVER.md
```

## Important constraints

- Jangan expose secret di chat, commit, logs, atau dokumen.
- Jangan jalankan Supabase migration push atau perubahan produksi tanpa review eksplisit.
- Jangan disrupt `https://kaswise.com` live PWA tanpa validasi.
- Jangan overbuild `apps/web` landing sebelum user meminta.
- Jangan broad refactor runtime besar sebelum flow live terbaru selesai QA.
- Jika deploy backend, **wajib** pakai overlay:

```bash
sudo docker compose \
  -f docker-compose.production.yml \
  -f ops/hardening/docker/compose.hardening.yml \
  --env-file .env.production up -d --force-recreate backend
```

## Immediate next step: QA live transaction intake

Prioritas pertama adalah QA manual di PWA live untuk flow terbaru.

### QA checklist

1. Hard refresh/reopen PWA `https://kaswise.com`.
2. Login.
3. Manual transaction:
   - date wheel muncul,
   - urutan wheel `Year/Tahun | Month/Bulan | Date/Tanggal`,
   - tanggal tersimpan benar,
   - kategori `Household & Personal Care / Rumah & Perawatan` muncul.
4. Capture AI → Text:
   - `beli sabun lifebuoy 18000 di Indomaret` masuk Household & Personal Care,
   - `beli aqua dan roti 25000 di Indomaret` masuk Food & Beverage,
   - input dengan tanggal eksplisit tersimpan di tanggal yang benar,
   - satu catatan dengan dua nominal membuat dua draft/transaksi.
5. Capture AI → Photo:
   - proses receipt minimarket,
   - preview menampilkan itemized drafts,
   - item food/drink, household care, health, bills, groceries terpisah bila memungkinkan,
   - total transaksi tersimpan sama dengan total receipt,
   - flow tetap berhasil walaupun `receipt_url` null akibat storage RLS.
6. Cek Transactions dan Reports setelah save.

### Validation commands before/after changes

```bash
git status --short
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runTestsByPath \
  src/services/receipt-item-categorizer.test.ts \
  src/services/receipt-intake.test.ts \
  src/services/transaction-classifier.test.ts \
  __tests__/capture-envelope-suggestion.test.tsx \
  __tests__/transaction-new-edit-mode.test.tsx \
  --runInBand
corepack pnpm --filter mobile export:pwa
curl -fsS https://api.kaswise.com/health
```

Deploy PWA hanya setelah validasi pass:

```bash
corepack pnpm --filter mobile deploy:pwa
```

## Recommended implementation backlog

### P0 — Stabilize latest live intake flows

1. **Manual QA itemization/date/text flow**
   - Goal: pastikan perubahan 2026-06-05 benar-benar aman di akun real.
   - Output ideal: catatan QA singkat di `docs/product/` atau `docs/status/`.

2. **Add editable receipt preview**
   - Current limitation: receipt preview belum bisa diedit per item.
   - Target behavior:
     - user bisa edit amount/category/date/merchant/description setiap item sebelum confirm,
     - user bisa delete item yang salah,
     - total/reconciliation tetap jelas,
     - tetap require confirm sebelum save.
   - Main files:
     ```text
     apps/mobile/app/(tabs)/capture.tsx
     apps/mobile/src/services/receipt-intake.ts
     apps/mobile/src/services/receipt-item-categorizer.ts
     apps/mobile/src/services/category-taxonomy.ts
     ```

3. **Add focused tests for editable receipt preview**
   - Minimal coverage:
     - edit category before save,
     - edit amount before save,
     - remove one item,
     - confirm saves final edited drafts.

### P1 — Receipt storage and audit payload

4. **Audit/repair Supabase Storage RLS for `receipts` bucket**
   - Current behavior is best-effort upload; transaction still saves if upload fails.
   - Target:
     - receipt upload succeeds for authenticated user-owned path,
     - object remains private,
     - signed URL can be generated only by owner/allowed household context.
   - Do not make receipt bucket public.

5. **Add safe raw AI extraction storage**
   - Current limitation: raw extraction object is not stored because legacy `ai_extracted` compatibility may be boolean.
   - Suggested migration: add new JSONB column, e.g. `ai_extracted_payload jsonb`.
   - Keep scalar fields already used:
     ```text
     ai_confidence
     confidence
     review_required
     receipt_url
     raw_input
     ```
   - Add tests/migration checks before using it in mobile/backend.

6. **Display private receipt image in transaction detail/history**
   - Use signed URLs, not public URLs.
   - Ensure household/personal context rules are respected.

### P2 — Expand intake pipeline

7. **Bank statement import MVP**
   - Follow the v1 intake pattern:
     ```text
     Input source → Validate/upload → Process → Preview → Confirm → Create transaction
     ```
   - Never auto-save silently.
   - Backend import confirm should use strict Pydantic models, not broad `list[dict]`.
   - Avoid double wallet-balance mutation if DB trigger is source of truth.

8. **Voice intake MVP**
   - Keep hidden until recording/transcription UX is stable.
   - Same preview/confirm requirement as receipt/import.

### P3 — First-use guide polish

9. **Persist first-use guide state**
   - Current limitation: guide has no persisted dismissal/progress.
   - Suggested AsyncStorage key:
     ```text
     first-use-guide:v1:{userId}
     ```
   - Suggested fields:
     ```ts
     {
       dismissed?: boolean
       reportsVisited?: boolean
       lastStep?: number
       updatedAt?: string
     }
     ```

10. **Add tests for dashboard guide**
    - no wallet → CTA `Buka Dompet`,
    - wallet exists no tx → CTA `Buka Catat`,
    - budget exists/no tx edge,
    - Next button changes active step,
    - reports visited/dismissal if implemented.

## Security / ops backlog

### High priority

1. **Verify NPM admin port 81 status**
   - There is doc drift:
     - `DEPLOY_VPS_HANDOVER.md` says port 81 is closed in cloud firewall and accessed via SSH tunnel.
     - `HARDENING_OPS_APPLIED_2026-06-03.md` still lists port 81 exposure as a remaining risk.
   - Next model should verify actual state before changing anything.
   - If still public, close it or put HTTPS/access-list in front per hardening doc.

2. **Set up off-site backups**
   - Current backup is local VPS only.
   - Recommended: `rclone` to object storage with encryption.
   - Requires user-provided storage credentials.

3. **Confirm service-role key rotation end-to-end**
   - User stated rotation was done earlier; verify new key is present only where needed:
     - `.env.production`,
     - backend container env,
     - Supabase Edge Function secrets if used,
     - any Vercel/hosting env if still relevant.
   - Do not print key values.

### Medium priority

4. **DB-backed audit logs for financial mutations**
   - Start with tables:
     ```text
     transactions
     wallets
     budget_envelopes
     budgets
     profiles billing/profile-management fields only
     ```
   - Use append-only security definer trigger design from `SECURITY_PHASE_2_LIGHT_2026-05-31.md`.

5. **Redis/proxy-backed rate limiting**
   - Especially for:
     ```text
     /api/v1/ai/*
     /api/v1/imports/*
     Supabase Edge Functions
     ```

6. **Runtime RLS/BOLA tests with disposable users**
   - Static tests exist; add live/staging tests later.

7. **CSP unsafe-inline reduction**
   - Do not remove abruptly because Expo/Metro runtime injection currently needs it.
   - Reduce only after staging verification.

## Branch / merge recommendation

Current active branch contains production/hardening/intake work:

```text
ops/hardening-bundle
```

Recommended process before merge to `main`:

```bash
git status --short
corepack pnpm --filter mobile type-check
corepack pnpm --filter mobile test -- --runInBand
python3 -m unittest discover supabase/tests
curl -fsS https://api.kaswise.com/health
```

If all pass and user approves, merge/push branch into `main`. Do not merge automatically without explicit approval.

## Files likely touched next

Mobile intake:

```text
apps/mobile/app/(tabs)/capture.tsx
apps/mobile/app/(tabs)/transaction-new.tsx
apps/mobile/src/services/receipt-intake.ts
apps/mobile/src/services/receipt-item-categorizer.ts
apps/mobile/src/services/transaction-classifier.ts
apps/mobile/src/services/category-taxonomy.ts
apps/mobile/src/theme/category-visuals.ts
apps/mobile/src/components/icons/kaswise-icons.tsx
```

Supabase/storage/security:

```text
supabase/migrations/
supabase/tests/
docs/security/
docs/product/
```

Backend AI/import:

```text
backend/app/services/ai_service.py
backend/app/api/v1/imports.py
backend/app/core/auth.py
backend/app/core/rate_limit.py
```

Ops/deploy:

```text
ops/hardening/
docs/deployment/DEPLOY_VPS_HANDOVER.md
docs/security/HARDENING_OPS_APPLIED_2026-06-03.md
```

## Suggested first prompt for next model

```text
Baca docs/handoffs/AI_CONTINUATION_HANDOFF_NEXT_STEPS_2026-06-05.md, lalu mulai dari P0: QA/stabilize transaction intake flows. Jangan edit dulu sebelum mapping file capture/receipt-intake dan jalankan git status.
```

## Handoff verdict

Next best work is **not** broad redesign. The highest-value sequence is:

1. QA live intake itemization/date/text receipt flow.
2. Make receipt preview editable.
3. Repair receipt storage RLS + signed image display.
4. Add safe raw extraction JSONB payload.
5. Continue import/voice intake only after preview/confirm pattern is stable.
6. Verify/complete security ops backlog.
