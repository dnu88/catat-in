# Simple Finance Awareness Roadmap Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the next Kaswise mobile features without breaking the original PRD value: simple, mobile-first, fast input, practical awareness, and no heavy financial-planner complexity.

**Architecture:** Implement three small, connected features in order: Simple Bill Reminder, Active-Period Budget Simplification, and Transaction Review. Reuse existing Supabase tables/services, finance context, notification system, i18n, theme, and deploy safeguards. Avoid introducing new navigation depth, complex rule builders, or advanced analytics until the simple flows are stable.

**Tech Stack:** Expo SDK 51, React Native, Expo Router, Supabase client SDK, FastAPI notification helper scripts, Hermes cron, Jest, TypeScript, existing bundle marker guard.

---

## 0. Product Principles From PRD

The implementation must preserve these PRD values:

1. **Simple daily use** — Kaswise exists because many finance apps are too complex.
2. **Mobile-first** — Rafi is the primary persona. Flow should work in 2–3 taps when possible.
3. **No long forms** — keep fields minimal and defaults smart.
4. **Awareness over control panels** — show the next useful action, not full configuration dashboards.
5. **AI/automation should reduce effort** — not add new management tasks.
6. **Every important feature must be bilingual** — ID and EN follow selected language.
7. **Every shipped feature must pass predeploy** — type-check, regression tests, bundle marker check.

### Non-goals for this roadmap

Do **not** build these yet:

- Full recurring transaction automation.
- Complex merchant rule management UI.
- Full cashflow forecasting dashboard.
- Full AI chat follow-up.
- Household role expansion beyond existing finance context support.
- PDF/Excel export.
- Web push notification.

Those remain future phases after simple awareness is stable.

---

## 1. Current Codebase Context

### Mobile app active files

| Area | Existing file | Notes |
|------|---------------|-------|
| Bills screen | `apps/mobile/app/(tabs)/bills.tsx` | Existing list/filter/mark-paid UI; currently mostly hardcoded ID and no create/edit flow visible. |
| Bills service | `apps/mobile/src/services/bills.ts` | CRUD for `bill_reminders`; supports finance context and permissions. |
| Bills tests | `apps/mobile/src/services/bills.test.ts` | Service coverage exists. |
| Budget screen | `apps/mobile/app/(tabs)/budgets.tsx` | Existing envelope-style budget UI, create/edit/delete, category visual support. |
| Budget service | `apps/mobile/src/services/budget-envelopes.ts` | Already has active period logic and progress calculation. |
| Budget tests | `apps/mobile/src/services/budget-envelopes.test.ts` | Existing progress/status tests. |
| Notifications | `apps/mobile/app/notifications.tsx`, `apps/mobile/src/services/notifications.ts` | In-app notification center already exists. |
| I18n | `apps/mobile/src/i18n/i18n-context.tsx` | App-wide ID/EN preference. |
| Finance context | `apps/mobile/src/state/finance-context.tsx`, `apps/mobile/src/services/finance-context-query.ts` | Personal/household filtering and permissions. |
| Report period | `apps/mobile/src/state/report-period.tsx` | Active period 25–24 support already exists for reports/AI Insight. |
| Deploy guard | `apps/mobile/scripts/required-markers.json`, `apps/mobile/scripts/check-bundle-markers.mjs` | Required marker list and bundle verifier. |

### Backend / scheduler context

| Area | Existing file/job | Notes |
|------|--------------------|-------|
| Notifications API | `backend/app/api/v1/notifications.py` | Preferences, list, read/unread. |
| Notification service | `backend/app/services/notification_service.py` | Dedupe, preference gates, create notification. |
| Budget scanner | Hermes cron `6475dced5997` | Runs every 4h; creates 80/100 budget threshold notifications. |
| Weekly summary | Hermes cron `c97b81ff6645` | Runs Monday 07:00. |
| PWA marker guard | Hermes cron `f6c49fb9c6db` | Daily live bundle marker check. |

