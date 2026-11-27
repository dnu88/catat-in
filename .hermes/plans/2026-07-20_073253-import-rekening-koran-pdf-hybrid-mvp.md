# Import Rekening Koran PDF Hybrid MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Menambahkan support PDF rekening koran ke fitur Import Kaswise secara hybrid: extract text/table lokal terlebih dahulu, lalu OCR fallback hanya jika PDF tidak terbaca/struktur tidak valid.

**Architecture:** Mobile tetap memakai Import screen dan service existing. Backend `/api/v1/imports/preview` mendeteksi jenis file; CSV/XLSX memakai parser existing, PDF masuk service baru yang mencoba local table/text extraction. Jika hasil lokal valid, normalize ke transaksi preview. Jika gagal dan OCR fallback enabled, render halaman PDF terbatas dan OCR/AI extract ke struktur transaksi. Confirm endpoint tetap tidak berubah.

**Tech Stack:** Expo Document Picker, FastAPI, pandas existing import service, `pdfplumber`/`pypdf` for local PDF extraction, optional OCR provider adapter, pytest fixtures, Jest focused tests.

---

## Current Baseline

- Branch current: `feat/import-statement-mvp` after CSV/XLSX import MVP commit.
- Existing Import MVP:
  - feature flag: `EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT`
  - mobile screen: `apps/mobile/app/(tabs)/imports.tsx`
  - mobile service: `apps/mobile/src/services/import-statements.ts`
  - backend preview/confirm: `backend/app/api/v1/imports.py`
  - existing parser: `backend/app/services/import_service.py`
- Existing confirm endpoint accepts normalized transactions, so PDF work should only affect preview.

## Scope

### In scope

- Allow `.pdf` selection in mobile import screen.
- Backend accepts `application/pdf` in preview.
- Add local PDF extraction path first.
- Add OCR fallback path behind backend flag/settings.
- Bank priority for MVP:
  1. BCA text-based PDF
  2. Mandiri text-based PDF
- Clear error messages for:
  - encrypted/password PDF,
  - scanned PDF when OCR disabled,
  - unsupported bank PDF format,
  - too many pages / file too large.
- Preview remains mandatory before confirm.

### Out of scope for MVP

- Universal parser for every bank PDF.
- Auto-confirm / auto-save.
- Storing raw PDF permanently.
- Full OCR for unlimited pages.
- PDF password bypass.

---

## Safety Principles

1. **CSV/XLSX behavior must remain unchanged.** Regression tests must prove this.
2. **PDF parse in preview only.** Confirm endpoint receives same normalized transaction payload.
3. **Local extraction first.** Avoid OCR cost/privacy risk when PDF text/table is extractable.
4. **OCR fallback gated.** Use backend env flag such as `IMPORT_PDF_OCR_ENABLED=false` default.
5. **Hard limits.** Max file size 5MB, max OCR pages 5 for MVP.
6. **No sensitive logs.** Do not log transaction descriptions, account numbers, balances, or raw PDF text.
7. **Review-first.** OCR/local extraction result always goes to preview UI; user confirms manually.

---

## Acceptance Criteria

- [ ] Mobile accepts `.pdf` file selection and copy says CSV/XLSX/PDF.
- [ ] Backend `/imports/preview` accepts PDF content type or `.pdf` filename.
- [ ] Text-based BCA PDF sample fixture previews transactions.
- [ ] Text-based Mandiri PDF sample fixture previews transactions.
- [ ] Encrypted/password PDF returns clear 422.
- [ ] Scanned/empty text PDF returns clear OCR-disabled message when OCR flag OFF.
- [ ] OCR fallback is only attempted when local extraction fails and OCR flag ON.
- [ ] OCR fallback respects max pages and max file size.
- [ ] Duplicate detection works for PDF rows using existing hash logic.
- [ ] Existing CSV/XLSX tests still pass.
- [ ] Mobile type-check and focused tests pass.
- [ ] Backend import/security/PDF tests pass.

---

## Proposed Files

### Backend create

- `backend/app/services/import_pdf_service.py`
- `backend/tests/test_import_pdf_service.py`
- `backend/tests/fixtures/import_pdf/README.md`
- `backend/tests/fixtures/import_pdf/bca_text_statement_anonymized.pdf` if a safe anonymized fixture is available
- `backend/tests/fixtures/import_pdf/mandiri_text_statement_anonymized.pdf` if available

### Backend modify

