jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { TransactionDraft } from "../../features/transaction-entry/draft";
import { createDraft, localToday } from "../../features/transaction-entry/draft";
import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { TransactionFields } from "./TransactionFields";

const WALLETS = [
	{ id: "w1", name: "BCA" },
	{ id: "w2", name: "Mandiri", is_active: true },
];

const CATEGORIES = [{ name: "Makan" }, { name: "Transport" }];

type Overrides = {
	canCreate?: boolean;
	errors?: Parameters<typeof TransactionFields>[0]["errors"];
	onChange?: jest.Mock;
	onOpenPicker?: jest.Mock;
};

function makeDraft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return createDraft({
		source: "manual",
		amount: 25000,
		category: "Makan",
		walletId: "w1",
		date: localToday(),
		...overrides,
	});
}

function makeElement(draft: TransactionDraft, overrides: Overrides = {}) {
	return (
		<TransactionFields
			draft={draft}
			onChange={overrides.onChange ?? jest.fn()}
			wallets={WALLETS}
			categories={CATEGORIES}
			canCreate={overrides.canCreate ?? true}
			onOpenPicker={overrides.onOpenPicker ?? jest.fn()}
			errors={overrides.errors}
			testID="tf"
		/>
	);
}

function renderFields(draft: TransactionDraft, overrides: Overrides = {}) {
	const onChange = overrides.onChange ?? jest.fn();
	const onOpenPicker = overrides.onOpenPicker ?? jest.fn();
	const screen = render(
		<I18nProvider>
			<ThemeProvider>{makeElement(draft, { ...overrides, onChange, onOpenPicker })}</ThemeProvider>
		</I18nProvider>,
	);
	return { screen, onChange, onOpenPicker };
}

describe("TransactionFields", () => {
	it("emits a numeric amount when the user types digits", () => {
		const { screen, onChange } = renderFields(makeDraft({ amount: null }));

		fireEvent.changeText(screen.getByTestId("tf-amount"), "25000");

		expect(onChange).toHaveBeenCalledWith({ amount: 25000 });
	});

	it("surfaces the amount error label next to the field as an alert", () => {
		const { screen } = renderFields(makeDraft({ amount: null }), {
			errors: { amount: "INVALID_AMOUNT" },
		});

		const error = screen.getByTestId("tf-amount-error");

		expect(error.props.accessibilityRole).toBe("alert");
		expect(error.props.children).toBe("Masukkan nominal lebih dari nol.");
	});

	it("hides the category row and shows the destination wallet row for a transfer", () => {
		const { screen, onChange, onOpenPicker } = renderFields(makeDraft());
		const transferDraft = makeDraft({
			transactionType: "transfer",
			targetWalletId: "w2",
		});

		expect(screen.queryByTestId("tf-category")).toBeTruthy();
		expect(screen.queryByTestId("tf-target-wallet")).toBeNull();

		screen.rerender(
			<I18nProvider>
				<ThemeProvider>
					{makeElement(transferDraft, { onChange, onOpenPicker })}
				</ThemeProvider>
			</I18nProvider>,
		);

		expect(screen.queryByTestId("tf-category")).toBeNull();
		expect(screen.getByTestId("tf-target-wallet")).toBeTruthy();
	});

	it("keeps merchant and description collapsed until the detail section expands", () => {
		const { screen } = renderFields(makeDraft({ merchant: "Warung Bu Tini" }));

		expect(screen.queryByTestId("tf-merchant")).toBeNull();
		expect(screen.queryByTestId("tf-description")).toBeNull();

		const toggle = screen.getByTestId("tf-detail-toggle");
		expect(toggle.props.accessibilityState).toEqual(
			expect.objectContaining({ expanded: false }),
		);

		fireEvent.press(toggle);

		expect(screen.getByTestId("tf-merchant")).toBeTruthy();
		expect(screen.getByTestId("tf-description")).toBeTruthy();
		expect(
			screen.getByTestId("tf-detail-toggle").props.accessibilityState,
		).toEqual(expect.objectContaining({ expanded: true }));
	});

	it("disables the submit-relevant controls for a view-only user", () => {
		const { screen } = renderFields(makeDraft(), { canCreate: false });

		expect(screen.getByTestId("tf-amount").props.editable).toBe(false);
		expect(screen.getByTestId("tf-amount").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: true }),
		);
		for (const type of ["expense", "income", "transfer"]) {
			expect(
				screen.getByTestId(`tf-type-${type}`).props.accessibilityState,
			).toEqual(expect.objectContaining({ disabled: true }));
		}
		expect(screen.getByTestId("tf-category").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: true }),
		);
		expect(screen.getByTestId("tf-wallet").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: true }),
		);
		expect(screen.getByTestId("tf-date").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: true }),
		);
		expect(screen.getByTestId("tf-permission-error")).toBeTruthy();
	});

	it("keeps every pressable row at least 44 points tall", () => {
		const { screen } = renderFields(makeDraft());

		for (const testID of ["tf-category", "tf-wallet", "tf-date", "tf-detail-toggle"]) {
			const style = StyleSheet.flatten(screen.getByTestId(testID).props.style);
			expect(style.minHeight).toBeGreaterThanOrEqual(44);
		}
	});

	it("opens the matching picker for the category, wallet and date rows", () => {
		const { screen, onOpenPicker } = renderFields(makeDraft());

		fireEvent.press(screen.getByTestId("tf-category"));
		expect(onOpenPicker).toHaveBeenLastCalledWith("category");

		fireEvent.press(screen.getByTestId("tf-wallet"));
		expect(onOpenPicker).toHaveBeenLastCalledWith("wallet");

		fireEvent.press(screen.getByTestId("tf-date"));
		expect(onOpenPicker).toHaveBeenLastCalledWith("date");
	});

	it("marks the selected transaction type as selected", () => {
		const { screen } = renderFields(makeDraft({ transactionType: "income" }));

		expect(screen.getByTestId("tf-type-income").props.accessibilityState).toEqual(
			expect.objectContaining({ selected: true }),
		);
		expect(screen.getByTestId("tf-type-expense").props.accessibilityState).toEqual(
			expect.objectContaining({ selected: false }),
		);
	});
});