---

## 2. Target Roadmap

### Phase A — Simple Awareness

1. **Simple Bill Reminder**
   - Small form: name, amount, due date/day, recurrence, notify-before.
   - List grouped by status: upcoming, overdue, paid.
   - Mark paid.
   - Notification hook later via cron.

2. **Simple Budget Active Period Polish**
   - Keep current envelope/budget system, but simplify user-facing experience.
   - Show clear remaining/used state for the active period.
   - Ensure budget period follows current active report period when creating a monthly budget.
   - Keep advanced allocation internals hidden.

3. **Transaction Review Queue**
   - Surface only a small CTA: “3 transactions need review.”
   - Sources: category “Lainnya/Other”, `review_required`, low confidence, missing merchant/category/amount.
   - Tap opens existing transaction editing flow or filtered transaction list.

### Later Phases — not in this implementation plan

4. Cashflow estimate: one sentence only.
5. AI quick actions under AI Insight.
6. Export PDF/Excel.
7. Web push notification.

---

## 3. UX Rules

### Bill Reminder

Keep the create/edit form to five fields max:

1. Name — text input, examples: “Internet”, “Kos”, “Listrik”.
2. Amount — numeric rupiah.
3. Due day/date — default today’s day for monthly, exact date for once.
4. Recurrence — segmented control: Monthly, Once. Yearly can remain service-supported but should not be primary UI unless already present.
5. Notify — chips: H-3, H-1, Hari-H / 3 days before, 1 day before, On due date.

### Budget

Budget screen should answer:

- “How much can I still spend?”
- “Am I safe, close, or over?”
- “Until what date?”

Avoid terms like allocation, envelope allocation, sync confidence in user-facing copy unless absolutely required.

### Transaction Review

Transaction Review should be one CTA, not a new complex management module:

- Dashboard card if count > 0.
- Reports card optional if quality affects insights.
- Notification optional later.

---

## 4. Data Model Decisions

### Bill Reminder

Use existing table/service shape from `apps/mobile/src/services/bills.ts`:

```ts
export interface BillCreate {
  name: string;
  amount: number;
  due_day: number;
  recurrence: "monthly" | "yearly" | "once";
  next_due_date: string;
  notify_before_days?: number;
}
```

Do not add a new table unless production schema lacks a required column. First inspect schema with Supabase service client or existing migrations before editing.

Recommended minimal fields:

- `name`
- `amount`
- `due_day`
- `recurrence`
- `next_due_date`
- `notify_before_days`
- `is_paid`
- `payment_history`
- existing audit fields: `user_id`, `household_id`, `created_by`, `updated_by`

### Budget

Use current `budget_envelopes` / allocation implementation. Do not create a second “simple budgets” table. The feature is a UX simplification over existing domain.

### Transaction Review

Use existing transaction fields if available:

- `review_required`
- `confidence`
- `kategori` or `category`
- `merchant`
- `nominal` / `amount`
- `status`
- `tanggal` / `date`

If service functions use different field names, adapt to current code rather than changing schema.

---

## 5. Implementation Tasks

## Milestone 1 — Simple Bill Reminder

### Task 1: Add/repair i18n on Bills screen before adding features

**Objective:** Ensure Bills screen follows selected language before adding new UI.

**Files:**
- Modify: `apps/mobile/app/(tabs)/bills.tsx`
- Test: `apps/mobile/__tests__/bills-screen.test.tsx` or create if missing

**Steps:**
1. Import `useI18n`.
2. Add `const isEn = language === "en";`.
3. Replace hardcoded strings:
   - `Tagihan` → `Bills`
   - `Kelola pengingat tagihan rutin.` → `Manage simple bill reminders.`
   - `+ Baru` → `+ New`
   - `Keluarga` / `Pribadi` → `Household` / `Personal`
   - `Ada X tagihan terlambat` → `X overdue bill(s)`
   - `Segera bayar untuk menghindari denda.` → `Pay soon to avoid late fees.`
   - `Total Tagihan Bulan Ini` → `Bills due this month`
   - filter chips and button labels.
