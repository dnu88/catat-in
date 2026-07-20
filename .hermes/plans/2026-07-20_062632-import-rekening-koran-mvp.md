# Import Rekening Koran MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Mengaktifkan fitur import rekening koran CSV/XLSX di Kaswise mobile/PWA secara aman, feature-flagged, dan tidak mengganggu aplikasi live.

**Architecture:** Backend import sudah tersedia (`/api/v1/imports/preview` dan `/api/v1/imports/confirm`) dengan parser bank, duplicate hash, household context, dan insert transaksi `input_type=import`. Plan ini membangun mobile UI + service wrapper secara additive, default hidden via feature flag, lalu memverifikasi dengan test dan live quality gate.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase Auth session, FastAPI existing import endpoints, pnpm/Jest.

---

## Current Context

- Repo root: `/home/Danu88/apps/kaswise`
- Active app: `apps/mobile`
- Legacy web: `apps/web` maintenance-only; jangan tambahkan fitur baru di sana.
- Existing mobile import route: `apps/mobile/app/(tabs)/imports.tsx` hanya redirect ke `/(tabs)/capture`.
- Existing backend:
  - `backend/app/api/v1/imports.py`
  - `backend/app/services/import_service.py`
- Existing backend supports:
  - bank/e-wallet list: `bca`, `mandiri`, `bni`, `bri`, `gopay`, `ovo`
  - file size max 5MB
  - max rows 10,000
  - preview + confirm
  - duplicate hash
  - personal/household context
  - wallet validation
  - DB trigger handles wallet balance
- Existing test explicitly expects import mode not visible in Capture, so import should initially live as hidden route / feature-flagged entry, not as a Capture mode.

## Safety Principles

1. **Feature flag default OFF.** Live users should not see behavior change until enabled.
2. **Additive UI.** Replace redirect with actual screen, but keep screen unreachable unless flag entrypoint is enabled.
3. **No schema changes unless tests reveal a gap.** Backend already inserts `import_hash` and `input_type=import`.
4. **Preview before confirm.** Never auto-import from upload.
5. **No PDF support in MVP.** CSV/XLSX only.
6. **Preserve wallet trigger invariant.** Do not manually update wallet balance from mobile/backend import code.

---

## Acceptance Criteria

- [ ] With `EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT` unset/false, no new visible import entry appears in normal app surfaces.
- [ ] Import route renders an explanatory disabled/coming-soon state when flag OFF or can be accessed directly safely.
- [ ] With flag ON, user can:
  - choose bank/e-wallet,
  - choose active wallet for current finance context,
  - upload CSV/XLSX,
  - see preview count, duplicate count, error rows, skipped months,
  - confirm import,
  - see imported/skipped result.
- [ ] Confirm payload includes correct personal/household context.
- [ ] Duplicate rows are visibly separated and not imported by default.
- [ ] UI handles backend errors: unsupported bank, invalid format, too large, no wallet, auth missing, rate limit.
- [ ] Tests cover feature flag, preview, confirm, duplicate/error states.
- [ ] `pnpm --filter mobile type-check` passes.
- [ ] Focused import tests pass.
- [ ] Full mobile live quality gate passes before deployment.

---

## Proposed Files

### Create

- `apps/mobile/src/config/features.ts`
- `apps/mobile/src/services/import-statements.ts`
- `apps/mobile/__tests__/import-statements-service.test.ts`

### Modify

- `apps/mobile/app/(tabs)/imports.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx` only if adding a visible hidden-route title/label tweak is needed.
- `apps/mobile/app/(tabs)/settings.tsx` or `apps/mobile/app/(tabs)/capture.tsx` only if adding a feature-flagged entrypoint.
- `apps/mobile/__tests__/imports-screen.test.tsx`
- `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx` only if Capture entrypoint/mode expectations change.
- `apps/mobile/__tests__/settings-screen.test.tsx` only if Settings entrypoint is chosen.

---

