# AI Insight Premium Feature Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Membuat AI Insight sebagai fitur premium nyata di Kaswise mobile, bukan sekadar marketing copy.

**Architecture:** Backend FastAPI sudah punya endpoint awal `POST /api/v1/ai/insight` dengan guard `require_premium`, tetapi belum mengambil data finansial riil. Plan ini memperkuat backend agar mengambil ringkasan transaksi/budget dari Supabase, menghasilkan JSON insight terstruktur dari Claude, lalu mobile menampilkan kartu `Insight AI Bulan Ini` di Reports/Home dengan paywall untuk user free.

**Tech Stack:** FastAPI, Supabase service client, Anthropic Claude, Expo React Native, TypeScript, Jest, pytest.

---

## Current State

### Sudah Ada

- Backend endpoint:
  - `backend/app/api/v1/ai.py`
  - `POST /api/v1/ai/insight`
  - Sudah memakai `Depends(require_premium)` sehingga free user akan ditolak.
- Backend AI service:
  - `backend/app/services/ai_service.py`
  - `generate_financial_insight(user_data, period)` sudah memanggil Claude bila `ANTHROPIC_API_KEY` tersedia.
- Mobile AI nyata:
  - `apps/mobile/src/services/receipt-intake.ts`
  - OCR struk via `/api/v1/ai/receipt`.
- Mobile Reports punya insight rule-based:
  - `apps/mobile/app/(tabs)/reports.tsx`
  - `otherCategoryInsight(percent)` muncul kalau kategori Lainnya >= 10%.
- Mobile premium/entitlement client:
  - `apps/mobile/src/services/billing.ts`
  - `getEntitlements()` sudah mengambil `/api/v1/me/entitlements`.

### Belum Ada

- Mobile service untuk `POST /api/v1/ai/insight`.
- Backend belum mengambil transaksi user dari Supabase untuk insight.
- Response insight belum JSON terstruktur.
- UI card AI Insight di Reports/Home belum ada.
- Paywall/upgrade CTA untuk free user belum ada pada card AI Insight.
- Caching/usage table untuk insight belum ada.

---

## Product Decision

### MVP Scope

Fitur premium yang disarankan:

**Nama UI:** `Insight AI Bulan Ini`

**Lokasi MVP:** `Reports` tab, tepat setelah summary card dan sebelum `Budget Wallets` recommendation card.

**Isi card:**

1. Satu paragraf ringkasan kondisi cashflow.
2. 2 sampai 3 highlights.
3. 2 rekomendasi praktis.
4. 0 sampai 2 risk flags.
5. Timestamp `Diperbarui ...`.

**Behavior:**

- Premium user:
  - Bisa tekan `Buat Insight AI`.
  - Loading state tampil.
  - Response tampil sebagai card.
  - Tombol `Refresh` untuk generate ulang.
- Free user:
  - Melihat preview locked card.
  - CTA `Upgrade Premium` menuju `/upgrade`.
- Error state:
  - Jika backend 402: tampil paywall.
  - Jika 502/API error: tampil pesan retry.
  - Jika data transaksi terlalu sedikit: tampil insight lokal fallback.

---

## Backend Design

### Response Contract

Create structured output:

```json
{
  "period": "monthly",
  "generated_at": "2026-06-09T12:00:00Z",
  "summary": "Pengeluaran bulan ini masih terkendali, tapi kategori makan naik cukup terasa.",
  "highlights": [
    "Pengeluaran terbesar ada di Makan & Minum, sekitar 34% dari total pengeluaran.",
    "Cashflow bersih masih positif dibanding periode sebelumnya."
  ],
  "recommendations": [
    "Tetapkan batas mingguan untuk Makan & Minum agar tidak menumpuk di akhir bulan.",
    "Rapikan kategori Lainnya supaya laporan berikutnya lebih akurat."
  ],
  "risk_flags": [
    "Kategori Lainnya terlalu besar, 18% dari total pengeluaran."
  ],
  "data_quality": {
    "transaction_count": 42,
    "has_previous_period": true,
    "other_category_percent": 18
  }
}
```

### Backend Data Summary

Create backend data builder that queries Supabase service client:

