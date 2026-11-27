# Kaswise Kontrol & Form Premium Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task, with spec review followed by quality/safety review. Do not implement historical tasks again solely because their checkboxes are stale.

**Goal:** Reconcile the existing simple-premium plan and close demonstrated picker/form UX gaps without rewriting Capture or financial persistence.

**Architecture:** Reuse EntrySheet, TransactionFields, TransactionDatePickerSheet, KeyboardFormShell and existing controllers. Add optional presentation boundaries where needed, defaulting to legacy; preserve simplePremiumExperience OFF. Never introduce another save path or blanket-convert every dropdown into a sheet.

**Tech Stack:** Existing Expo/React Native/TypeScript, Jest, Playwright Chromium/WebKit and Supabase. Read package.json for exact versions before execution.

## Authorization and scope

User approved reconciling plan status and detailing remaining work on 2026-10-05. This document is the deliverable of that planning step, not approval to deploy a new redesign. Capture existing, Home wallet stack, financial services, database schema/trigger/RLS, backend, entitlement, providers and payment configuration remain protected. No commit/push or rollout changes.

Parent: `.hermes/plans/2026-10-03_070927-kaswise-simple-premium-experience.md`.

## Reconciled status — evidence, not unchecked historical boxes

| Area | Present state | Evidence | Next action |
|---|---|---|---|
| Shared entry sheet | Existing component: title, close >=44, backdrop, scroll, modal request-close and bottom inset | `src/components/transaction-entry/EntrySheet.tsx`, `.test.tsx` | Keep it. Verify real browser focus restoration, Escape, touch ownership, text zoom and reduced motion; unit props are not browser proof |
| Compact manual/review foundation | Existing amount/type rows, category/wallet selection and collapsed detail state | `TransactionFields.tsx`; `TransactionReview.single.test.tsx`, `__tests__/transaction-new-compact.test.tsx`, edit-mode tests exist | Run baseline and exercise real flows before claiming gaps or redesigning |
| Context picker | Supports sheet or dropdown; minimum-height options already exist | `src/components/FinanceContextSwitcher.tsx`, `.test.tsx` | Audit each host. Different presentation is not automatically a defect |
| Keyboard shell | Existing iOS avoiding/insets/dismiss support, scroll and bottom spacing | `src/components/layout/KeyboardFormShell.tsx` | Verify actual web/native keyboard behavior; desktop viewport resize alone is insufficient |
| Package A settings/help foundation | Historically released and verified | `docs/qa/package-a-technical-completion-2026-10-04.md` | Do not redo; check current version only where relevant |
| B1 visual foundation | Experience tokens and AmountText already exist | `src/theme/experience-tokens.ts`, `src/components/ui/AmountText.tsx` | Reuse, not duplicate; expansion coverage needs separate audit |
| B2 Reports | COMPLETE, deployed and live verified in this session | `docs/qa/b2-continuation-runs/live-1791169186321/result.json`: 18/18; public SHA matches candidate; Chromium/WebKit; cleanup verified | Regression guard only; no new Reports restructure |
| Budget visual editor | Existing icon/color controls and data-driven progress/status | `app/(tabs)/budgets.tsx` | Preview/cancel behavior and appearance require a dedicated observed audit; do not mark broken based on old reference notes |
| Full picker/form polish | NOT yet audited as one cross-screen contract | Source reads establish foundation, not comprehensive behavior | Tasks CF01–CF07 below |

Historical evidence is not an automatic current pass. Neither old T01–T25 unchecked boxes nor stale T30 blocker wording supersede later release evidence. Parent T30's precise draft/receipt blockers require their own later evidence mapping; this reconciliation does not silently mark every old task complete.

## Completion checklist

- [x] Inspect parent plan, current shared controls, keyboard shell and Package A completion evidence.
- [x] Separate existing foundation, verified B2 delivery and unverified audit coverage.
- [x] Define ordered execution tasks and per-picker acceptance.
- [ ] CF01: Record current before baseline and reproduce any gaps.
- [ ] CF02: Close demonstrated shared sheet accessibility/interactions gaps.
- [ ] CF03: Verify category/wallet/date/context picker integration.
- [ ] CF04: Verify manual/edit/transfer and draft protection.
- [ ] CF05: Verify keyboard, viewport, safe area and navigation overlap.
- [ ] CF06: Complete independent reviews and serial regression gates.
- [ ] CF07: Present before/after; deploy only after explicit design/rollout approval.

## CF01 — Baseline before choosing changes

Files to inspect: EntrySheet/TransactionDatePickerSheet/TransactionFields; FinanceContextSwitcher; `app/(tabs)/transaction-new.tsx`; `src/components/transaction-entry/TransactionReview.tsx`; `tests/experience/harness.ts`; `playwright.experience.config.ts`; existing experience specs.

1. Capture git status, diff and hashes for protected Capture/Home/i18n and all scoped files; preserve dirty/untracked work.
2. Read current rollout flags and package scripts without printing credentials.
3. Run existing focused tests serially from `apps/mobile`:
   `corepack pnpm exec jest --runTestsByPath src/components/transaction-entry/EntrySheet.test.tsx src/components/transaction-entry/TransactionFields.test.tsx src/components/transaction-entry/TransactionFields.i18n.test.tsx src/components/FinanceContextSwitcher.test.tsx __tests__/transaction-new-compact.test.tsx __tests__/transaction-new-edit-mode.test.tsx --runInBand`.
4. Record flag ON/OFF screenshots for category, wallet, date and context pickers, plus manual/edit/transfer, at 360x800, 390x844 and 430x932. Record actual taps and selected values.
5. For each discrepancy classify: confirmed behavior defect / visual refinement / already satisfied / unverified device requirement. Attach reproducer and relevant before evidence. No speculative fixes.

