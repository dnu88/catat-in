# Design proposal — progressive disclosure on transaction review

Status: proposal, no code beyond the shipped focus banner (P1).
Scope: `apps/mobile/src/components/transaction-entry/*`, `app/(tabs)/capture.tsx`.
Goal: Cut the review to *only what the AI could not read*, without weakening any
financial guard that exists today.

## 1. What happens today

1. The composer sends text to the extractor and builds drafts
   (`src/features/transaction-entry/draft.ts`).
2. `shouldAutoSaveEntry` (`src/features/transaction-entry/auto-save.ts`) saves
   silently only when **all** of these hold: one draft, text source, non-transfer,
   positive amount, specific (non-generic) category, zero `unresolvedFields`, no
   extractor `unclear` flag, confidence ≥ classifier threshold, and
   `allDraftsValid`.
3. Anything else opens `TransactionReview`, which renders the **full** editable
   form per draft: amount, type (expense/income/transfer), category, wallet, date,
   merchant, description, permission error — plus per-field warning rows with an
   explicit acknowledge control (`review-ack-<key>-<field>`).
4. A focus banner (P1, shipped) now names the unresolved fields at the top and
   gives a one-tap route to the matching picker. The form below is unchanged.

So the decision *which* fields are doubtful already exists. The gap is purely
presentation: the user still scans a full form to fix one or two values.

## 2. Principle

> Ask only for what is missing. Never relax what protects money.

Three rules that must survive any redesign:

- **R1 — Blocker set unchanged.** `validateDraft` + `unacknowledgedWarnings` stay
  the only gate before `review-save` becomes enabled. Collapsing a field must
  never make an invalid draft look savable.
- **R2 — Unacknowledged doubt is never auto-accepted.** Collapsing a doubtful
  field is allowed only if it is *resolved or acknowledged*; otherwise the save
  CTA stays disabled and the reason stays visible.
- **R3 — Nothing hidden may change silently.** Fields hidden behind “Ubah detail”
  must be shown in a read-only summary line so the user can still eyeball them.

## 3. Proposed flow

```
text ──▶ extractor ──▶ shouldAutoSaveEntry
                         │
                         ├─ auto ───────────▶ saved + undo toast (today)
                         └─ review ──┬─ single draft, ≤2 doubts, no hard error
                                     │      └─▶ FOCUS REVIEW  (new default)
                                     └─ otherwise
                                            └─▶ FULL REVIEW  (today's screen)
```

Routing rules for FOCUS REVIEW (all must hold):

- `drafts.length === 1`
- `shouldAutoSaveEntry` failed for a *soft* reason only:
  `unresolved_fields`, `extractor_unsure`, `low_confidence`, `generic_category`
- `validateDraft` returns no hard errors (`amount`, `type`, `category`, `date`,
  `wallet`, `permission`, transfer target)
- not a receipt source (receipts keep the full review: totals, items, tax, split)

Everything else keeps the full review. Multi-draft batches are explicitly out.

## 4. Focus review screen

```
┌──────────────────────────────────────────┐
│  Rp 45.000                               │  amount anchor (always visible)
│  Kopi · BCA · hari ini                   │  context line — wallet + date + type
├──────────────────────────────────────────┤
│  Perlu dicek                             │
│  [ Kategori belum pasti        ▾ ]       │  one row per unresolved field
│                                          │
│  [        Simpan transaksi        ]      │  disabled until resolved/acked
│  [ Ubah detail ]                         │  expands the full form in place
└──────────────────────────────────────────┘
```

Interaction rules:

- **Question rows** are the same warning copy as today
  (`amountUncertain`, `categoryUncertain`, …) so wording does not fork.
- Tapping a row opens the corresponding picker (`category`, `wallet`, `date`);
  amount has no picker, so its row focuses the existing amount input.
- Choosing a value **resolves** the field (clears it from `unresolvedFields`);
  the row disappears. An “Sudah benar” action keeps today’s acknowledge path for
  values the user judges correct without editing — the only way to accept an
  unchanged doubtful value.
- The save CTA is enabled exactly when `allDraftsValid` and
  `unacknowledgedWarnings().length === 0`, i.e. the same predicate as today.
- **“Ubah detail”** expands the full `TransactionFields` exactly as it renders
  now; it is a disclosure, not a second screen. State (drafts, pickers, errors)
  is shared, so expanding changes nothing about validation.
- Context line is not decorative: it is R3. Wallet, date and type stay readable
  even when their rows are not shown.

Failure and edge behaviour:

- Save error → inline error plus a retry that keeps the focus state (no reset to
  the composer).
