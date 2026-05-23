import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import TransactionNewScreen from "../app/(tabs)/transaction-new";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockReplace = jest.fn();
const mockGetTransaction = jest.fn();
const mockUpdateTransaction = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
	useLocalSearchParams: () => ({ transactionId: "tx-1" }),
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn(async () => [{ id: "wallet-1", name: "BCA" }]),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => [
		{ id: "cat-1", name: "Makan", icon: "chart" },
	]),
}));

jest.mock("../src/services/transactions", () => ({
	createTransaction: jest.fn(),
	getTransaction: (...args: unknown[]) => mockGetTransaction(...args),
	updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
}));

describe("transaction-new edit mode", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetTransaction.mockResolvedValue({
			id: "tx-1",
			wallet_id: "wallet-1",
			transaction_type: "expense",
			amount: 35000,
			category: "Makan",
			description: "Kopi sore",
			merchant: "Kopi Kenangan",
			date: "2026-05-20",
			note: "Less sugar",
		});
		mockUpdateTransaction.mockResolvedValue({ id: "tx-1" });
	});

	it("loads the selected transaction and saves edits", async () => {
		const alertSpy = jest.spyOn(Alert, "alert");
		const screen = render(
			<ThemeProvider>
				<I18nProvider>
					<TransactionNewScreen />
				</I18nProvider>
			</ThemeProvider>,
		);

		await waitFor(() =>
			expect(mockGetTransaction).toHaveBeenCalledWith("tx-1"),
		);
		expect(await screen.findByDisplayValue("Kopi sore")).toBeTruthy();
		expect(screen.getByText("Simpan Perubahan")).toBeTruthy();

		fireEvent.changeText(
			screen.getByLabelText("Deskripsi transaksi"),
			"Kopi pagi",
		);
		fireEvent.press(screen.getByLabelText("Simpan perubahan transaksi"));

		await waitFor(() =>
			expect(mockUpdateTransaction).toHaveBeenCalledWith(
				"tx-1",
				expect.objectContaining({ description: "Kopi pagi", amount: 35000 }),
			),
		);
		expect(alertSpy).toHaveBeenCalledWith(
			"Berhasil",
			"Transaksi diperbarui.",
			expect.any(Array),
		);
	});
});
