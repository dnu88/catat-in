import { showsPeriodChips } from "../period-disclosure";

/**
 * T24 (simple premium) — Reports keeps ONE main summary and moves the
 * date/filter chips into a picker. Report maths must not change: this helper
 * only decides whether the chip row is painted.
 */
describe("reports period disclosure", () => {
  it("keeps the chip row always visible in legacy mode", () => {
    expect(showsPeriodChips(false, false)).toBe(true);
    expect(showsPeriodChips(false, true)).toBe(true);
  });

  it("collapses the chip row behind the picker when premium is ON", () => {
    expect(showsPeriodChips(true, false)).toBe(false);
  });

  it("reveals the chip row once the picker is open", () => {
    expect(showsPeriodChips(true, true)).toBe(true);
  });
});