File to create:
- `backend/app/services/ai_insight_data.py`

Functions:

```python
def build_ai_insight_context(user_id: str, period: str) -> dict:
    """Return compact, privacy-conscious financial context for AI insight."""
```

Context should include:

- `period_start`, `period_end`
- `transaction_count`
- `income_total`
- `expense_total`
- `net_total`
- `top_categories`: max 8, `{category, amount, percent}`
- `top_merchants`: max 8, merchant names only if present, aggregate amount
- `other_category_percent`
- `previous_period`: income, expense, net, transaction_count if available
- Optional budget usage if feasible:
  - `budgets`: category, limit_amount, spent_amount, percent_used

Privacy rule:

- Do not send raw notes/catatan by default.
- Do not send full transaction list to Claude.
- Aggregate before sending.
- Merchant names are acceptable but cap at top 8.

### Backend Endpoint Update

Modify:
- `backend/app/api/v1/ai.py`

Current:

```python
user_financial_data = {
    "user_id": current_user["user_id"],
    "period": body.period,
}
insight = await generate_financial_insight(user_financial_data, body.period)
return {"insight": insight}
```

Target:

```python
context = build_ai_insight_context(current_user["user_id"], body.period)
insight = await generate_financial_insight(context, body.period)
return insight
```

### Backend AI Service Update

Modify:
- `backend/app/services/ai_service.py`

Change `generate_financial_insight()` to return dict, not plain string.

Prompt requirements:

- Bahasa follows request language later, MVP Bahasa Indonesia first.
- Non-judgmental.
- Actionable.
- No investment/tax/legal advice.
- Must return valid JSON only.
- Must not invent numbers beyond provided context.
- If data insufficient, acknowledge limited data.

Use JSON parse with fallback:

```python
raw = response.content[0].text
parsed = json.loads(_strip_json_code_block(raw))
return normalize_insight_response(parsed, context)
```

Fallback if API key missing:

Return deterministic premium-friendly local response, not “belum aktif” text:

```python
{
  "summary": "Insight AI belum tersedia sementara. Laporan dasar tetap menunjukkan ringkasan cashflow periode ini.",
  "highlights": [...],
  "recommendations": [...],
  "risk_flags": [],
  "data_quality": {...}
}
```

---

## Mobile Design

### Service Layer

Create:
- `apps/mobile/src/services/ai-insights.ts`

Types:

```ts
export type AiInsight = {
  period: 'monthly' | 'weekly' | 'custom' | string;
  generated_at: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  risk_flags: string[];
  data_quality: {
    transaction_count: number;
    has_previous_period?: boolean;
    other_category_percent?: number;
  };
};
```

Function:

```ts
export async function getAiInsight(
  supabase: SupabaseClient,
  period: string = 'monthly',
): Promise<AiInsight> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/ai/insight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(supabase)),
    },
    body: JSON.stringify({ period }),
  });

  if (res.status === 402 || res.status === 403) {
    throw new AiInsightPremiumRequiredError();
  }
  if (!res.ok) throw new Error(`insight gagal (${res.status})`);
  return res.json();
}
```

Important:
- `authHeader` currently exists inside `billing.ts` but is not exported.
- Refactor shared backend auth fetch helper into:
  - `apps/mobile/src/services/api-client.ts`

### UI Component

Create:
- `apps/mobile/src/components/ai/AiInsightCard.tsx`

Props:

```ts
type Props = {
  insight?: AiInsight | null;
  loading?: boolean;
  error?: string | null;
  isPremium: boolean;
  onGenerate: () => void;
  onUpgrade: () => void;
};
```

States:

1. Locked/free:
   - title: `Insight AI Bulan Ini`
   - body: `Dapatkan ringkasan pola pengeluaran dan rekomendasi praktis dari AI.`
   - CTA: `Upgrade Premium`
2. Empty premium:
   - CTA: `Buat Insight AI`
3. Loading:
   - spinner + `Menganalisis laporan...`
4. Success:
   - summary paragraph
   - highlights list
   - recommendations list
   - risk flags if any
   - `Refresh`
5. Error:
   - text + `Coba lagi`

### Reports Integration

Modify:
- `apps/mobile/app/(tabs)/reports.tsx`

