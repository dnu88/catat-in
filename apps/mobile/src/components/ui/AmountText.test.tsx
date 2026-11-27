import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { financeEditorial as fe } from "../../theme/finance-editorial";
import { AmountText } from "./AmountText";

function flatStyle(node: { props: { style?: unknown } }) {
	return StyleSheet.flatten(node.props.style) as Record<string, unknown>;
}

describe("AmountText (B1 — G03)", () => {
	it("uses tabular digits so amount columns line up", () => {
		const screen = render(<AmountText value="- Rp 35.000" role="expense" />);
		const style = flatStyle(screen.getByText("- Rp 35.000"));

		expect(style.fontVariant).toEqual(["tabular-nums"]);
	});

	it("takes income/expense/transfer/adverse/total colors from the palette", () => {
		const cases = [
			["income", fe.financialIncome],
			["expense", fe.financialExpense],
			["transfer", fe.financialTransfer],
			["adverse", fe.financialExpenseAlert],
			["total", fe.financialTotal],
		] as const;

		for (const [role, color] of cases) {
			const screen = render(<AmountText value="Rp 1.000" role={role} />);
			expect(flatStyle(screen.getByText("Rp 1.000")).color).toBe(color);
			screen.unmount();
		}
	});

	it("uses a neutral muted color when the figure is not a money fact", () => {
		const screen = render(<AmountText value="—" role="neutral" />);

		expect(flatStyle(screen.getByText("—")).color).toBe(fe.slate);
	});

	it("renders the row role at the row amount size by default and tabular", () => {
		const screen = render(<AmountText value="Rp 10.000" role="expense" />);
		const style = flatStyle(screen.getByText("Rp 10.000"));

		expect(style.fontSize).toBe(14);
		expect(style.fontWeight).toBe("700");
	});

	it.each([
		["statAmount", 22],
		["heroAmount", 28],
	] as const)("renders the %s role at %dpx", (textRole, size) => {
		const screen = render(
			<AmountText value="Rp 10.000" role="expense" textRole={textRole} />,
		);

		expect(flatStyle(screen.getByText("Rp 10.000")).fontSize).toBe(size);
	});

	it("forwards testID and keeps caller style overrides last", () => {
		const screen = render(
			<AmountText
				value="Rp 10.000"
				role="expense"
				testID="transaction-amount-tx-1"
				style={{ textAlign: "right", marginRight: 8 }}
			/>,
		);
		const node = screen.getByTestId("transaction-amount-tx-1");
		const style = flatStyle(node);

		expect(style.textAlign).toBe("right");
		expect(style.marginRight).toBe(8);
		expect(style.fontVariant).toEqual(["tabular-nums"]);
	});

	it("stays readable for screen readers and long amounts", () => {
		const screen = render(
			<AmountText
				value="- Rp 1.234.567.890"
				role="expense"
				numberOfLines={1}
				accessibilityLabel="Pengeluaran 1.234.567.890 rupiah"
			/>,
		);
		const node = screen.getByText("- Rp 1.234.567.890");

		expect(node.props.numberOfLines).toBe(1);
		expect(node.props.accessibilityLabel).toBe(
			"Pengeluaran 1.234.567.890 rupiah",
		);
	});
});
