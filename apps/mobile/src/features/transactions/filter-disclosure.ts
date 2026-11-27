/**
 * T22 (simple premium) — Transactions filter disclosure.
 *
 * Presentation-only helpers so the screen stays a thin consumer and the
 * behaviour is unit-testable without rendering a 36 KB screen component.
 *
 * Rules:
 * - flag OFF: byte-for-byte the legacy layout (scroller always visible, the
 *   review chip lives inside the scroller).
 * - flag ON: the preference filters collapse behind a disclosure, but the
 *   REVIEW affordance and the BILLS navigation affordance stay visible while
 *   collapsed because neither is a preference: one is a status, the other
 *   navigates away. Only Semua/Pemasukan/Pengeluaran are hidden.
 */

export type TransactionFilter = "all" | "income" | "expense" | "review";

export function shouldShowFilterScroller(
  premium: boolean,
  disclosureOpen: boolean,
): boolean {
  return !premium || disclosureOpen;
}

export function showsStandaloneReviewChip(
  premium: boolean,
  disclosureOpen: boolean,
): boolean {
  return premium && !disclosureOpen;
}

/**
 * T27 follow-up (reviewer finding): the Bills chip navigates to another screen,
 * so collapsing it with the preference filters silently removed an existing
 * affordance. It now stays visible in the collapsed state too.
 */
export function showsStandaloneBillsChip(
  premium: boolean,
  disclosureOpen: boolean,
): boolean {
  return premium && !disclosureOpen;
}

export function filterToggleLabel(filter: TransactionFilter, isEn: boolean): string {
  if (isEn) {
    if (filter === "income") return "Income";
    if (filter === "expense") return "Expense";
    if (filter === "review") return "Needs review";
    return "All";
  }
  if (filter === "income") return "Pemasukan";
  if (filter === "expense") return "Pengeluaran";
  if (filter === "review") return "Perlu dicek";
  return "Semua";
}