4. Use locale in `toLocaleDateString(isEn ? "en-US" : "id-ID", ...)`.

**Verification:**
```bash
pnpm --filter mobile type-check
pnpm --filter mobile test bills -- --runInBand
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/bills.tsx apps/mobile/__tests__/bills-screen.test.tsx
git commit -m "i18n: localize bills screen"
```

---

### Task 2: Add bill create form state and validation helpers

**Objective:** Prepare simple bill creation without changing UI yet.

**Files:**
- Modify: `apps/mobile/app/(tabs)/bills.tsx`
- Test: `apps/mobile/src/services/bills.test.ts` or colocated helper test if helpers are exported

**Implementation notes:**

Add local UI state:

```ts
const [showCreate, setShowCreate] = useState(false);
const [nameInput, setNameInput] = useState("");
const [amountInput, setAmountInput] = useState("");
const [dueDayInput, setDueDayInput] = useState(String(new Date().getDate()));
const [recurrenceInput, setRecurrenceInput] = useState<"monthly" | "once">("monthly");
const [notifyBeforeDays, setNotifyBeforeDays] = useState(3);
const [savingBill, setSavingBill] = useState(false);
```

Helper behavior:

```ts
function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  return Number(digits || 0);
}

function clampDueDay(raw: string): number {
  const day = Number(raw);
  if (!Number.isFinite(day)) return new Date().getDate();
  return Math.min(Math.max(Math.round(day), 1), 31);
}
```

**Validation rules:**
- name required
- amount > 0
- due day 1–31
- recurrence only monthly/once

**Verification:**
```bash
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/bills.tsx
git commit -m "feat: prepare simple bill reminder form state"
```

---

### Task 3: Render create bill card inline

**Objective:** Add a simple inline form opened by `+ New`, avoiding a deep modal or complex route.

**Files:**
- Modify: `apps/mobile/app/(tabs)/bills.tsx`
- Test: `apps/mobile/__tests__/bills-screen.test.tsx`

**UI structure:**

When `showCreate === true`, render a card under the header with:

- Title: `New bill reminder` / `Tagihan baru`
- Name input
- Amount input
- Due day input
- Recurrence chips: Monthly / Once
- Notify chips: H-3, H-1, Hari-H
- Save button
- Cancel button

Required `testID`s:

```txt
bills-create-card
bills-create-name-input
bills-create-amount-input
bills-create-due-day-input
bills-create-recurrence-monthly
bills-create-recurrence-once
bills-create-notify-3
bills-create-notify-1
bills-create-notify-0
bills-create-save
bills-create-cancel
```

**Test cases:**
- Press `+ New` shows `bills-create-card`.
- Empty name or amount shows error state, does not call `createBill`.
- Cancel hides form.

**Verification:**
```bash
pnpm --filter mobile test bills-screen -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/bills.tsx apps/mobile/__tests__/bills-screen.test.tsx
git commit -m "feat: add simple bill reminder create form"
```

---

### Task 4: Wire createBill and reload list

**Objective:** Persist new bill reminders to Supabase using existing service.

**Files:**
- Modify: `apps/mobile/app/(tabs)/bills.tsx`
- Test: `apps/mobile/__tests__/bills-screen.test.tsx`

**Implementation logic:**