Where:
- After `reports-entrance-summary` block.
- Before `reports-entrance-recommendation` block.

State to add:

```ts
const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
const [aiInsightLoading, setAiInsightLoading] = useState(false);
const [aiInsightError, setAiInsightError] = useState<string | null>(null);
```

Use entitlement:
- Either call existing `getEntitlements(supabase)` in reports, or prefer a shared hook if already used elsewhere.
- Free user should not call `/api/v1/ai/insight` automatically.

Event:

```ts
async function handleGenerateAiInsight() {
  if (!isPremium) {
    router.push('/upgrade' as never);
    return;
  }
  setAiInsightLoading(true);
  setAiInsightError(null);
  try {
    setAiInsight(await getAiInsight(supabase, periodFilter));
  } catch (err) {
    setAiInsightError(readErrorMessage(err));
  } finally {
    setAiInsightLoading(false);
  }
}
```

---

## Task Breakdown

### Task 1: Backend tests for premium guard on AI Insight

**Objective:** Ensure free users cannot access `POST /api/v1/ai/insight`.

**Files:**
- Test: `backend/tests/test_ai_insight.py`

**Steps:**
1. Add test for non-premium user returns 402/403.
2. Patch `get_current_user`, `require_premium`, or Supabase profile dependency according to existing test patterns.
3. Run:
   ```bash
   cd /home/Danu88/catat-in/backend
   pytest tests/test_ai_insight.py -q
   ```
4. Expected: tests pass.

### Task 2: Backend data builder for transaction summary

**Objective:** Build compact financial context from Supabase for the current user.

**Files:**
- Create: `backend/app/services/ai_insight_data.py`
- Test: `backend/tests/test_ai_insight_data.py`

**Steps:**
1. Write unit tests with fake Supabase client/table chains.
2. Implement date range for `monthly` first.
3. Query `transactions` filtered by:
   - `user_id`
   - `tanggal >= period_start`
   - `tanggal <= period_end`
4. Aggregate income, expense, net, top categories, top merchants.
5. Add previous period aggregation if easy.
6. Run tests.
7. Commit:
   ```bash
   git commit -m "feat(backend): build financial context for AI insight"
   ```

### Task 3: Backend structured insight response

**Objective:** Return JSON-shaped AI insight from backend.

**Files:**
- Modify: `backend/app/services/ai_service.py`
- Test: `backend/tests/test_ai_service_insight.py`

**Steps:**
1. Add tests for valid JSON response parsing.
2. Add tests for API-key-missing fallback.
3. Update prompt to require JSON only.
4. Add normalization function to ensure arrays are capped and strings safe.
5. Run tests.
6. Commit:
   ```bash
   git commit -m "feat(backend): return structured premium AI insight"
   ```

### Task 4: Backend endpoint uses real context

**Objective:** Wire `POST /api/v1/ai/insight` to real financial data.

**Files:**
- Modify: `backend/app/api/v1/ai.py`
- Test: `backend/tests/test_ai_insight.py`

**Steps:**
1. Import `build_ai_insight_context`.
2. Replace stub `{user_id, period}` context.
3. Return structured insight directly.
4. Test premium user receives structured response.
5. Test free user rejected.
6. Run:
   ```bash
   cd /home/Danu88/catat-in/backend
   pytest tests/test_ai_insight.py tests/test_ai_service_insight.py tests/test_ai_insight_data.py -q
   ```
7. Commit:
   ```bash
   git commit -m "feat(backend): wire AI insight endpoint to real user data"
   ```

### Task 5: Mobile API client helper

**Objective:** Avoid duplicated auth header logic.

**Files:**
- Create: `apps/mobile/src/services/api-client.ts`
- Modify: `apps/mobile/src/services/billing.ts`
- Test: `apps/mobile/src/services/billing.test.ts`

**Steps:**
1. Move `authHeader()` from `billing.ts` into `api-client.ts` and export it.
2. Export `apiFetch()` optional helper if useful.
3. Update billing import.
4. Run billing tests.
5. Commit:
   ```bash
   git commit -m "refactor(mobile): share authenticated API client helper"
   ```

### Task 6: Mobile AI Insight service

