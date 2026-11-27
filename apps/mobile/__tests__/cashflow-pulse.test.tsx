import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { financeEditorial as fe } from "../src/theme/finance-editorial";
import { CashflowPulse } from "../src/features/reports/CashflowPulse";

const data = {
  keys: ["2026-06", "2026-07"], labels: ["Jun", "Jul"], years: [2026, 2026],
  income: [2, 1], expense: [1, 3],
};
const props = { data, summaryIncome: 9000000, summaryExpense: 2000000,
  periodLabel: "Periode terpilih", scopeKey: "personal:6month", language: "id" as const };

test("shows scoped net independently of bucket totals, selects month detail below chart and toggles off", () => {
  const ui = render(<CashflowPulse {...props} />);
  expect(ui.getByTestId("reports-pulse-net-amount")).toHaveTextContent("Rp 7 jt");
  expect(ui.getByText("Surplus")).toBeTruthy();
  fireEvent.press(ui.getByTestId("reports-pulse-column-1"));
  expect(ui.getByTestId("reports-pulse-detail")).toHaveTextContent(/Jul 2026/);
  expect(ui.getByTestId("reports-pulse-detail-income")).toHaveTextContent("Rp 1 jt");
  expect(ui.getByTestId("reports-pulse-detail-expense")).toHaveTextContent("Rp 3 jt");
  expect(ui.getByTestId("reports-pulse-detail-net")).toHaveTextContent("Rp -2 jt");
  expect(ui.getByTestId("reports-pulse-net-amount")).toHaveTextContent("Rp 7 jt");
  fireEvent.press(ui.getByTestId("reports-pulse-column-1"));
  expect(ui.queryByTestId("reports-pulse-detail")).toBeNull();
});

test("clears stale selection on finance context, period or bucket changes", () => {
  const ui = render(<CashflowPulse {...props} />);
  fireEvent.press(ui.getByTestId("reports-pulse-column-1"));
  ui.rerender(<CashflowPulse {...props} scopeKey="household-1:6month" />);
  expect(ui.queryByTestId("reports-pulse-detail")).toBeNull();
  fireEvent.press(ui.getByTestId("reports-pulse-column-1"));
  ui.rerender(<CashflowPulse {...props} scopeKey="household-1:month" />);
  expect(ui.queryByTestId("reports-pulse-detail")).toBeNull();
  fireEvent.press(ui.getByTestId("reports-pulse-column-1"));
  ui.rerender(<CashflowPulse {...props} scopeKey="household-1:month" data={{ ...data, keys: ["2025-06", "2025-07"] }} />);
  expect(ui.queryByTestId("reports-pulse-detail")).toBeNull();
});

test("uses charcoal expense and muted red only for deficit; weekly labels include month and year", () => {
  const ui = render(<CashflowPulse {...props} summaryIncome={1} summaryExpense={2}
    data={{ ...data, keys: ["2026-06-01", "2026-07-08"], labels: ["1–7", "8–14"] }} />);
  expect(ui.getByText("Defisit")).toBeTruthy();
  expect(StyleSheet.flatten(ui.getByTestId("reports-pulse-net-amount").props.style).color).toBe(fe.financialExpenseAlert);
  const bar = StyleSheet.flatten(ui.getByTestId("reports-pulse-bar-expense-1").props.style);
  expect(bar.backgroundColor).toBe(fe.financialExpense);
  expect(bar.shadowRadius).toBeUndefined();
  fireEvent.press(ui.getByTestId("reports-pulse-column-1"));
  expect(ui.getByTestId("reports-pulse-detail")).toHaveTextContent(/8–14 Jul 2026/);
  expect(StyleSheet.flatten(ui.getByTestId("reports-pulse-detail").props.style).position).not.toBe("absolute");
});

test("English accessibility describes actual amounts, selected state and localized details", () => {
  const ui = render(<CashflowPulse {...props} language="en" />);
  const month = ui.getByRole("button", { name: /Jul 2026.*Income: Rp 1 M.*Expense: Rp 3 M.*Net cash flow: Rp -2 M/ });
  expect(month.props.accessibilityState.selected).toBe(false);
  fireEvent.press(month);
  expect(ui.getByTestId("reports-pulse-column-1").props.accessibilityState.selected).toBe(true);
  expect(ui.getByTestId("reports-pulse-detail")).toHaveTextContent(/Period detail/);
  expect(ui.getByTestId("reports-pulse-detail-net")).toHaveTextContent("Rp -2 M");
});

test.each([3, 6, 12, 18])("retains %i buckets with full-column touch targets and contained chart scrolling", (count) => {
  const expanded = {
    keys: Array.from({ length: count }, (_, i) => `period-${i}`), labels: Array(count).fill("Jul"),
    years: Array(count).fill(2026), income: Array(count).fill(0), expense: Array(count).fill(0),
  };
  const ui = render(<CashflowPulse {...props} data={expanded} summaryIncome={0} summaryExpense={0} />);
  expect(ui.getAllByTestId(/reports-pulse-column-/)).toHaveLength(count);
  expect(ui.getByText("Belum ada aktivitas")).toBeTruthy();
  expect(ui.queryByText("Seimbang")).toBeNull();
  expect(ui.getByTestId("reports-pulse-net-amount")).toHaveTextContent("Rp 0");
  expect(ui.getByTestId("reports-pulse-empty")).toBeTruthy();
  for (const column of ui.getAllByTestId(/reports-pulse-column-/)) {
    expect(StyleSheet.flatten(column.props.style).minWidth).toBe(44);
  }
  for (const bar of ui.getAllByTestId(/reports-pulse-bar-(income|expense)-/)) {
    expect(StyleSheet.flatten(bar.props.style).height).toBe(0);
  }
  expect(ui.getByTestId("reports-pulse-plot-scroll").props.horizontal).toBe(true);
});

test("custom day ranges crossing months expose unambiguous dates", () => {
  const ui = render(<CashflowPulse {...props} data={{ ...data,
    keys: ["2026-06-28", "2026-07-05"], labels: ["28–4", "5–11"],
    startDates: ["2026-06-28", "2026-07-05"], endDates: ["2026-07-04", "2026-07-11"],
  }} />);
  fireEvent.press(ui.getByTestId("reports-pulse-column-0"));
  expect(ui.getByTestId("reports-pulse-detail")).toHaveTextContent(/28 Jun 2026.*4 Jul 2026/);
});

test("nonempty equal income and expense is balanced, not an empty state", () => {
  const ui = render(<CashflowPulse {...props} summaryIncome={100} summaryExpense={100} />);
  expect(ui.getByText("Seimbang")).toBeTruthy();
  expect(ui.queryByText("Belum ada aktivitas")).toBeNull();
});