```ts
const saveBill = async () => {
  if (savingBill) return;
  const amount = parseRupiahInput(amountInput);
  const dueDay = clampDueDay(dueDayInput);
  if (!nameInput.trim() || amount <= 0) {
    setLoadError(isEn ? "Enter a bill name and amount." : "Isi nama dan nominal tagihan.");
    return;
  }

  const nextDueDate = resolveNextDueDate(dueDay, recurrenceInput);
  setSavingBill(true);
  try {
    await createBill({
      name: nameInput.trim(),
      amount,
      due_day: dueDay,
      recurrence: recurrenceInput,
      next_due_date: nextDueDate,
      notify_before_days: notifyBeforeDays,
    }, activeContext);
    resetCreateForm();
    await loadBills();
  } catch (error) {
    setLoadError(isEn ? "Failed to save bill. Try again." : "Gagal menyimpan tagihan. Coba lagi.");
  } finally {
    setSavingBill(false);
  }
};
```

Add helper:

```ts
function resolveNextDueDate(dueDay: number, recurrence: "monthly" | "once", reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const today = reference.getDate();
  const targetMonth = recurrence === "monthly" && dueDay < today ? month + 1 : month;
  const lastDay = new Date(year, targetMonth + 1, 0).getDate();
  const date = new Date(year, targetMonth, Math.min(dueDay, lastDay));
  return formatLocalDate(date);
}
```

**Test cases:**
- Filled form calls `createBill` with correct payload.
- After success, form resets and `listBills` reloads.

**Verification:**
```bash
pnpm --filter mobile test bills-screen -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/bills.tsx apps/mobile/__tests__/bills-screen.test.tsx
git commit -m "feat: persist simple bill reminders"
```

---

### Task 5: Improve mark-paid behavior for monthly recurrence

**Objective:** Marking a monthly bill paid should move it to next month instead of leaving it permanently paid.

**Files:**
- Modify: `apps/mobile/src/services/bills.ts`
- Modify: `apps/mobile/app/(tabs)/bills.tsx`
- Test: `apps/mobile/src/services/bills.test.ts`

**Decision:**
For `recurrence === "monthly"`, mark paid should append payment history and move `next_due_date` to next month, with `is_paid: false` after rollover. For `once`, set `is_paid: true`.

If schema supports `payment_history`, update:

```ts
payment_history: [
  ...(bill.payment_history ?? []),
  { paid_at: new Date().toISOString(), amount: bill.amount, due_date: bill.next_due_date },
]
```

If current service cannot fetch full bill before update, add `getBillById(id, context)` or use row from local state in screen.

**Acceptance:**
- Monthly bill remains in upcoming list with next month date after mark paid.
- Once bill moves to paid.

**Verification:**
```bash
pnpm --filter mobile test bills -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/src/services/bills.ts apps/mobile/app/'(tabs)'/bills.tsx apps/mobile/src/services/bills.test.ts
git commit -m "fix: roll monthly bills forward when marked paid"
```

---

### Task 6: Add bill reminder notification generator plan-only hook

**Objective:** Prepare cron generation for due bill reminders, but keep it separate from UI shipping if scope grows.

**Files:**
- Create: `backend/scripts/generate_bill_reminder_notifications.py`
- Test: `backend/tests/test_bill_reminder_notifications.py`
- Docs: update `CLAUDE.md` if cron is created

**Behavior:**
- Query active `bill_reminders` where `is_paid=false` and `next_due_date - notify_before_days <= today`.
- Respect notification preferences if a bill reminder preference exists; otherwise use global enabled for now.
- Create type `bill_reminder` notification with dedupe key:
  `bill_reminder:{bill_id}:{next_due_date}:{notify_before_days}`.

**Important:** Do this after MVP bill UI is stable. Do not block UI release on cron.

**Verification:**
```bash
docker exec kaswise-backend python3 scripts/generate_bill_reminder_notifications.py --dry-run
```

**Commit:**
```bash
git add backend/scripts/generate_bill_reminder_notifications.py backend/tests/test_bill_reminder_notifications.py CLAUDE.md
git commit -m "feat: add bill reminder notification generator"
```

---

## Milestone 2 — Simple Budget Active Period Polish

### Task 7: Audit current budget UI copy and hide advanced envelope language

**Objective:** Make Budget screen feel like simple category budget, not envelope accounting.