- Deleting the draft / Kembali → unchanged from today.
- No wallets / read-only role → hard error, so the full review opens (the focus
  screen never hides a permission problem).

## 5. Edge-case matrix

| Case | Route | Rationale |
| --- | --- | --- |
| One doubtful category, everything else clean | Focus | The intended win |
| Doubtful amount only | Focus, amount row focuses input | Most common after a bad parse |
| Extractor `unclear` free text, no field flag | Focus with a “Periksa keterangan” row | Keeps the extractor’s own doubt visible |
| Generic category (“Lainnya”) | Focus | Today it blocks auto-save; asking one question is enough |
| Transfer | Full | Needs a target wallet; two coupled fields |
| Receipt total / split / batch items | Full | Totals, tax and splits need the whole picture |
| Batch of 2+ text transactions | Full | Per-draft warnings already exist there |
| Confidence below threshold but fields resolved | Focus | Confidence alone should not demand a full form |
| Hard validation error (missing wallet, permission) | Full | Never hide a blocking problem |
| Offline / save failure | Focus + retry | No silent loss, no composer reset |

## 6. What explicitly does NOT change

- `shouldAutoSaveEntry` thresholds, `ALL`-rules and the classifier threshold.
- `validateDraft` / `allDraftsValid` / `unacknowledgedWarnings`.
- Persistence path (`saveEntry`, PATCH by original ID, create-once behaviour).
- Undo semantics (`capture-undo-error` + `capture-undo-retry`).
- Batch review UI, receipt review UI, transfer flow.

## 7. Accessibility and device

- Every question row ≥ 44×44, with `accessibilityRole="button"`,
  a label naming the field and current value, and a hint that choosing opens a
  picker.
- The collapsed summary line is exposed as one accessible group with the full
  sentence (amount, category, wallet, date) so screen readers never lose context.
- Reduced motion: the expand/collapse uses the app’s existing motion tokens; no
  new animation primitive.
- Keyboard: amount row focus must not be covered by the keyboard (reuse the
  existing `KeyboardAvoidingView` behaviour verified on device).

## 8. Rollout

- Feature flag `EXPO_PUBLIC_FEATURE_FOCUS_REVIEW` (registry entry + marker), dark
  by default; enable per release after gates.
- Rollback = flag off; the full review is still in the bundle, so no redeploy of
  logic is needed.
- Ship P2 behind the flag, verify on 390/360 + live smoke, then flip.

## 9. Test plan

Unit / component (Jest):

- Routing truth table: each `AutoSaveBlockReason` maps to focus or full.
- Save CTA disabled while a doubtful field is collapsed but unacknowledged (R1/R2).
- Resolving a field removes its row and enables save when the draft is otherwise valid.
- Expand → edit → collapse keeps the edited value (no state reset).
- Context line renders wallet/date/type for every focus case (R3).
- Batch, receipt, transfer, permission cases never route to focus.

Browser (Playwright, 390 + 360): routing, expand/collapse, save, save-failure retry.

Live: reuse `kaswise-simple-flow-live-smoke.cjs` with a fixture that forces one
doubtful category, asserting one transaction, correct balance and Home readback.

Device: keyboard does not cover the amount row; pickers open/cancel/confirm;
VoiceOver reads the summary line before the question rows.

## 10. How we will know it worked

Instrumented (cheap, local counters already possible):

- Share of text entries that reach focus review instead of full review.
- Median fields touched per review (target: 1).
- Abandonment rate on review (target: not worse than today).
- Wrong-wallet corrections (should stay flat — if it rises, R3 is failing).

## 11. Phases

- **P1 (shipped)** — focus banner naming unresolved fields + one-tap picker.
- **P2 (this change)** — routing classification plus local counters
  (`src/features/transaction-entry/review-metrics.ts`). The form still renders in
  full, so nothing the user sees changes and no validation path moves.
- **P3** — collapse resolved fields behind “Ubah detail” with the always-on
  context line, then auto-focus the single doubtful row.
- **P4** — read the counters, decide whether the full review stays the fallback
  for anything, and only then consider moving the save CTA above the fold.

## 12. Decisions — answered by the product owner (2026-10-21)

1. **Context line:** always shown, not only for doubtful fields. It is the guard
   against hidden mistakes (R3), so it is not optional in P3.
2. **Acknowledge affordance:** keep “Sudah benar”. No renaming.
3. **First release shape:** the form stays **fully expanded**. Collapsing moves to
   P3, after the counters from P2 give a baseline. This is why P2 touches no UI.
4. **Metrics:** required. Implemented in P2 as device-local, non-identifying
   counters — no amounts, categories, text or identifiers are stored.
