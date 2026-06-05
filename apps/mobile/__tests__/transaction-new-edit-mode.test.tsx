import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import TransactionNewScreen from "../app/(tabs)/transaction-new";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockGetTransaction = jest.fn();
const mockCreateTransaction = jest.fn();
const mockUpdateTransaction = jest.fn();
const mockListWallets = jest.fn();
const mockListCategories = jest.fn();
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
	useRouter: () => ({ back: mockBack, replace: mockReplace }),
	useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: (...args: unknown[]) => mockListWallets(...args),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: (...args: unknown[]) => mockListCategories(...args),
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
		jest.mocked(AsyncStorage.getItem).mockReset();
		jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
		mockSearchParams = { transactionId: "tx-1" };
		mockActiveContext = { type: "personal" };
		mockCanCreate = true;
		mockListWallets.mockResolvedValue([
			{ id: "wallet-1", name: "BCA", is_active: true },
		]);
		mockListCategories.mockResolvedValue([
			{ id: "cat-1", name: "Makan", icon: "chart", is_default: true },
		]);
		mockCreateTransaction.mockResolvedValue({ id: "tx-new" });
		mockGetTransaction.mockResolvedValue({
			id: "tx-1",
			wallet_id: "wallet-1",
			transaction_type: "expense",
			amount: 35000,
			category: "Makan & Minum",
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
		expect(mockReplace).not.toHaveBeenCalled();
		expect(await screen.findByText("Perubahan transaksi tersimpan.")).toBeTruthy();
	});


	it("shows a cancel button beside save in edit mode", async () => {
		const screen = renderScreen();

		expect(await screen.findByText("Simpan Perubahan")).toBeTruthy();
		fireEvent.press(screen.getByLabelText("Batal edit transaksi"));

		expect(mockBack).toHaveBeenCalledTimes(1);
	});


	it("clears stale edit values when route is reused for manual create after cancel", async () => {
		const screen = renderScreen();

		expect(await screen.findByDisplayValue("Kopi sore")).toBeTruthy();
		fireEvent.press(screen.getByLabelText("Batal edit transaksi"));
		expect(mockBack).toHaveBeenCalledTimes(1);

		mockSearchParams = {};
		screen.rerender(renderTransactionNewTree());

		expect(await screen.findByText("Catat Manual")).toBeTruthy();
		await waitFor(() => expect(screen.queryByDisplayValue("Kopi sore")).toBeNull());
		expect(screen.queryByDisplayValue("Kopi Kenangan")).toBeNull();
		expect(screen.queryByDisplayValue("Less sugar")).toBeNull();
		expect(screen.getByLabelText("Deskripsi transaksi").props.value).toBe("");
	});

	it("clears the edit form after a successful update", async () => {
		const screen = renderScreen();

		expect(await screen.findByDisplayValue("Kopi sore")).toBeTruthy();
		fireEvent.press(screen.getByLabelText("Simpan perubahan transaksi"));

		await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalledTimes(1));
		expect(await screen.findByText("Perubahan transaksi tersimpan.")).toBeTruthy();
		expect(screen.queryByDisplayValue("Kopi sore")).toBeNull();
		expect(screen.queryByDisplayValue("Kopi Kenangan")).toBeNull();
	});

	it("shows only default categories while editing a transaction", async () => {
		mockListCategories.mockResolvedValueOnce([
			{ id: "cat-1", name: "Makan", icon: "chart", is_default: true },
			{ id: "cat-custom", name: "Nongkrong", icon: "coffee", is_default: false },
		]);
		const screen = renderScreen();

		expect(await screen.findByLabelText("Pilih kategori Makan & Minum")).toBeTruthy();
		expect(screen.queryByLabelText("Pilih kategori Nongkrong")).toBeNull();
		expect(screen.queryByLabelText("Pilih kategori kustom")).toBeNull();
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
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan & Minum"));
		fireEvent.press(screen.getByLabelText("Simpan transaksi manual"));

		await waitFor(() =>
			expect(mockCreateTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 50000,
					category: "Makan & Minum",
					description: "Makan siang",
					wallet_id: "wallet-1",
				}),
				mockActiveContext,
			),
		);
	});


	it("clears the create form after a successful manual transaction", async () => {
		mockSearchParams = {};
		const screen = renderScreen();

		expect(await screen.findByText("Catat Manual")).toBeTruthy();
		fireEvent.changeText(screen.getByLabelText("Nominal transaksi"), "50000");
		fireEvent.changeText(screen.getByLabelText("Deskripsi transaksi"), "Makan siang");
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan & Minum"));
		fireEvent.press(screen.getByLabelText("Simpan transaksi manual"));

		await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
		expect(await screen.findByText("Transaksi tersimpan.")).toBeTruthy();
		expect(screen.queryByDisplayValue("Makan siang")).toBeNull();
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it("saves the wheel-selected and confirmed manual transaction date", async () => {
		mockSearchParams = {};
		const currentYear = new Date().getFullYear();
		const screen = renderScreen();

		expect(await screen.findByText("Catat Manual")).toBeTruthy();
		fireEvent(screen.getByTestId("transaction-date-wheel-picker-month-scroll"), "scrollEndDrag", {
			nativeEvent: { contentOffset: { y: 42 * 6 } },
		});
		fireEvent(screen.getByTestId("transaction-date-wheel-picker-date-scroll"), "scrollEndDrag", {
			nativeEvent: { contentOffset: { y: 42 * 30 } },
		});

		await waitFor(() =>
			expect(screen.getByText(`Pilihan roda: ${currentYear}-07-31`)).toBeTruthy(),
		);
		fireEvent.press(screen.getByTestId("transaction-date-confirm"));
		expect(screen.getByText(`Tanggal terkonfirmasi: ${currentYear}-07-31`)).toBeTruthy();

		fireEvent.changeText(screen.getByLabelText("Nominal transaksi"), "50000");
		fireEvent.changeText(screen.getByLabelText("Deskripsi transaksi"), "Belanja akhir bulan");
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan & Minum"));
		fireEvent.press(screen.getByLabelText("Simpan transaksi manual"));

		await waitFor(() =>
			expect(mockCreateTransaction).toHaveBeenCalledWith(
				expect.objectContaining({ date: `${currentYear}-07-31` }),
				{ type: "personal" },
			),
		);
	});

	it("uses selected app language on the manual transaction form", async () => {
		jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) =>
			key === "kaswise:language-preference" ? "en" : null,
		);
		mockSearchParams = {};
		const screen = renderScreen();

		expect(await screen.findByText("Manual Entry")).toBeTruthy();
		await waitFor(() => expect(screen.getByText("Amount")).toBeTruthy());
		expect(screen.getByText("Description")).toBeTruthy();
		expect(screen.getByLabelText("Save manual transaction")).toBeTruthy();
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
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan & Minum"));
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
			category: "Makan & Minum",
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
