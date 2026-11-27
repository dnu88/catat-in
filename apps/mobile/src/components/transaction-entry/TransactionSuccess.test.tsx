jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { fireEvent, render } from "@testing-library/react-native";

import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { TransactionSuccess } from "./TransactionSuccess";

function renderSuccess(
	overrides: Partial<Parameters<typeof TransactionSuccess>[0]> = {},
	handlers: { onCaptureAnother?: jest.Mock; onViewTransactions?: jest.Mock } = {},
) {
	const onCaptureAnother = handlers.onCaptureAnother ?? jest.fn();
	const onViewTransactions = handlers.onViewTransactions ?? jest.fn();
	const screen = render(
		<I18nProvider>
			<ThemeProvider>
				<TransactionSuccess
					destinationLabel="BCA"
					description="Kopi pagi"
					amount={1234567}
					count={1}
					onCaptureAnother={onCaptureAnother}
					onViewTransactions={onViewTransactions}
					{...overrides}
				/>
			</ThemeProvider>
		</I18nProvider>,
	);
	return { screen, onCaptureAnother, onViewTransactions };
}

describe("TransactionSuccess", () => {
	it("renders the destination and the id-ID formatted Rupiah amount", () => {
		const { screen } = renderSuccess();

		expect(screen.getByTestId("transaction-success-destination").props.children).toBe(
			"Tujuan: BCA",
		);
		expect(screen.getByTestId("transaction-success-amount").props.children).toBe(
			"Rp 1.234.567",
		);
		expect(screen.getByTestId("transaction-success-description").props.children).toBe(
			"Kopi pagi",
		);
	});

	it("shows the batch count only when more than one transaction was saved", () => {
		const single = renderSuccess({ count: 1 });
		expect(single.screen.queryByTestId("transaction-success-count")).toBeNull();
		single.screen.unmount();

		const batch = renderSuccess({ count: 3 });
		expect(batch.screen.getByTestId("transaction-success-count").props.children).toBe(
			"3 transaksi tercatat",
		);
	});

	it("fires the capture-another and view-transactions handlers", () => {
		const { screen, onCaptureAnother, onViewTransactions } = renderSuccess();

		fireEvent.press(screen.getByTestId("transaction-success-capture-another"));
		expect(onCaptureAnother).toHaveBeenCalledTimes(1);

		fireEvent.press(screen.getByTestId("transaction-success-view-transactions"));
		expect(onViewTransactions).toHaveBeenCalledTimes(1);
	});

	it("gives both actions a labelled button role", () => {
		const { screen } = renderSuccess();

		const primary = screen.getByTestId("transaction-success-capture-another");
		expect(primary.props.accessibilityRole).toBe("button");
		expect(primary.props.accessibilityLabel).toBe("Catat lagi");

		const secondary = screen.getByTestId("transaction-success-view-transactions");
		expect(secondary.props.accessibilityRole).toBe("button");
		expect(secondary.props.accessibilityLabel).toBe("Lihat transaksi");
	});
});
