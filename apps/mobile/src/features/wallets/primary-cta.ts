/**
 * T23 (simple premium) — Wallets add-CTA rule.
 *
 * The screen renders two add-wallet controls that do the same thing whenever
 * `simpleNavigation` is ON: the prominent body CTA (`wallets-add-cta`) and the
 * header toggle (`wallets-create-toggle`). Premium keeps exactly one.
 *
 * Safety: when `simpleNavigation` is OFF the body CTA does not exist, so the
 * header toggle is the only way to add a wallet and must never be hidden.
 *
 * Legacy (premium OFF) is unchanged, including the duplication.
 */

export function showsHeaderCreateToggle(premium: boolean, simple: boolean): boolean {
  return !premium || !simple;
}
