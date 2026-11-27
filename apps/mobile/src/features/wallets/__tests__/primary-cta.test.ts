import { showsHeaderCreateToggle } from "../primary-cta";

/**
 * T23 (simple premium) — Wallets must expose exactly ONE add-wallet CTA.
 *
 * Legacy reality: with `simpleNavigation` ON the screen renders two CTAs that do
 * the same thing (`wallets-add-cta` in the body and `wallets-create-toggle` in
 * the header). Flag OFF must keep that untouched; flag ON keeps the prominent
 * body CTA and drops the duplicate header toggle. When `simpleNavigation` is
 * OFF the header toggle is the only CTA, so it must never be hidden.
 *
 * T27 follow-up: the old `addCtaCount` helper had no production consumer (only
 * this suite), so it was removed instead of leaving drift-prone dead code. The
 * "exactly one CTA" invariant is asserted against the real DOM in
 * `tests/experience/wallets-reports-premium.spec.ts` (`addCtaCount: 1`).
 */
describe("wallets primary add CTA", () => {
  describe("showsHeaderCreateToggle", () => {
    it("keeps legacy behaviour when the premium flag is OFF", () => {
      expect(showsHeaderCreateToggle(false, true)).toBe(true);
      expect(showsHeaderCreateToggle(false, false)).toBe(true);
    });

    it("drops the duplicate header toggle when premium AND the body CTA exists", () => {
      expect(showsHeaderCreateToggle(true, true)).toBe(false);
    });

    it("never hides the only add CTA when simpleNavigation is OFF", () => {
      expect(showsHeaderCreateToggle(true, false)).toBe(true);
    });

    it("resolves to exactly one CTA in every premium combination", () => {
      const count = (premium: boolean, simple: boolean) =>
        (simple ? 1 : 0) + (showsHeaderCreateToggle(premium, simple) ? 1 : 0);

      expect(count(true, true)).toBe(1);
      expect(count(true, false)).toBe(1);
      // legacy keeps its duplication — asserted so the flag stays meaningful
      expect(count(false, true)).toBe(2);
      expect(count(false, false)).toBe(1);
    });
  });
});