**Files:**
- Modify: `apps/mobile/app/(tabs)/budgets.tsx`
- Test: `apps/mobile/__tests__/budget-envelopes-screen.test.tsx`

**Copy rules:**
- User-facing: “Budget”, “Limit”, “Used”, “Remaining”, “Until 24 Jun”.
- Avoid: “allocation”, “envelope allocation”, “sync allocation”, “confidence” unless in dev-only logs.

**Verification:**
```bash
pnpm --filter mobile test budget-envelopes-screen -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/budgets.tsx apps/mobile/__tests__/budget-envelopes-screen.test.tsx
git commit -m "refactor: simplify budget screen copy"
```

---

### Task 8: Default new budget period from active report period

**Objective:** If user active period is 25–24, new budgets should default to that period.

**Files:**
- Modify: `apps/mobile/app/(tabs)/budgets.tsx`
- Test: `apps/mobile/__tests__/budget-envelopes-screen.test.tsx`

**Implementation:**
- Import `useReportPeriod`.
- When opening create budget form, prefill `start_date` and `end_date` from `activePeriod.startDate` / `activePeriod.endDate`.
- If active period unavailable, fall back to `resolveMonthlyEnvelopePeriod`.

**Acceptance:**
- With active period 25 May–24 Jun, create form shows those dates.
- Existing budget cards still show their own stored dates.

**Verification:**
```bash
pnpm --filter mobile test budget-envelopes-screen -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/budgets.tsx apps/mobile/__tests__/budget-envelopes-screen.test.tsx
git commit -m "feat: default budgets to active report period"
```

---

### Task 9: Add simple status sentence to each budget card

**Objective:** Make budget state understandable at a glance.

**Files:**
- Modify: `apps/mobile/app/(tabs)/budgets.tsx`
- Test: `apps/mobile/__tests__/budget-envelopes-screen.test.tsx`

**Status text:**

ID:
- Safe: `Tersisa Rp 250.000 sampai 24 Jun`
- Near: `Hati-hati, sudah 85% terpakai`
- Over: `Lewat Rp 50.000 dari budget`

EN:
- Safe: `Rp 250,000 left until Jun 24`
- Near: `Careful, 85% used`
- Over: `Rp 50,000 over budget`

**Acceptance:**
- Text uses selected language.
- Text follows active/stored budget period.
- No extra action required by user.

**Verification:**
```bash
pnpm --filter mobile test budget-envelopes-screen -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/budgets.tsx apps/mobile/__tests__/budget-envelopes-screen.test.tsx
git commit -m "feat: add simple budget status sentence"
```

---

### Task 10: Ensure home/dashboard only shows max 1–3 budget alerts

**Objective:** Keep dashboard simple and avoid overwhelming the user.

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify if needed: `apps/mobile/src/services/budget-envelopes.ts`
- Test: `apps/mobile/__tests__/tabs-index.test.tsx`

**Rules:**
- Show at most 3 budget alerts.
- Prioritize over-budget first, then highest percentage.
- Use concise copy.
- Hide alert card entirely if none.

Existing helper `getHomeEnvelopeAlerts(items, maxItems = 3)` already supports this. Prefer reusing it.

**Verification:**
```bash
pnpm --filter mobile test tabs-index -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/index.tsx apps/mobile/src/services/budget-envelopes.ts apps/mobile/__tests__/tabs-index.test.tsx
git commit -m "feat: show concise budget alerts on dashboard"
```

---

## Milestone 3 — Transaction Review Queue

> **✅ COMPLETED 2026-06-12** — Branch `feat/milestone3-transaction-review`, PR #14.
> All three tasks implemented, 32 bundle markers verified, deployed to live PWA.
>
> **Follow-up 2026-06-12:** after PR #16, bill reminder visuals now use stable name-based colors and monthly "Mark Paid" correctly sets `is_paid: true` before rolling the due date forward.

### Task 11: Create transaction review service helper