## Task 1: Add central feature flag helper

**Objective:** Create one canonical place for frontend feature flags so Import can remain invisible until explicitly enabled.

**Files:**
- Create: `apps/mobile/src/config/features.ts`
- Test: can be covered via import screen tests; no standalone test required unless desired.

**Step 1: Create feature helper**

Add:

```ts
const processEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

function flagEnabled(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

export const featureFlags = {
  importStatement: flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT),
  voiceNote: flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_VOICE_NOTE),
};
```

**Step 2: Verify type-check**

Run:

```bash
pnpm --filter mobile type-check
```

Expected: PASS or only pre-existing unrelated errors. If errors are introduced, fix before continuing.

---

## Task 2: Create import statement API service

**Objective:** Wrap backend preview/confirm endpoints in typed mobile functions.

**Files:**
- Create: `apps/mobile/src/services/import-statements.ts`
- Test: `apps/mobile/__tests__/import-statements-service.test.ts`

**Step 1: Define types**

Types should mirror backend response:

```ts
export type BankName = "bca" | "mandiri" | "bni" | "bri" | "gopay" | "ovo";

export type ImportPreviewTransaction = {
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number | string;
  category: string;
  hash: string;
  is_duplicate: boolean;
  row_number: number;
};

export type ImportRowError = {
  row: number;
  reason: string;
};

export type ImportPreviewResponse = {
  transactions: ImportPreviewTransaction[];
  duplicates: ImportPreviewTransaction[];
  errors: ImportRowError[];
  total_rows: number;
  imported: number;
  skipped_months: number;
  bank_name: string;
};

export type ConfirmImportResponse = {
  success: boolean;
  imported: number;
  skipped_duplicates: number;
  message: string;
};
```

**Step 2: Reuse session and API base helpers**

Import from existing receipt service:

```ts
import { getApiBaseUrl, getReceiptAuthSession } from "./receipt-intake";
```

If `getApiBaseUrl` is not exported yet, export it from `receipt-intake.ts` rather than duplicating URL logic.

**Step 3: Implement `previewImportStatement`**

Signature:

```ts
export async function previewImportStatement(
  supabase: SupabaseClient,
  params: { file: Blob; filename: string; bankName: BankName; mimeType?: string },
): Promise<ImportPreviewResponse>
```

Behavior:

- ensure auth session exists,
- create `FormData`,
- append `file`,
- append `bank_name`,
- POST to `${getApiBaseUrl()}/api/v1/imports/preview`,
- parse backend detail errors with a local helper or shared helper.

**Step 4: Implement `confirmImportStatement`**

Signature:

```ts
export async function confirmImportStatement(
  supabase: SupabaseClient,
  body: {
    wallet_id: string;
    transactions: ImportPreviewTransaction[];
    skip_duplicates?: boolean;
    context_type: "personal" | "household";
    household_id?: string | null;
  },
): Promise<ConfirmImportResponse>
```

Payload should pass backend fields exactly:

```ts
{
  wallet_id,
  transactions,
  skip_duplicates: true,
  context_type,
  household_id,
}
```

For personal context, send `household_id: null` or omit it; backend accepts null for personal.

**Step 5: Add service tests**

Mock `fetch` and Supabase session. Cover:

- sends auth header,
- preview sends multipart body,
- confirm sends context fields,
- maps `detail` error string to thrown Error,
- maps quota/structured object detail if reused.

Run:

```bash
pnpm --filter mobile test import-statements-service --runInBand
```

Expected: PASS.

---

## Task 3: Build Import screen disabled state

**Objective:** Direct route access should be safe even when flag OFF.

**Files:**
- Modify: `apps/mobile/app/(tabs)/imports.tsx`
- Test: `apps/mobile/__tests__/imports-screen.test.tsx`

**Step 1: Replace redirect with real component shell**

When flag OFF, render:

- title: “Import Rekening Koran”
- short explanation: “Fitur sedang disiapkan.”
- primary button: back to Capture or Transactions
- no upload controls

