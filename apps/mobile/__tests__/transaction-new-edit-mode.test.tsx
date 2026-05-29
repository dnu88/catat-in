import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import TransactionNewScreen from "../app/(tabs)/transaction-new";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockReplace = jest.fn();
const mockGetTransaction = jest.fn();
const mockCreateTransaction = jest.fn();
const mockUpdateTransaction = jest.fn();
const mockListWallets = jest.fn();
let mockSearchParams: Record<string, string> = { transactionId: "tx-1" };
let mockActiveContext:
	| { type: "personal" }
	| {
			type: "household";
			householdId: string;
			role: "admin" | "member" | "viewer";
	  } = {
	type: "personal",
};
let mockCanCreate = true;

jest.mock("expo-router", () => ({
	useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
	useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: (...args: unknown[]) => mockListWallets(...args),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => [
		{ id: "cat-1", name: "Makan", icon: "chart" },
	]),
}));

jest.mock("../src/services/transactions", () => ({
	createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
	getTransaction: (...args: unknown[]) => mockGetTransaction(...args),
	updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: mockCanCreate,
	}),
}));

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function renderTransactionNewTree() {
	return (
		<ThemeProvider>
			<I18nProvider>
				<TransactionNewScreen />
			</I18nProvider>
		</ThemeProvider>
	);
}

function renderScreen() {
	return render(renderTransactionNewTree());
}

describe("transaction-new edit mode", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSearchParams = { transactionId: "tx-1" };
		mockActiveContext = { type: "personal" };
		mockCanCreate = true;
		mockListWallets.mockResolvedValue([
			{ id: "wallet-1", name: "BCA", is_active: true },
		]);
		mockCreateTransaction.mockResolvedValue({ id: "tx-new" });
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
		const screen = renderScreen();

		await waitFor(() =>
			expect(mockGetTransaction).toHaveBeenCalledWith("tx-1"),
		);
		expect(mockListWallets).toHaveBeenCalledWith({ type: "personal" });
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
				{ type: "personal" },
			),
		);
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/transactions");
	});

	it("creates manual transactions in the active household context", async () => {
		mockSearchParams = {};
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		const screen = renderScreen();

		expect(await screen.findByText("Catat Manual")).toBeTruthy();
		expect(mockListWallets).toHaveBeenCalledWith(mockActiveContext);
		fireEvent.changeText(screen.getByLabelText("Nominal transaksi"), "50000");
		fireEvent.changeText(
			screen.getByLabelText("Deskripsi transaksi"),
			"Makan siang",
		);
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan"));
		fireEvent.press(screen.getByLabelText("Simpan transaksi manual"));

		await waitFor(() =>
			expect(mockCreateTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 50000,
					category: "Makan",
					description: "Makan siang",
					wallet_id: "wallet-1",
				}),
				mockActiveContext,
			),
		);
	});


	it("ignores stale wallet loads after switching finance context", async () => {
		mockSearchParams = {};
		const personalWallets = createDeferred<Array<{ id: string; name: string; is_active: boolean }>>();
		const householdWallets = createDeferred<Array<{ id: string; name: string; is_active: boolean }>>();
		const householdContext = {
			type: "household" as const,
			householdId: "hh-1",
			role: "admin" as const,
		};
		mockListWallets.mockImplementation((context) =>
			context?.type === "household"
				? householdWallets.promise
				: personalWallets.promise,
		);

		const screen = renderScreen();
		await waitFor(() =>
			expect(mockListWallets).toHaveBeenCalledWith({ type: "personal" }),
		);

		mockActiveContext = householdContext;
		screen.rerender(renderTransactionNewTree());
		await waitFor(() =>
			expect(mockListWallets).toHaveBeenCalledWith(householdContext),
		);

		await act(async () => {
			householdWallets.resolve([
				{ id: "wallet-hh", name: "Rumah", is_active: true },
			]);
			await householdWallets.promise;
		});
		expect(await screen.findByText("Rumah")).toBeTruthy();

		await act(async () => {
			personalWallets.resolve([
				{ id: "wallet-personal", name: "Personal", is_active: true },
			]);
			await personalWallets.promise;
			await Promise.resolve();
		});
		expect(screen.queryByText("Personal")).toBeNull();

		fireEvent.changeText(screen.getByLabelText("Nominal transaksi"), "50000");
		fireEvent.changeText(
			screen.getByLabelText("Deskripsi transaksi"),
			"Belanja rumah",
		);
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan"));
		fireEvent.press(screen.getByLabelText("Simpan transaksi manual"));

		await waitFor(() =>
			expect(mockCreateTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ wallet_id: "wallet-hh" }),
				householdContext,
			),
		);
	});

	it("replaces a stale edit wallet with an active wallet so edits can be saved", async () => {
		mockListWallets.mockResolvedValue([
			{ id: "wallet-current", name: "Current", is_active: true },
		]);
		mockGetTransaction.mockResolvedValue({
			id: "tx-1",
			wallet_id: "wallet-stale",
			transaction_type: "expense",
			amount: 35000,
			category: "Makan",
			description: "Kopi sore",
			merchant: "Kopi Kenangan",
			date: "2026-05-20",
			note: "Less sugar",
		});
		const screen = renderScreen();

		expect(await screen.findByDisplayValue("Kopi sore")).toBeTruthy();
		expect(screen.getByLabelText("Pilih dompet Current").props.accessibilityState).toMatchObject({ selected: true });
		fireEvent.press(screen.getByLabelText("Simpan perubahan transaksi"));

		await waitFor(() =>
			expect(mockUpdateTransaction).toHaveBeenCalledWith(
				"tx-1",
				expect.objectContaining({ wallet_id: "wallet-current" }),
				{ type: "personal" },
			),
		);
	});

	it("keeps viewer household context read-only", async () => {
		mockSearchParams = {};
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "viewer",
		};
		mockCanCreate = false;
		const screen = renderScreen();

		expect(
			await screen.findByText(
				"Mode lihat saja aktif. Transaksi tidak bisa dibuat atau diubah.",
			),
		).toBeTruthy();
		expect(
			screen.getByLabelText("Simpan transaksi manual").props.accessibilityState,
		).toMatchObject({ disabled: true });
	});
});