- `backend/app/api/v1/imports.py`
- `backend/app/services/import_service.py` only if useful to share row normalization helpers
- `backend/app/core/config.py`
- `backend/requirements.txt`

### Mobile modify

- `apps/mobile/app/(tabs)/imports.tsx`
- `apps/mobile/__tests__/imports-screen.test.tsx`

---

## Task 1: Add backend PDF config and dependencies

**Objective:** Add optional PDF/OCR settings without changing current import behavior.

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/requirements.txt`

**Config fields:**

```py
IMPORT_PDF_OCR_ENABLED: bool = False
IMPORT_PDF_MAX_PAGES: int = 20
IMPORT_PDF_OCR_MAX_PAGES: int = 5
IMPORT_PDF_TEXT_MIN_CHARS: int = 80
```

If OCR provider is external, add provider-specific optional settings later, e.g. `OPENAI_API_KEY` already likely exists for AI features.

**Dependencies:**

Recommended local extraction:

```txt
pdfplumber==0.11.7
pypdf==6.4.2
```

If version constraints differ, check latest compatible versions before pinning.

**Verification:**

```bash
cd backend
uv run --with-requirements requirements.txt python -m pytest tests/test_import_security.py -q
```

Expected: existing tests still PASS.

---

## Task 2: Define PDF extraction service interface

**Objective:** Isolate PDF parsing behind one public function.

**Files:**
- Create: `backend/app/services/import_pdf_service.py`
- Create: `backend/tests/test_import_pdf_service.py`

**Public function:**

```py
def parse_bank_pdf(
    file_bytes: bytes,
    bank_name: str,
    existing_hashes: set[str] | None = None,
    max_months_back: int | None = None,
    ocr_enabled: bool | None = None,
) -> dict:
    ...
```

Return shape must match `parse_bank_csv`:

```py
{
    "transactions": [...],
    "duplicates": [...],
    "errors": [...],
    "total_rows": int,
    "imported": int,
    "skipped_months": int,
}
```

**Tests first:**

- unsupported bank PDF raises `ValueError` with clear message,
- empty PDF/text raises scanned/OCR disabled message,
- duplicate hash classification reuses existing `generate_tx_hash`,
- row normalizer escapes formula text via existing helper.

Run:

```bash
cd backend
uv run --with-requirements requirements.txt python -m pytest tests/test_import_pdf_service.py -q
```

Expected initially RED, then GREEN after implementation.

---

## Task 3: Implement local text/table extraction

**Objective:** Extract text/table from text-based PDF without OCR.

**Files:**
- Modify: `backend/app/services/import_pdf_service.py`

**Implementation outline:**

1. Open bytes with `pdfplumber.open(io.BytesIO(file_bytes))`.
2. If encrypted/password error, raise clear `ValueError("PDF terkunci/password-protected belum didukung.")`.
3. Enforce page limit `IMPORT_PDF_MAX_PAGES`.
4. For each page:
   - try `page.extract_table()`/`extract_tables()`;
   - also collect `page.extract_text()` as fallback.
5. If total text chars < `IMPORT_PDF_TEXT_MIN_CHARS`, classify as scanned/empty.
6. Route to bank parser.

**Important:** Do not log raw text.

---

## Task 4: Implement BCA text PDF parser

**Objective:** Convert BCA PDF text/table rows to normalized transaction rows.

**Files:**
- Modify: `backend/app/services/import_pdf_service.py`
- Test: `backend/tests/test_import_pdf_service.py`

**Expected row model before existing transaction conversion:**

```py
{
    "date": "YYYY-MM-DD",
    "description": "...",
    "debit": 0.0,
    "credit": 100000.0,
}
```

**Parser constraints:**

- Prefer table columns when extractable.
- Detect debit/credit by column headings or amount sign.
- Support Indonesian amount format `1.234.567,89`.
- Use existing `clean_amount` if possible.
- Use existing `generate_tx_hash` and `escape_formula_text`.

**Fixture requirement:** Use anonymized PDF if available. If not, write unit tests around parser with extracted table/text strings first, and mark full PDF fixture as pending manual validation.

---

## Task 5: Implement Mandiri text PDF parser

Same as Task 4, but for Mandiri layout.

If no anonymized Mandiri fixture is available, implement parser as conservative:

- explicit unsupported/needs sample error for ambiguous structure,
- do not guess debit/credit columns.

---

## Task 6: Add OCR fallback adapter

**Objective:** Attempt OCR only when local extraction fails and `IMPORT_PDF_OCR_ENABLED=true`.

**Files:**
- Modify/create: `backend/app/services/import_pdf_service.py`
- Optional create: `backend/app/services/import_ocr_service.py`
- Test: `backend/tests/test_import_pdf_service.py`

**MVP behavior:**

```text
local extraction success → no OCR
local extraction empty/invalid + OCR disabled → clear 422
local extraction empty/invalid + OCR enabled → OCR first N pages
```

**OCR output contract:**

OCR should return normalized rows or table-like JSON, not freeform prose.

Recommended shape:

```json
{
  "rows": [
    {"date":"YYYY-MM-DD", "description":"...", "debit":0, "credit":100000}
  ],
  "errors": []
}
```

**Guardrails:**

- max pages = `IMPORT_PDF_OCR_MAX_PAGES`, default 5,
- no raw sensitive logs,
- if OCR confidence unavailable or row ambiguous, put row in `errors`, not `transactions`,
- OCR rows still go through normal duplicate/hash validation.

---

## Task 7: Wire PDF path into `/imports/preview`

**Objective:** Backend preview dispatches PDF to PDF parser, existing files to existing parser.

**Files:**
- Modify: `backend/app/api/v1/imports.py`

**Dispatch logic:**

```py
is_pdf = file.content_type == "application/pdf" or filename.lower().endswith(".pdf")
if is_pdf:
    result = parse_bank_pdf(...)