**Objective:** Count transactions that need review without adding a new table.

**Files:**
- Create: `apps/mobile/src/services/transaction-review.ts`
- Create: `apps/mobile/src/services/transaction-review.test.ts`

**Core API:**

```ts
export type TransactionReviewSummary = {
  count: number;
  reasons: {
    review_required: number;
    low_confidence: number;
    other_category: number;
    missing_fields: number;
  };
};

export async function getTransactionReviewSummary(
  context: FinanceContext,
  limit = 50,
): Promise<TransactionReviewSummary>;
```

**Review criteria:**
- `review_required === true`
- `confidence < 0.75`
- category equals `Lainnya`, `Other`, or `Other expenses`
- missing amount/category/date

**Query constraints:**
- Use active finance context filter.
- Limit to recent records first, e.g. 50 or current active period if easy.
- Do not load all user history.

**Verification:**
```bash
pnpm --filter mobile test transaction-review -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/src/services/transaction-review.ts apps/mobile/src/services/transaction-review.test.ts
git commit -m "feat: add transaction review summary service"
```

---

### Task 12: Add review CTA card to dashboard

**Objective:** Surface a single small action when transactions need cleanup.

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Test: `apps/mobile/__tests__/tabs-index.test.tsx`

**UI copy:**

ID:
- Title: `3 transaksi perlu dicek`
- Body: `Rapikan kategori agar laporan dan Insight AI lebih akurat.`
- CTA: `Cek sekarang`

EN:
- Title: `3 transactions need review`
- Body: `Clean up categories so reports and AI Insight stay accurate.`
- CTA: `Review now`

**Navigation:**
- Preferred: navigate to transactions tab with query param/filter if existing route supports it.
- If route filter does not exist, navigate to `/(tabs)/transactions` and add a future TODO in code comment.

**Required marker:**
- `home-transaction-review-card`

Add to `apps/mobile/scripts/required-markers.json` only if we consider it critical. If added, deploy guard will protect it.

**Verification:**
```bash
pnpm --filter mobile test tabs-index -- --runInBand
pnpm --filter mobile check:bundle
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/index.tsx apps/mobile/__tests__/tabs-index.test.tsx apps/mobile/scripts/required-markers.json
git commit -m "feat: surface transaction review CTA on dashboard"
```

---

### Task 13: Add transaction list review filter

**Objective:** Let user see only transactions needing cleanup.

**Files:**
- Modify: `apps/mobile/app/(tabs)/transactions.tsx`
- Test: `apps/mobile/__tests__/transactions-swipe-actions.test.tsx` or new `transactions-review-filter.test.tsx`

**Behavior:**
- Add filter chip: `Perlu dicek` / `Needs review`.
- If route param `review=1`, activate this filter.
- Filter by same criteria as `transaction-review.ts` helper.
- Empty state: `Tidak ada transaksi yang perlu dicek.` / `No transactions need review.`

**Verification:**
```bash
pnpm --filter mobile test transactions -- --runInBand
pnpm --filter mobile type-check
```

**Commit:**
```bash
git add apps/mobile/app/'(tabs)'/transactions.tsx apps/mobile/__tests__/transactions-review-filter.test.tsx
git commit -m "feat: add transaction review filter"
```

---

## Milestone 4 — Documentation, Guards, Deploy

### Task 14: Update documentation

