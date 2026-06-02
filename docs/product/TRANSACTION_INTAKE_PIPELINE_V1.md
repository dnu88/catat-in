# Transaction Intake Pipeline v1

Status: foundation defined; Photo Receipt MVP implemented for mobile/PWA capture.

## Goal

Use one product pattern for every non-manual transaction source:

```text
Input source → Validate/upload → Process → Preview → Confirm → Create transaction
```

No new intake source should auto-save silently in v1. User gets a preview and confirms before the final transaction is stored.

## Supported source phases

1. `receipt_photo` — first implementation, available from Capture → Foto.
2. `bank_statement` — next, using the existing backend preview/confirm hardening.
3. `voice` — last, after recording/transcription UX is stable.

## Shared transaction fields

Final transactions should preserve these fields where applicable:

- `input_type`: `text`, `image`, `import`, or `voice`
- `status`: `done` for confirmed transactions
- `raw_input`: original text, file name, or source summary
- `receipt_url`: private storage object path for receipt uploads
- `review_required`: true when model confidence is below safe threshold
- `confidence`: normalized 0..1 model confidence
- `ai_confidence`: normalized 0..1 model confidence for existing AI fields
- `ai_extracted`: raw extraction payload when available

## Security checklist per intake source

- Authenticated user required.
- Source is scoped to active personal/household context.
- File size and MIME type validated before processing.
- Backend/AI endpoints rate-limited.
- Storage path is user-owned and private unless explicitly public.
- Backend never trusts client duplicate flags without recomputing idempotency keys.
- Wallet balance is never directly mutated by client code.
- User confirms preview before final transaction creation.

## Photo receipt MVP flow

```text
Pick receipt image
→ validate JPG/PNG/WEBP and max 10MB client-side
→ upload to receipts/{userId}/...
→ send image to /api/v1/ai/receipt for extraction with Supabase bearer token
→ show preview amount/merchant/category/date/confidence
→ user confirms
→ create Supabase transaction with receipt_url + raw_input + AI fields
```

Implementation notes:

- Mobile service: `apps/mobile/src/services/receipt-intake.ts`.
- Capture UI: `apps/mobile/app/(tabs)/capture.tsx`.
- Receipt images are stored as private Supabase Storage object paths, not public URLs.
- Bank import and voice modes remain hidden until their real MVP flows are ready.
- Known v1 simplification: receipt image display in transaction history can be added later using signed URLs.


## Production handoff documents

- [Photo Receipt MVP Handoff — 2026-06-02](./PHOTO_RECEIPT_MVP_HANDOFF_2026-06-02.md)
