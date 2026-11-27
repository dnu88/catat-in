import {
  filterToggleLabel,
  shouldShowFilterScroller,
  showsStandaloneBillsChip,
  showsStandaloneReviewChip,
  type TransactionFilter,
} from "../filter-disclosure";

/**
 * T22 (simple premium) — the Transactions filter row must collapse behind a
 * disclosure so the list stays calm, while the REVIEW affordance stays visible
 * because it is a status, not a preference. Legacy (flag OFF) is unchanged:
 * the scroller is always shown and the review chip lives inside it.
 *
 * T27 follow-up: the BILLS chip also stays visible while collapsed (it
 * navigates away, so hiding it removed an existing affordance).
 */
describe("transactions filter disclosure", () => {
  describe("showsStandaloneBillsChip", () => {
    it("keeps the Bills chip visible while the filters are collapsed", () => {
      expect(showsStandaloneBillsChip(true, false)).toBe(true);
    });

    it("hides the standalone chip once the scroller is open (no duplicate)", () => {
      expect(showsStandaloneBillsChip(true, true)).toBe(false);
    });

    it("stays inside the legacy scroller when the flag is OFF", () => {
      expect(showsStandaloneBillsChip(false, false)).toBe(false);
      expect(showsStandaloneBillsChip(false, true)).toBe(false);
    });
  });

  describe("shouldShowFilterScroller", () => {
    it("keeps the scroller always visible when the flag is OFF", () => {
      expect(shouldShowFilterScroller(false, false)).toBe(true);
      expect(shouldShowFilterScroller(false, true)).toBe(true);
    });

    it("hides the scroller behind the disclosure when the flag is ON", () => {
      expect(shouldShowFilterScroller(true, false)).toBe(false);
    });

    it("shows the scroller once the disclosure is open", () => {
      expect(shouldShowFilterScroller(true, true)).toBe(true);
    });
  });

  describe("showsStandaloneReviewChip", () => {
    it("never duplicates the chip in legacy mode (it stays inside the scroller)", () => {
      expect(showsStandaloneReviewChip(false, false)).toBe(false);
      expect(showsStandaloneReviewChip(false, true)).toBe(false);
    });

    it("keeps the review affordance visible while the disclosure is collapsed", () => {
      expect(showsStandaloneReviewChip(true, false)).toBe(true);
    });

    it("lets the scroller own the chip once the disclosure is open", () => {
      expect(showsStandaloneReviewChip(true, true)).toBe(false);
    });
  });

  describe("filterToggleLabel", () => {
    const cases: Array<[TransactionFilter, string, string]> = [
      ["all", "Semua", "All"],
      ["income", "Pemasukan", "Income"],
      ["expense", "Pengeluaran", "Expense"],
      ["review", "Perlu dicek", "Needs review"],
    ];

    it.each(cases)("labels %s for both languages", (filter, id, en) => {
      expect(filterToggleLabel(filter, false)).toBe(id);
      expect(filterToggleLabel(filter, true)).toBe(en);
    });
  });
});