**Objective:** Add mobile client for backend AI Insight endpoint.

**Files:**
- Create: `apps/mobile/src/services/ai-insights.ts`
- Test: `apps/mobile/src/services/ai-insights.test.ts`

**Steps:**
1. Define `AiInsight` type.
2. Implement `getAiInsight(supabase, period)`.
3. Handle 402/403 with a typed `AiInsightPremiumRequiredError`.
4. Test URL, body, auth header, success response, premium error.
5. Run:
   ```bash
   cd /home/Danu88/catat-in
   pnpm --filter mobile exec jest src/services/ai-insights.test.ts --runInBand --no-colors
   ```
6. Commit:
   ```bash
   git commit -m "feat(mobile): add AI insight service client"
   ```

### Task 7: Mobile AI Insight card component

**Objective:** Build reusable card UI for locked/loading/success/error states.

**Files:**
- Create: `apps/mobile/src/components/ai/AiInsightCard.tsx`
- Test: `apps/mobile/__tests__/ai-insight-card.test.tsx`

**Steps:**
1. Add locked state snapshot/assertions.
2. Add loading state assertions.
3. Add success state assertions for summary/highlights/recommendations.
4. Add error state assertions.
5. Implement component using existing theme tokens/icons.
6. Run tests.
7. Commit:
   ```bash
   git commit -m "feat(mobile): add AI Insight card component"
   ```

### Task 8: Integrate AI Insight into Reports tab

**Objective:** Show AI Insight as premium feature in Reports.

**Files:**
- Modify: `apps/mobile/app/(tabs)/reports.tsx`
- Test: `apps/mobile/__tests__/reports-ai-insight.test.tsx`

**Steps:**
1. Add entitlement loading or reuse existing hook.
2. Add AI insight state.
3. Render `AiInsightCard` after summary card.
4. Free user: card locked and CTA navigates to `/upgrade`.
5. Premium user: card can generate insight.
6. Test success and error flow.
7. Run targeted tests.
8. Commit:
   ```bash
   git commit -m "feat(mobile): show premium AI Insight in reports"
   ```

### Task 9: End-to-end verification

**Objective:** Ensure full feature works across backend and mobile.

**Commands:**

```bash
cd /home/Danu88/catat-in/backend
pytest tests/test_ai_insight.py tests/test_ai_service_insight.py tests/test_ai_insight_data.py -q

cd /home/Danu88/catat-in
pnpm --filter mobile exec jest src/services/ai-insights.test.ts __tests__/ai-insight-card.test.tsx __tests__/reports-ai-insight.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
pnpm --filter mobile export:pwa
```

Expected:
- Backend tests pass.
- Mobile tests pass.
- Type-check pass.
- PWA export succeeds.

### Task 10: Deploy and smoke test

**Objective:** Ship mobile PWA and verify live behavior.

**Commands:**

```bash
cd /home/Danu88/catat-in
pnpm --filter mobile deploy:pwa
```

Smoke tests:
- Free account sees locked `Insight AI Bulan Ini` card and CTA to upgrade.
- Premium account can generate insight.
- Backend logs show `/api/v1/ai/insight` called.
- Failed Claude/API key case displays graceful fallback/error, not blank UI.

---

## Open Decisions Before Implementation

1. Should insight generate on demand only, or auto-generate when premium user opens Reports?
   - Recommendation: on demand for MVP, lower AI cost and clearer UX.

2. Should insight be cached?
   - Recommendation: not in v1 unless API cost becomes a problem. Add `Refresh` but debounce/cooldown later.

3. Should this consume existing `chat_count` premium quota?
   - Recommendation: separate `insight_count` later. For MVP, premium-only + rate limit is enough.

4. Should AI receive merchant names?
   - Recommendation: yes, aggregated top merchants only, no raw notes.

---

## Acceptance Criteria

- Free users cannot call backend AI Insight successfully.
- Premium users can generate a structured insight from real transaction aggregates.
- Mobile Reports shows locked card for free users.
- Mobile Reports shows generate/success/error states for premium users.
- No raw transaction notes are sent to Claude.
- All tests and type-check pass.
- Feature is visible as a real premium capability, matching upgrade copy.