else:
    result = parse_bank_csv(...)
```

**Errors:**

- Parser `ValueError` remains 422.
- Unsupported content type returns 415 or 422 with clear message.

**Tests:**

- PDF content type calls `parse_bank_pdf`.
- CSV still calls `parse_bank_csv`.
- PDF parser ValueError surfaces as 422.

---

## Task 8: Update mobile to allow PDF

**Objective:** Mobile can select PDF without changing flow.

**Files:**
- Modify: `apps/mobile/app/(tabs)/imports.tsx`
- Modify: `apps/mobile/__tests__/imports-screen.test.tsx`

**Changes:**

```ts
const ALLOWED_IMPORT_EXTENSIONS = [".csv", ".xlsx", ".pdf"];
```

DocumentPicker type add:

```ts
"application/pdf"
```

Copy update:

- `Pilih CSV/XLSX` → `Pilih CSV/XLSX/PDF`
- “PDF belum didukung” copy removed.
- Add caution: “PDF hasil OCR/scan mungkin perlu waktu lebih lama dan wajib dicek.”

**Tests:**

- `.pdf` accepted and displayed.
- unsupported extension rejected.
- existing `.csv` test still passes.

Run:

```bash
pnpm --filter mobile test -- imports-screen --runInBand
pnpm --filter mobile type-check
```

---

## Task 9: Verification gate

Run focused backend:

```bash
cd backend
uv run --with-requirements requirements.txt python -m pytest tests/test_import_security.py tests/test_import_pdf_service.py -q
```

Run focused mobile:

```bash
pnpm --filter mobile test -- imports-screen import-statements-service --runInBand
pnpm --filter mobile type-check
```

Run live regression/build:

```bash
pnpm --filter mobile test:live-regression
pnpm --filter mobile export:pwa
pnpm --filter mobile check:bundle
```

Expected: all PASS before canary.

---

## Canary Manual Test Matrix

| Case | Expected |
|---|---|
| CSV existing | Existing preview still works |
| XLSX existing | Existing preview still works |
| BCA text PDF | Preview transactions |
| Mandiri text PDF | Preview transactions if parser/fixture ready |
| Scanned PDF OCR OFF | Friendly unsupported/scanned error |
| Scanned PDF OCR ON | OCR fallback attempts first max 5 pages |
| Password PDF | Friendly password-protected error |
| Duplicate PDF import | Duplicates shown/skipped |
| Confirm after PDF preview | Existing confirm saves normalized rows |

---

## Rollout Recommendation

1. Keep `EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT=true` only in canary/dev.
2. Keep `IMPORT_PDF_OCR_ENABLED=false` initially.
3. Validate BCA/Mandiri text PDFs with anonymized real samples.
4. Turn OCR ON only for internal/canary account after local extraction works.
5. Broaden only after actual mobile-banking PDFs from target users pass preview accuracy checks.

---

## Open Questions / Inputs Needed

- Need at least 1–2 anonymized real PDF samples per bank for reliable parser tests.
- Decide OCR provider: local OCR vs AI vision. Recommended: provider adapter, default OFF.
- Decide whether OCR fallback is premium-only when enabled.