Create during execution: `docs/qa/controls-forms-baseline.json` and `tests/experience/controls-forms.spec.ts` only once the existing harness has been inspected. Generated screenshots go under the established test-results/experience location.

## CF02 — Shared EntrySheet, only confirmed gaps

Modify only if required: EntrySheet.tsx and EntrySheet.test.tsx; browser spec above.

For each demonstrated gap separately: write regression -> run RED -> minimal fix -> GREEN -> inspect diff. Required browser behaviors:
- Closing with button, backdrop and Escape returns focus to the opener without losing entered values.
- Focus cannot escape an open modal; content remains scrollable.
- Actual close hit rectangle >=44x44, center belongs to the intended control, title stays legible with long text/text zoom.
- Safe area and final option remain reachable; no extra primary CTA for immediate-selection pickers.
- Reduced motion is respected; do not rely on slide animations being short.

Any new presentation prop must default to legacy and be explicitly opted into by premium hosts. Do not change shared legacy behavior without an OFF baseline regression. No new sheet dependency.

## CF03 — Four picker integrations

Each instance has its own acceptance checklist, all required:

| Picker | Open/selection | Cancel/Back | Extra guard |
|---|---|---|---|
| Category | Selected category clear via label/check, not color alone; label ID/EN | Close preserves existing category and unsaved amount | Long/custom names; canonical mapping unchanged |
| Wallet | Selected wallet and personal/household scope visible | Close does not mutate selection/draft | Empty wallets actionable; invalid scope and viewer cannot write |
| Date | Current date shown; confirm/cancel behavior matches existing contract | Cancel preserves prior date | Invalid dates reveal validation; no timezone semantic changes |
| Context | Current personal/family context visible | Draft discard requires existing confirmation | Stale async completion cannot switch or write to wrong context |

Reuse existing handlers; do not unify storage or controller logic. Validate selected state in rendered DOM (React Native button may omit aria-selected); also inspect explicit non-color selection cue. Changing sheet styling is not permission to alter Capture layout.

## CF04 — Manual, edit and transfer

Likely scoped files: TransactionFields.tsx, TransactionReview.tsx and `app/(tabs)/transaction-new.tsx`; existing unit tests listed in CF01 and new browser spec.

1. Verify amount/type/category/wallet anchor visibility at 390px with keyboard closed; preserve existing collapsed date/details.
2. Verify validation automatically reveals the relevant collapsed field and preserves other input.
3. Exercise create once, edit same transaction ID, transfer source/destination, close picker then save, repeated tap and network-unconfirmed outcome.
4. Assert one write/idempotency contract, not merely success copy; financial trigger balances remain correct on disposable fixture.
5. Browser Back/cold deep link/cancel must preserve draft or use explicit discard confirmation. Never rewrite reducer, services or controller to achieve visual consistency.

Each confirmed issue follows one RED/GREEN cycle. Already satisfied cases become regression coverage, not UI changes.

## CF05 — Keyboard and full-screen QA

Inspect existing KeyboardFormShell tests before creating any new test. Modify shell/call-site only for proven defect.

- Field, validation message and primary action remain reachable with keyboard open; scroll is not trapped.
- Keyboard close preserves draft and scroll usability.
- Last picker option and final button are not occluded by floating bottom navigation or safe area.
- ID/EN, long labels, text zoom, reduced motion, touch targets, focus and 360/390/430 are included.
- Chromium/WebKit desktop checks are necessary but not proof of a physical phone keyboard. Use a real accessible Android/iOS device; if absent, record a blocked item and ask for device verification before calling this package fully complete. Do not merely carry that caveat into a success declaration.

## CF06 — Review and gates

Independent spec review then code-quality/financial-safety review. Address findings and rerun affected cases.

From apps/mobile, execute serially as background processes with completion notification:
1. Focused tests from CF01 plus all changed-test paths.
2. `corepack pnpm type-check`.
3. `corepack pnpm exec jest --runInBand` (document skipped count separately).
4. `git diff --check` from repo root.
5. `corepack pnpm quality:live`.
6. `corepack pnpm exec playwright test -c playwright.experience.config.ts controls-forms.spec.ts`.

Compare ON before/after, OFF text/geometry/PNG against exact session baseline. Require measured behavior, not only visibility; screenshot after entrance opacity >=0.95. Recheck protected file hashes. If source changes after export, rebuild and revalidate; never run two Jest/build/export jobs concurrently.

## CF07 — Preview, approval, rollout

Present each before/after and observed interaction difference. Capture existing and Home stack must be unchanged. User approval is required before a new redesign rollout. Then create verified rollback snapshot, execute canonical deploy, read back public flags and bundle/hash, authenticated Chromium/WebKit smoke with a disposable user. Cleanup transactions -> wallets -> auth and verify empty rows/auth404. No commit/push without separate instruction.

## Deferred, not silently added

Budget editor preview/row polish and Wallet visual audit are a separate next package after CF acceptance. Relevant source: `app/(tabs)/budgets.tsx`, `wallets.tsx`; do not start them inside the shared-control patch. No new icon search, confetti palette, category-detail page or features merely to resemble Moonveo.

## Risks and definition of done

- Shared primitives can change flag OFF hosts; default-compatible props and parity tests mandatory.
- Partial historical evidence cannot prove physical-device keyboard or full modal accessibility.
- Reuse disposable fixtures, reset database-synced period preferences between independent cases; never touch existing users.
- Host headroom is improved but must be rechecked before builds; no unrelated cleanup.
- This planning task is complete when reconciliation/addendum is saved. The implementation package is complete only when CF01–CF07 and every instance acceptance have verified evidence; design approval and release authorization are separate from planning.