**Objective:** Keep repo context current for future agents.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/prd/PRD_Kaswise_v1.md` only if scope/roadmap changes materially
- Modify: this plan with progress notes if implementation deviates

**Docs to add:**
- “Simple Awareness Roadmap” section.
- Bill reminder flow and fields.
- Budget active-period default.
- Transaction review criteria.
- Any new cron job ID if bill reminder generator is scheduled.

**Verification:**
```bash
grep -n "Simple Awareness\|Bill Reminder\|Transaction Review" CLAUDE.md
```

**Commit:**
```bash
git add CLAUDE.md docs/plans/2026-06-11-simple-finance-awareness-roadmap.md docs/prd/PRD_Kaswise_v1.md
git commit -m "docs: add simple awareness roadmap implementation notes"
```

---

### Task 15: Run full mobile quality gate

**Objective:** Ensure no regression before deployment.

**Files:** none

**Commands:**

```bash
pnpm --filter mobile type-check
pnpm --filter mobile test tabs-index budget-envelopes-screen bills-screen transactions-swipe-actions -- --runInBand
pnpm --filter mobile export:pwa
pnpm --filter mobile check:bundle
pnpm --filter mobile predeploy
```

**Expected:**
- Type-check passes.
- Target tests pass.
- Bundle marker check passes.
- Predeploy passes.

---

### Task 16: Deploy PWA

**Objective:** Publish verified mobile PWA changes.

**Command:**

```bash
pnpm --filter mobile deploy:pwa
```

**Verify live bundle:**

```bash
cd /home/Danu88/nginx-proxy-manager/placeholder/_expo/static/js/web
ls -t entry-*.js | head -1
```

Check critical markers:

```bash
pnpm --filter mobile check:bundle
```

If new markers were added for bill/review cards, also grep the live bundle manually.

**Commit/push note:**
Pre-push hook runs quality gate automatically. Use normal `git push`; use `SKIP_MOBILE_CHECK=1` only when predeploy was already run manually in the same turn.

---

## 6. Acceptance Criteria

### Product acceptance

- User can create a bill reminder in ≤ 1 short card, without deep setup.
- User can mark a bill paid.
- Monthly bill does not disappear permanently; it rolls forward.
- Budget cards clearly show used/remaining/over status.
- New budgets default to the active report period.
- Dashboard shows only concise, actionable alert cards.
- Dashboard surfaces transaction review only when useful.
- All new UI is bilingual ID/EN.
- No new heavy management screens are introduced.

### Technical acceptance

- Supabase RLS/finance context respected in bills, budgets, review summary.
- No raw backend errors shown to user.
- Tests added/updated for all new user-visible flows.
- `pnpm --filter mobile predeploy` passes.
- PWA bundle marker check passes.
- Documentation updated.

---

## 7. Recommended Execution Order

Execute in this order:

1. Task 1 — Bills i18n cleanup.
2. Task 2 — Bill form state/helpers.
3. Task 3 — Bill form UI.
4. Task 4 — Persist bill reminders.
5. Task 5 — Monthly rollover behavior.
6. Stop and deploy if bills are stable.
7. Task 7–10 — Budget polish.
8. Stop and deploy if budgets are stable.
9. Task 11–13 — Transaction review.
10. Task 14–16 — Docs, quality gate, deploy.

This preserves the PRD rule: finish one useful simple feature before moving to the next.

---

## 8. Open Questions Before Implementation

1. Should yearly recurrence be exposed in the first bill form, or kept hidden even though service supports it?
   - Recommendation: hide for now. Monthly/Once is enough.

2. Should bill reminder notifications be in-app only first, or also future push?
   - Recommendation: in-app only first. Push is later phase.

3. Should Transaction Review include old transactions or only current active period?
   - Recommendation: current active period + recent 50. Keeps it fast and relevant.

4. Should the dashboard review CTA be a required bundle marker?
   - Recommendation: yes if we consider it a core quality guard; no if we want it optional during iteration.

---

## 9. Definition of Done for This Roadmap

- Bills: create, list, mark paid/roll forward, bilingual, tested, deployed.
- Budgets: active-period default, simple status sentence, bilingual, tested, deployed.
- Review: summary service, dashboard CTA, transaction filter, bilingual, tested, deployed.
- Docs: `CLAUDE.md` and this plan updated with actual implementation notes.
- Guard: marker list updated only for features considered critical.
- Cron: bill reminder cron created only after dry-run succeeds; job ID documented in `CLAUDE.md` and memory.
