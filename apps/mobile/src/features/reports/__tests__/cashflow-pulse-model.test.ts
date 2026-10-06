import { buildCashflowPulseModel, formatCashflowAmount } from "../cashflow-pulse-model";

function data(income: number[], expense: number[]) {
  return { income, expense, keys: income.map((_, i) => `2026-${i + 1}`), labels: income.map((_, i) => String(i)), years: income.map(() => 2026) };
}

test("normalizes millions once and keeps income/expense on the same nice scale without inflating tiny bars", () => {
  const model = buildCashflowPulseModel(data([100, 0.000001, 0], [50, 0.000002, 0]), 100);
  expect(model.ceiling).toBe(100000000);
  expect(model.ticks).toEqual([100000000, 50000000, 0]);
  expect(model.buckets[0]).toMatchObject({ income: 100000000, expense: 50000000, incomeHeight: 100, expenseHeight: 50 });
  expect(model.buckets[1]).toMatchObject({ income: 1, expense: 2 });
  expect(model.buckets[1].incomeHeight).toBeCloseTo(0.000001, 12);
  expect(model.buckets[1].expenseHeight).toBeCloseTo(model.buckets[1].incomeHeight * 2, 12);
  expect(model.buckets[2]).toMatchObject({ incomeHeight: 0, expenseHeight: 0 });
});

test("all-zero data retains every period with zero baseline and no decorative bar minimum", () => {
  const model = buildCashflowPulseModel(data(Array(6).fill(0), Array(6).fill(0)));
  expect(model.empty).toBe(true);
  expect(model.ceiling).toBe(0);
  expect(model.ticks).toEqual([0]);
  expect(model.buckets).toHaveLength(6);
  model.buckets.forEach(bucket => expect(bucket).toMatchObject({ incomeHeight: 0, expenseHeight: 0, net: 0 }));
});

test("very small data still fills the scale, and large/nonfinite inputs never produce invalid geometry", () => {
  const small = buildCashflowPulseModel(data([0.000001], [0.0000005]), 100);
  expect(small.buckets[0]).toMatchObject({ incomeHeight: 100, expenseHeight: 50 });
  const large = buildCashflowPulseModel(data([Number.MAX_VALUE, NaN, Infinity], [1e100, -Infinity, 0]));
  expect(Number.isFinite(large.ceiling)).toBe(true);
  for (const bucket of large.buckets) {
    for (const value of [bucket.income, bucket.expense, bucket.net, bucket.incomeHeight, bucket.expenseHeight]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  }
});

test.each([
  [-1250000, "id", "Rp -1,3 jt"], [-1250000, "en", "Rp -1.3 M"],
  [125000, "id", "Rp 125 rb"], [125000, "en", "Rp 125 K"],
  [0, "id", "Rp 0"], [1000000000, "id", "Rp 1 M"],
  [1000000000, "en", "Rp 1 B"], [NaN, "en", "Rp 0"],
])("formats signed compact values %s in %s", (value, language, expected) => {
  expect(formatCashflowAmount(value as number, language as string)).toBe(expected);
});
