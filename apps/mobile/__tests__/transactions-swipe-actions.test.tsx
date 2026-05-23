import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";

import TransactionsScreen from "../app/(tabs)/transactions";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockPush = jest.fn();
const mockListTransactions = jest.fn();
const mockDeleteTransaction = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));

jest.mock("../src/services/transactions", () => ({
	listTransactions: (...args: unknown[]) => mockListTransactions(...args),
	deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
}));

const mockTransactions = [
	{
		id: "tx-1",
		user_id: "user-1",
		wallet_id: "wallet-1",
		transaction_type: "expense",
		type: "expense",
		nominal: 35000,
		amount: 35000,
		kategori: "Makan",
		category: "Makan",
		catatan: "Kopi sore",
		description: "Kopi sore",
		merchant: "Kopi Kenangan",
		tanggal: "2026-05-20",
		date: "2026-05-20",
		note: null,
		payment_method: null,
		receipt_url: null,
		group_id: null,
		is_shared: false,
		visibility: null,
		ai_confidence: null,
		ai_extracted: null,
		household_id: null,
		created_by: "user-1",
		on_behalf_of: null,
		is_disputed: false,
		dispute_resolved_at: null,
		created_at: "2026-05-20T10:00:00Z",
		updated_at: "2026-05-20T10:00:00Z",
	},
];

function renderScreen() {
	return render(
		<ThemeProvider>
			<I18nProvider>
				<TransactionsScreen />
			</I18nProvider>
		</ThemeProvider>,
	);
}

describe("transaction swipe actions", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockListTransactions.mockResolvedValue(mockTransactions);
		mockDeleteTransaction.mockResolvedValue(undefined);
	});

	it("keeps the floating add button above the roomier bottom tab", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		const fabStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-fab").props.style as object,
		) as ViewStyle;
		expect(fabStyle.bottom).toBeGreaterThanOrEqual(104);
	});

	it("shows edit and delete actions for each transaction row", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		expect(screen.getByLabelText("Edit transaksi Kopi sore")).toBeTruthy();
		expect(screen.getByLabelText("Hapus transaksi Kopi sore")).toBeTruthy();
	});

	it("keeps swipe actions smooth, rounded, and finger-friendly", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		const shellStyle = StyleSheet.flatten(
			screen.getByTestId("transaction-swipe-shell-tx-1").props.style as object,
		) as ViewStyle;
		const actionRailStyle = StyleSheet.flatten(
			screen.getByTestId("transaction-swipe-actions-tx-1").props
				.style as object,
		) as ViewStyle;
		const editButtonStyle = StyleSheet.flatten(
			screen.getByLabelText("Edit transaksi Kopi sore").props.style as object,
		) as ViewStyle;

		expect(shellStyle.overflow).toBe("hidden");
		expect(shellStyle.borderRadius).toBeGreaterThanOrEqual(14);
		expect(actionRailStyle.width).toBeGreaterThanOrEqual(160);
		expect(
			editButtonStyle.minHeight ?? editButtonStyle.height,
		).toBeGreaterThanOrEqual(44);
	});

	it("opens transaction-new in edit mode from the row action", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());
		fireEvent.press(screen.getByLabelText("Edit transaksi Kopi sore"));

		expect(mockPush).toHaveBeenCalledWith(
			"/(tabs)/transaction-new?transactionId=tx-1",
		);
	});

	it("confirms and deletes the selected transaction", async () => {
		const alertSpy = jest.spyOn(Alert, "alert");
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());
		fireEvent.press(screen.getByLabelText("Hapus transaksi Kopi sore"));

		expect(alertSpy).toHaveBeenCalledWith(
			"Hapus transaksi?",
			"Transaksi Kopi sore akan dihapus permanen.",
			expect.any(Array),
		);

		const buttons = alertSpy.mock.calls[0][2] as Array<{
			text: string;
			onPress?: () => void;
		}>;
		buttons.find((button) => button.text === "Hapus")?.onPress?.();

		await waitFor(() =>
			expect(mockDeleteTransaction).toHaveBeenCalledWith("tx-1"),
		);
		expect(mockListTransactions).toHaveBeenCalledTimes(2);
	});
});