**Step 2: Test flag OFF**

Assert:

- screen renders disabled/coming-soon message,
- no bank picker/upload/confirm button visible.

Run:

```bash
pnpm --filter mobile test imports-screen --runInBand
```

Expected: PASS.

---

## Task 4: Build Import screen flag-ON upload state

**Objective:** Let canary users select bank, wallet, and statement file.

**Files:**
- Modify: `apps/mobile/app/(tabs)/imports.tsx`
- Test: `apps/mobile/__tests__/imports-screen.test.tsx`

**Step 1: Load wallets for active finance context**

Use existing patterns from Capture/manual transaction:

- `useSupabase`
- `useFinanceContext`
- `listWallets`
- `useFocusEffect` refresh

Wallet filtering must respect active finance context.

**Step 2: Add bank selector**

Simple buttons/chips are safer than a new picker dependency.

Options:

- BCA
- Mandiri
- BNI
- BRI
- GoPay
- OVO

**Step 3: Add file selection**

Choose the Expo-compatible file picker already available if present. If no document picker dependency exists, add `expo-document-picker` deliberately:

```bash
pnpm --filter mobile add expo-document-picker
```

Then use:

```ts
import * as DocumentPicker from "expo-document-picker";
```

Allowed extensions/copy:

- `.csv`
- `.xlsx`

**Step 4: Validate client-side before upload**

- require wallet,
- require bank,
- require file,
- file size <= 5MB if size is available,
- friendly error if unsupported type.

**Step 5: Tests**

Mock document picker and services. Cover:

- bank selection,
- wallet selection,
- missing wallet error,
- file chosen state,
- preview button disabled until valid.

Run:

```bash
pnpm --filter mobile test imports-screen --runInBand
```

Expected: PASS.

---

## Task 5: Connect preview endpoint and result UI

**Objective:** Show user what will be imported before any DB write.

**Files:**
- Modify: `apps/mobile/app/(tabs)/imports.tsx`
- Test: `apps/mobile/__tests__/imports-screen.test.tsx`

**Step 1: Call `previewImportStatement`**

On preview:

- set loading state,
- clear prior errors/result,
- call service,
- show result.

**Step 2: Render preview summary**

Show:

- total rows,
- new transactions count,
- duplicates count,
- error rows count,
- skipped months count when > 0,
- bank name.

**Step 3: Render transaction sample**

Show first 10–20 new rows:

- date,
- description,
- amount,
- type.

Add copy: “Preview hanya contoh; semua transaksi baru akan diimpor saat konfirmasi.”

**Step 4: Render duplicate/error sections**

- Duplicate rows collapsed or summarized.
- Errors show row number + reason.

**Step 5: Tests**

Cover:

- preview success summary,
- duplicate summary,
- error summary,
- backend error state,
- empty new transactions disables confirm.

Run:

```bash
pnpm --filter mobile test imports-screen --runInBand
```

Expected: PASS.

---

## Task 6: Connect confirm import

**Objective:** Insert previewed transactions only after user confirmation.

**Files:**
- Modify: `apps/mobile/app/(tabs)/imports.tsx`
- Test: `apps/mobile/__tests__/imports-screen.test.tsx`

**Step 1: Build context payload**

From `activeContext`:

```ts
const context_type = activeContext.type === "household" ? "household" : "personal";
const household_id = activeContext.type === "household" ? activeContext.householdId : null;
```

Verify actual field names in `src/state/finance-context.tsx` before implementation.

**Step 2: Confirm transaction list**

Send only `preview.transactions`, not `duplicates`, with `skip_duplicates: true`.

**Step 3: Success state**

Show:

- imported count,
- skipped duplicates,
- backend message,
- CTA to Transactions or Wallet.

**Step 4: Refresh relevant UI if needed**

If screen lists wallet balance or transactions locally, refresh after import. Otherwise route to Transactions.

