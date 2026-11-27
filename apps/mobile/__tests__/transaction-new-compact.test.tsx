jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";

import TransactionNewScreen from "../app/(tabs)/transaction-new";
import {
	parseIsoDateParts,
	toIsoDate,
} from "../src/components/date/IOSWheelDatePicker";
import { formatDraftDate } from "../src/components/transaction-entry/copy";
import { localToday } from "../src/features/transaction-entry/draft";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

jest.setTimeout(15000);

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockGetTransaction = jest.fn();
const mockCreateTransaction = jest.fn();
const mockUpdateTransaction = jest.fn();
const mockListWallets = jest.fn();
const mockListCategories = jest.fn();
let mockSearchParams: Record<string, string> = {};
let mockActiveContext:
	| { type: "personal" }
	| {
			type: "household";
			householdId: string;
			role: "admin" | "member" | "viewer";
	  } = { type: "personal" };
let mockCanCreate = true;

jest.mock("expo-router", () => ({
	useRouter: () => ({ back: mockBack, replace: mockReplace }),
	useLocalSearchParams: () => mockSearchParams,
	useFocusEffect: (callback: () => void | (() => void)) => {
		const React = require("react");
		React.useEffect(() => callback(), [callback]);
	},
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

type FlagsGlobal = typeof globalThis & {
	__KASWISE_FEATURE_FLAGS__?: { transactionEntryV2?: boolean; simplePremiumExperience?: boolean };
};
const flagsGlobal = globalThis as FlagsGlobal;

function renderTransactionNewTree() {
	return (
		<ThemeProvider>
			<I18nProvider>
				<TransactionNewScreen />
			</I18nProvider>
		</ThemeProvider>
	);
}

describe("transaction-new compact entry (transactionEntryV2)", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(AsyncStorage.getItem).mockReset();
		jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
		mockSearchParams = {};
		mockActiveContext = { type: "personal" };
		mockCanCreate = true;
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { transactionEntryV2: true };
		mockListWallets.mockResolvedValue([
			{ id: "wallet-1", name: "BCA", is_active: true },
		]);
		mockListCategories.mockResolvedValue([
			{ id: "cat-1", name: "Makan", icon: "chart", is_default: true, type: "expense" },
		]);
		mockCreateTransaction.mockResolvedValue({ id: "tx-new" });
		mockGetTransaction.mockResolvedValue(null);
		mockUpdateTransaction.mockResolvedValue({ id: "tx-1" });
	});

	afterEach(() => {
		delete flagsGlobal.__KASWISE_FEATURE_FLAGS__;
	});

	it.each([false, true])("shows non-color selected category and wallet cues only in premium (%s)", async (premium) => {
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { transactionEntryV2: true, simplePremiumExperience: premium };
		mockListWallets.mockResolvedValue([
			{ id: "wallet-1", name: "BCA", is_active: true },
			{ id: "wallet-2", name: "Tunai", is_active: true },
		]);
		const screen = render(renderTransactionNewTree());
		await screen.findByText("Catat Manual");
		fireEvent.press(screen.getByTestId("transaction-fields-category"));
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan & Minum"));
		fireEvent.press(screen.getByTestId("transaction-fields-category"));
		const category = screen.getByTestId("transaction-category-option-Makan & Minum");
		expect(category.props.accessibilityLabel).toBe(`Pilih kategori Makan & Minum${premium ? ", Terpilih" : ""}`);
		expect(Boolean(within(category).queryByText(/✓/))).toBe(premium);
		fireEvent.press(screen.getByTestId("transaction-category-sheet-close"));
		fireEvent.press(screen.getByTestId("transaction-fields-wallet"));
		const wallet = screen.getByTestId("transaction-wallet-option-wallet-1");
		expect(wallet.props.accessibilityLabel).toBe(`Pilih dompet BCA${premium ? ", Terpilih" : ""}`);
		expect(Boolean(within(wallet).queryByText(/✓/))).toBe(premium);
		const unselected = screen.getByTestId("transaction-wallet-option-wallet-2");
		expect(unselected.props.accessibilityLabel).toBe("Pilih dompet Tunai");
		expect(within(unselected).queryByText(/✓/)).toBeNull();
		fireEvent.press(screen.getByTestId("transaction-wallet-sheet-close"));
		fireEvent.press(screen.getByTestId("transaction-fields-type-transfer"));
		fireEvent.press(screen.getByTestId("transaction-fields-target-wallet"));
		const target = screen.getByTestId("transaction-target-wallet-option-wallet-2");
		expect(target.props.accessibilityLabel).toBe("Pilih dompet tujuan Tunai");
		expect(within(target).queryByText(/✓/)).toBeNull();
		fireEvent.press(target);
		fireEvent.press(screen.getByTestId("transaction-fields-target-wallet"));
		const selectedTarget = screen.getByTestId("transaction-target-wallet-option-wallet-2");
		expect(selectedTarget.props.accessibilityState).toMatchObject({ selected: true });
		expect(selectedTarget.props.accessibilityLabel).toBe(`Pilih dompet tujuan Tunai${premium ? ", Terpilih" : ""}`);
		expect(within(selectedTarget).getByText(`Tunai${premium ? " ✓" : ""}`)).toBeTruthy();
		expect(Boolean(within(selectedTarget).queryByText(/✓/))).toBe(premium);
	});

	it("premium header Back requires discard and cancel retains the amount", async () => {
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { transactionEntryV2: true, simplePremiumExperience: true };
		const screen = render(renderTransactionNewTree());
		await screen.findByText("Catat Manual");
		fireEvent.changeText(screen.getByTestId("transaction-fields-amount"), "35000");
		const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		fireEvent.press(screen.getByLabelText("Kembali dari catat manual"));
		expect(mockBack).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
		expect(alert).toHaveBeenCalled();
		const buttons = alert.mock.calls[0][2]!;
		act(() => buttons.find((button) => button.style === "cancel")?.onPress?.());
		expect(screen.getByTestId("transaction-fields-amount").props.value).toBe("35000");
		act(() => buttons.find((button) => button.style === "destructive")?.onPress?.());
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)/capture");
		expect(mockCreateTransaction).not.toHaveBeenCalled();
		alert.mockRestore();
	});

	it("collapses merchant and description until the detail section expands", async () => {
		const screen = render(renderTransactionNewTree());
		expect(await screen.findByText("Catat Manual")).toBeTruthy();

		// Essential fields are visible...
		expect(screen.getByTestId("transaction-fields-amount")).toBeTruthy();
		expect(screen.getByTestId("transaction-fields-type")).toBeTruthy();
		expect(screen.getByTestId("transaction-fields-category")).toBeTruthy();

		// ...but merchant and description stay collapsed.
		expect(screen.queryByTestId("transaction-fields-merchant")).toBeNull();
		expect(screen.queryByTestId("transaction-fields-description")).toBeNull();

		fireEvent.press(screen.getByTestId("transaction-fields-detail-toggle"));

		expect(screen.getByTestId("transaction-fields-merchant")).toBeTruthy();
		expect(screen.getByTestId("transaction-fields-description")).toBeTruthy();
	});

	it.each([false, true])("guards rapid compact submits (edit=%s)", async (editing) => {
		let finish!: (value: { id: string }) => void;
		const pending = new Promise<{ id: string }>((resolve) => { finish = resolve; });
		const write = editing ? mockUpdateTransaction : mockCreateTransaction;
		write.mockReturnValueOnce(pending);
		if (editing) {
			mockSearchParams = { transactionId: "tx-1" };
			mockGetTransaction.mockResolvedValue({
				id: "tx-1", wallet_id: "wallet-1", transaction_type: "expense",
				amount: 35000, category: "Makan & Minum", description: "Kopi sore", date: "2026-10-02",
			});
		}
		const screen = render(renderTransactionNewTree());
		await screen.findByText(editing ? "Edit Transaksi" : "Catat Manual");
		if (!editing) {
			fireEvent.changeText(screen.getByTestId("transaction-fields-amount"), "50000");
			fireEvent.press(screen.getByTestId("transaction-fields-category"));
			fireEvent.press(screen.getByLabelText("Pilih kategori Makan & Minum"));
		}
		const save = screen.getByTestId("transaction-form-submit");
		await act(async () => { fireEvent.press(save); fireEvent.press(save); });
		expect(write).toHaveBeenCalledTimes(1);
		await act(async () => { finish({ id: "tx-1" }); });
	});

	it("hides the category row and reveals the destination wallet row for a transfer", async () => {
		const screen = render(renderTransactionNewTree());
		expect(await screen.findByText("Catat Manual")).toBeTruthy();

		expect(screen.getByTestId("transaction-fields-category")).toBeTruthy();
		expect(screen.queryByTestId("transaction-fields-target-wallet")).toBeNull();

		fireEvent.press(screen.getByTestId("transaction-fields-type-transfer"));

		expect(screen.queryByTestId("transaction-fields-category")).toBeNull();
		expect(screen.getByTestId("transaction-fields-target-wallet")).toBeTruthy();
	});

	it("saves a complete manual entry in a single submit action", async () => {
		const screen = render(renderTransactionNewTree());
		expect(await screen.findByText("Catat Manual")).toBeTruthy();

		fireEvent.changeText(screen.getByTestId("transaction-fields-amount"), "50000");
		fireEvent.press(screen.getByTestId("transaction-fields-category"));
		fireEvent.press(screen.getByLabelText("Pilih kategori Makan & Minum"));

		await waitFor(() =>
			expect(
				screen.getByTestId("transaction-fields-category").props.accessibilityValue,
			).toMatchObject({ text: "Makan & Minum" }),
		);

		fireEvent.press(screen.getByTestId("transaction-form-submit"));

		await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
		expect(mockCreateTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				amount: 50000,
				category: "Makan & Minum",
				transaction_type: "expense",
				wallet_id: "wallet-1",
				is_verified: true,
			}),
			{ type: "personal" },
		);
		// Exactly one action: no second review/confirmation screen is involved.
		expect(mockUpdateTransaction).not.toHaveBeenCalled();
	});

	it("applies the date from the sheet but discards a cancelled one", async () => {
		const screen = render(renderTransactionNewTree());
		expect(await screen.findByText("Catat Manual")).toBeTruthy();

		expect(screen.getByTestId("transaction-fields-date").props.accessibilityValue).toMatchObject(
			{ text: "Hari ini" },
		);

		const { year, month, day } = parseIsoDateParts(localToday());
		const appliedIso = toIsoDate(year + 1, month, day);

		// Open the sheet and move the wheel year forward, then confirm.
		fireEvent.press(screen.getByTestId("transaction-fields-date"));
		expect(screen.getByTestId("transaction-date-wheel-picker")).toBeTruthy();
		fireEvent(
			screen.getByTestId("transaction-date-wheel-picker-year-scroll"),
			"accessibilityAction",
			{ nativeEvent: { actionName: "increment" } },
		);
		fireEvent.press(screen.getByTestId("transaction-date-confirm"));

		await waitFor(() =>
			expect(
				screen.getByTestId("transaction-fields-date").props.accessibilityValue,
			).toMatchObject({ text: formatDraftDate(appliedIso, "id") }),
		);

		// Re-open, move the wheel again, then cancel: the draft date stays.
		fireEvent.press(screen.getByTestId("transaction-fields-date"));
		fireEvent(
			screen.getByTestId("transaction-date-wheel-picker-year-scroll"),
			"accessibilityAction",
			{ nativeEvent: { actionName: "decrement" } },
		);
		fireEvent.press(screen.getByTestId("transaction-date-sheet-close"));

		expect(screen.getByTestId("transaction-fields-date").props.accessibilityValue).toMatchObject(
			{ text: formatDraftDate(appliedIso, "id") },
		);
	});

	it("hydrates every saved field when editing and preserves description and note", async () => {
		mockSearchParams = { transactionId: "tx-1" };
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
		const screen = render(renderTransactionNewTree());

		expect(await screen.findByDisplayValue("35000")).toBeTruthy();
		expect(screen.getByTestId("transaction-fields-category").props.accessibilityValue).toMatchObject(
			{ text: "Makan & Minum" },
		);
		expect(screen.getByTestId("transaction-fields-wallet").props.accessibilityValue).toMatchObject(
			{ text: "BCA" },
		);
		expect(screen.getByTestId("transaction-fields-date").props.accessibilityValue).toMatchObject(
			{ text: "20 Mei 2026" },
		);

		fireEvent.press(screen.getByTestId("transaction-form-submit"));

		await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalledTimes(1));
		expect(mockUpdateTransaction).toHaveBeenCalledWith(
			"tx-1",
			expect.objectContaining({
				amount: 35000,
				category: "Makan & Minum",
				description: "Kopi sore",
				merchant: "Kopi Kenangan",
				note: "Less sugar",
				date: "2026-05-20",
			}),
			{ type: "personal" },
		);
	});

	it("keeps the legacy layout when the flag is off", async () => {
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { transactionEntryV2: false };
		const screen = render(renderTransactionNewTree());

		expect(await screen.findByText("Catat Manual")).toBeTruthy();
		expect(screen.getByTestId("transaction-form-type")).toBeTruthy();
		expect(screen.queryByTestId("transaction-form-compact")).toBeNull();
		expect(screen.getByLabelText("Pilih kategori Makan & Minum")).toBeTruthy();
		// Required markers still ship through the legacy wheel + confirm control.
		expect(screen.getByTestId("transaction-date-wheel-picker")).toBeTruthy();
		expect(screen.getByTestId("transaction-date-confirm")).toBeTruthy();
	});
});
