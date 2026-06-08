import { planStatusLabel } from "../src/utils/plan-labels";

describe("planStatusLabel", () => {
  it('returns "Gratis" for null', () => {
    expect(planStatusLabel(null)).toBe("Gratis");
  });

  it('returns "Gratis" for free plan', () => {
    expect(planStatusLabel({ plan: "free" })).toBe("Gratis");
  });

  it('returns "Premium" for premium plan', () => {
    expect(planStatusLabel({ plan: "premium" })).toBe("Premium");
  });

  it('returns "Gratis" for unknown plan', () => {
    expect(planStatusLabel({ plan: "enterprise" } as any)).toBe("Gratis");
  });

  it('returns "Gratis" for empty object', () => {
    expect(planStatusLabel({})).toBe("Gratis");
  });
});
