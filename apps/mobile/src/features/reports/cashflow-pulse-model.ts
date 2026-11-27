import { formatCompactCurrency } from "../../lib/currency";

export type CashflowChartData = {
  keys: string[];
  labels: string[];
  years: number[];
  startDates?: string[];
  endDates?: string[];
  /** Existing Reports aggregation expresses chart values in millions of rupiah. */
  income: number[];
  expense: number[];
};

export function finiteAmount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function fromMillions(value: number): number {
  const amount = finiteAmount(value) * 1_000_000;
  return Number.isFinite(amount) ? amount : Math.sign(value) * Number.MAX_VALUE;
}

export function formatCashflowAmount(value: number, language: string, currency = true): string {
	return formatCompactCurrency(value, language, currency);
}

export function buildCashflowPulseModel(data: CashflowChartData, plotHeight = 132) {
  const height = Math.max(0, finiteAmount(plotHeight));
  const buckets = data.labels.map((label, index) => ({
    key: data.keys[index] ?? `${label}-${data.years[index]}-${index}`,
    label,
    year: data.years[index],
    startDate: data.startDates?.[index],
    endDate: data.endDates?.[index],
    income: fromMillions(data.income[index] ?? 0),
    expense: fromMillions(data.expense[index] ?? 0),
  }));
  const max = Math.max(0, ...buckets.flatMap(({ income, expense }) => [income, expense]));
  const power = max > 0 ? 10 ** Math.floor(Math.log10(max)) : 1;
  const fraction = max / power;
  const nice = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  const ceiling = max === 0 ? 0 : Number.isFinite(nice) ? nice : max;
  const barHeight = (amount: number) => ceiling === 0 ? 0 : Math.max(0, amount / ceiling) * height;
  return {
    ceiling,
    empty: buckets.every(({ income, expense }) => income === 0 && expense === 0),
    ticks: ceiling === 0 ? [0] : [ceiling, ceiling / 2, 0],
    buckets: buckets.map((bucket) => ({
      ...bucket,
      net: finiteAmount(bucket.income - bucket.expense),
      incomeHeight: barHeight(bucket.income),
      expenseHeight: barHeight(bucket.expense),
    })),
  };
}
