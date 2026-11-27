/**
 * T24 (simple premium) — Reports period/date picker disclosure.
 *
 * Presentation only: the report maths, the AI insight call count and the
 * income/expense aggregation are untouched. Premium collapses the date/filter
 * chip row behind a picker so the page leads with a single main summary.
 */

export function showsPeriodChips(premium: boolean, open: boolean): boolean {
  return !premium || open;
}
