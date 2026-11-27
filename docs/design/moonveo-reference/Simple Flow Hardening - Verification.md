# Simple Flow Hardening — candidate verification

## Scope and state

Candidate branch `fix/simple-flow-audit`, based on `ef7d7fe85a9cfe7eb8a960519ab0af886fadbd9d`. No commit, push, deployment, database migration or production data mutation performed. Existing Capture, Home wallet stack and Finance Editorial identity retained. Source and tests are in this isolated candidate, not the production checkout.

## Implemented deltas

1. Autosave Edit opens the existing transaction editor with the saved transaction ID, instead of reopening a create draft. Browser regression performs actual reachable Edit click, changes amount, saves, and asserts PATCH against original ID with exactly one initial create RPC.
2. Premium batch review exposes explicit per-field warning acknowledgement. Invalid drafts, unrelated uncertainty, permissions and receipt discrepancies continue to block saving.
3. Premium receipt review total/split has a single save action, rather than review save plus supplemental receipt confirm.
4. Premium autosave notice is offset above safe area and floating navigation; real pointer clicks pass.
5. Premium Home distinguishes loading/initial failure from first-use, shows unknown values as dashes, supports retry, retains last loaded figures with stale-error feedback, masks old finance scope and guards late responses. Auxiliary budgets no longer block core finances; failed allocations do not imply zero spending.
6. Transfer Recent entries use unsigned blue amounts and Transfer label; premium period reset targets are at least 44px.
7. Premium Reports has one expandable period section retaining reset/saved-rule/custom controls; header follows selected period. Legacy period card remains when premium is OFF.

## Executed verification

- Full Jest: **117 suites passed, 0 failed; 1076 tests passed, 9 skipped, 1085 total; success=true**. Parsed machine-readable output rather than inferred from console warnings.
- TypeScript `tsc --noEmit`: exit 0, no errors.
- Expo PWA export: exit 0; candidate bundle `entry-4656fac15869eaca017edc312acbd362.js`; 22 route fallbacks generated.
- Bundle gate: all 43 required markers present. Registry valid: 13 features / 43 markers.
- Browser Chromium, 390px: **39 passed** across audit-flow-hardening, Home CTA, Capture, manual Back, Settings grouping and Reports state/continuation cases.
- Additional browser Chromium at 360px and 430px: **6 passed** (autosave original-ID update, Home error/retry and period disclosure at each width).
- `git diff --check`: exit 0.
- Original production checkout remained clean.

## Regression evidence and repaired gate failures

Baseline browser revealed duplicate premium active-period card and autosave Edit pointer blocked by bottom navigation. Candidate resolves both; no forced click used. Original unit reproduction showed a second create-path call after autosave Edit/Save; final browser test asserts original-ID update instead.

Initial full gate failed because one older Capture test harness lacked a safe-area mock and two newly added Home tests needed explicit async interaction/readiness synchronization. Fixed test context and awaited async act/positive ready state; final complete suite passed. Candidate dependency symlinks were replaced with a frozen dependency installation to avoid Metro realpath resolution failure. No lockfile change.

## Boundaries / deferred

Browser persistence and AI responses use explicit isolated fixtures. This is not a fresh authenticated production DB/provider/device smoke and must not be reported as deployed or live-verified. Physical iPhone keyboard/motion and independent visual screenshot assessment remain unverified for this candidate. Broader visual redesign, asking only the missing field instead of full review, and undo-failure feedback are not implemented in this scoped hardening. Deployment still requires user approval and production-specific build/runtime configuration plus rollback preparation.
