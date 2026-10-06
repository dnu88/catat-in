import { render, screen } from "@testing-library/react-native";

import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { TransactionSuccess } from "./TransactionSuccess";

/**
 * T16 — the success surface must show enough for the user to confirm what was
 * recorded (amount, category, destination) and offer one clear next action.
 */

function renderSuccess(category?: string | null) {
	render(
		<I18nProvider>
			<ThemeProvider>
				<TransactionSuccess
					destinationLabel="BCA"
					description="Beli kopi"
					amount={35000}
					count={1}
					category={category}
					onCaptureAnother={jest.fn()}
					onViewTransactions={jest.fn()}
				/>
			</ThemeProvider>
		</I18nProvider>,
	);
}

describe("TransactionSuccess — confirmation detail", () => {
	it("shows amount, category and destination, plus one primary next action", () => {
		renderSuccess("Makan & Minum");

		expect(screen.getByTestId("transaction-success-amount").props.children).toBe(
			"Rp 35.000",
		);
		expect(screen.getByTestId("transaction-success-category").props.children).toBe(
			"Kategori: Makan & Minum",
		);
		expect(
			screen.getByTestId("transaction-success-destination").props.children,
		).toBe("Tujuan: BCA");

		// Exactly one primary continuation, with viewing as the secondary route.
		expect(screen.getAllByTestId("transaction-success-capture-another")).toHaveLength(1);
		expect(screen.getAllByTestId("transaction-success-view-transactions")).toHaveLength(1);
	});

	it("omits the category line when the transaction has none", () => {
		renderSuccess(null);

		expect(screen.queryByTestId("transaction-success-category")).toBeNull();
		// The rest of the confirmation is unaffected.
		expect(screen.getByTestId("transaction-success-amount")).toBeTruthy();
		expect(screen.getByTestId("transaction-success-destination")).toBeTruthy();
	});
});