**Step 5: Tests**

Cover:

- confirm sends correct wallet/context,
- duplicates not sent as normal transactions,
- success message shown,
- confirm error shown.

Run:

```bash
pnpm --filter mobile test imports-screen --runInBand
```

Expected: PASS.

---

## Task 7: Add feature-flagged entrypoint

**Objective:** Make import discoverable only when canary flag is ON.

**Files:** choose one:
- Modify: `apps/mobile/app/(tabs)/settings.tsx`, or
- Modify: `apps/mobile/app/(tabs)/capture.tsx`, or
- Modify dashboard quick actions in `apps/mobile/app/(tabs)/index.tsx` if there is a suitable actions section.
- Test corresponding screen.

**Recommended MVP entrypoint:** Settings or Dashboard quick action, not Capture mode.

Reason: Capture mode tests explicitly lock Track A surfaces to Text + Photo. Import is batch/back-office behavior, not quick capture.

**Step 1: Add entrypoint behind flag**

Pseudo:

```tsx
{featureFlags.importStatement ? (
  <Pressable onPress={() => router.push("/(tabs)/imports")}>
    <Text>Import Rekening Koran</Text>
  </Pressable>
) : null}
```

**Step 2: Tests**

- flag OFF: entrypoint not visible,
- flag ON: entrypoint visible and routes to `/(tabs)/imports`.

Run the matching focused test.

---

## Task 8: Backend focused verification

**Objective:** Confirm existing backend import still passes focused tests before UI relies on it.

**Files:** likely no changes unless tests fail.

Run:

```bash
cd backend && python -m pytest tests/test_import_security.py -q
```

Also add or run focused tests for `preview_import` and `confirm_import` if already present. If absent, create `backend/tests/test_imports_api.py` covering:

- unsupported bank returns 400,
- too-large file returns 413,
- malformed parser error returns 422,
- confirm rejects wallet mismatch,
- confirm skips duplicates.

Run:

```bash
cd backend && python -m pytest tests/test_import_security.py tests/test_imports_api.py -q
```

Expected: PASS.

---

## Task 9: Full mobile quality gate

**Objective:** Ensure no live regression before enabling canary.

Run from repo root:

```bash
pnpm --filter mobile type-check
pnpm --filter mobile test imports-screen import-statements-service --runInBand
pnpm --filter mobile test:live-regression
pnpm --filter mobile export:pwa
pnpm --filter mobile check:bundle
```

If all pass, optionally run canonical gate:

```bash
pnpm --filter mobile quality:live
```

Expected: PASS.

---

## Task 10: Canary rollout

**Objective:** Enable feature for controlled users only.

Steps:

1. Keep production default flag OFF.
2. Enable flag only in canary build/environment.
3. Test live canary manually with:
   - one valid small CSV/XLSX,
   - one duplicate upload,
   - one invalid bank/file,
   - personal context,
   - household context if available.
4. Monitor backend logs for `/api/v1/imports/preview` and `/confirm` failures.
5. Only after canary passes, decide whether to expose to all premium users or all users.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Bank CSV formats differ from assumptions | Preview shows row errors; keep MVP canary-only; collect samples. |
| Users import duplicate transactions | Existing hash + preview duplicate section + skip default. |
| Wallet balance wrong | Rely on DB trigger only; do not manually mutate balance. |
| Large files hurt backend | 5MB and 10,000-row caps already exist. |
| Free user imports too much history | Existing `FREE_TIER_IMPORT_MONTHS` limits preview. |
| PWA file picker incompatibility | Test in browser and mobile; keep fallback copy. |

---

## Deployment Decision Gate

Do not enable broadly unless:

- [ ] Import route hidden when flag OFF.
- [ ] Focused import tests pass.
- [ ] Backend import tests pass.
- [ ] Mobile live regression gate passes.
- [ ] Manual canary import succeeds with a real sample file.
- [ ] Manual duplicate re-import shows skipped/duplicate state.
