import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";

import CaptureScreen from "../app/(tabs)/capture";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

// Unlike capture-entry-v2.test.tsx we do NOT mock src/config/features. The real
// module reads feature flags through getters that honour the runtime override
// object, so each test flips aiAutoSaveText on/off via globalThis without a
// re-import. This mirrors exactly how the flag is meant to be toggled at runtime.

jest.mock("expo-av", () => ({
	Audio: {
		requestPermissionsAsync: jest.fn<any, any[]>(),
		setAudioModeAsync: jest.fn<any, any[]>(),
		Recording: { createAsync: jest.fn<any, any[]>() },
		RecordingOptionsPresets: { HIGH_QUALITY: {} },
	},
}));

jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image-picker", () => ({
	requestMediaLibraryPermissionsAsync: jest.fn<any, any[]>(async () => ({ granted: true })),
	launchImageLibraryAsync: jest.fn<any, any[]>(),
}));

const mockCreateTransaction = jest.fn<any, any[]>(
	async (input: Record<string, unknown>) => ({ id: "tx-legacy", ...input }),
);
const mockDeleteTransaction = jest.fn<any, any[]>(async () => undefined);
jest.mock("../src/services/transactions", () => ({
	createTransaction: (...args: unknown[]) => mockCreateTransaction(args[0] as any),
	deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
}));

const mockSaveEntry = jest.fn<any, any[]>();
const mockReconcileEntry = jest.fn<any, any[]>();
jest.mock("../src/services/transaction-entry-persistence", () => {
	class EntryPersistenceError extends Error {
		kind: string;
		fields?: Record<string, unknown>;
		constructor(
			kind: string,
			message: string,
			options?: { fields?: Record<string, unknown> },
		) {
			super(message);
			this.name = "EntryPersistenceError";
			this.kind = kind;
			this.fields = options?.fields;
		}
	}
	return {
		EntryPersistenceError,
		saveEntry: (...args: unknown[]) => mockSaveEntry(...args),
		reconcileEntry: (...args: unknown[]) => mockReconcileEntry(...args),
	};
});

const mockAnalyzeTransactionText = jest.fn<any, any[]>(async () => ({
	transactions: [],
}));
const mockAnalyzeReceiptImage = jest.fn<any, any[]>(async () => ({
	total_amount: 125000,
	merchant: "RM Sederhana",
	confidence: 0.92,
	date: "2026-10-02",
}));
const mockGetReceiptAuthSession = jest.fn<any, any[]>(async () => ({
	access_token: "token",
	user: { id: "user-1" },
}));
const mockUploadReceiptImage = jest.fn<any, any[]>(async () => "user-1/receipt.jpg");
jest.mock("../src/services/receipt-intake", () => ({
	analyzeTransactionText: (...args: unknown[]) =>
		mockAnalyzeTransactionText(...(args as any[])),
	analyzeReceiptImage: (...args: unknown[]) =>
		mockAnalyzeReceiptImage(...(args as any[])),
	getReceiptAuthSession: (...args: unknown[]) =>
		mockGetReceiptAuthSession(...(args as any[])),
	uploadReceiptImage: (...args: unknown[]) =>
		mockUploadReceiptImage(...(args as any[])),
	receiptExtractionToDraft: jest.fn<any, any[]>(),
	receiptExtractionToDrafts: jest.fn<any, any[]>(() => []),
	normalizeReceiptDate: (value: unknown, fallback?: unknown) =>
		typeof value === "string" && value.trim()
			? value
			: (fallback ?? "2026-10-02"),
}));

const mockClassify = jest.fn<any, any[]>(() => [] as any[]);
jest.mock("../src/services/transaction-classifier", () => ({
	classifyTransactionTextBatch: (...args: unknown[]) =>
		mockClassify(...(args as any[])),
	CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD: 0.8,
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn<any, any[]>(async () => []),
}));

const mockListWallets = jest.fn<any, any[]>(async () => [
	{ id: "w-1", name: "Seabank", is_active: true },
]);
jest.mock("../src/services/wallets", () => ({
	listWallets: (...args: unknown[]) => mockListWallets(...(args as any[])),
}));

let mockCanCreate = true;
let mockActiveContext: { type: "personal" } = { type: "personal" };
jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: mockCanCreate,
		memberships: [],
		setPersonalContext: jest.fn<any, any[]>(),
		setActiveHousehold: jest.fn<any, any[]>(),
	}),
}));

const mockGetUser = jest.fn<any, any[]>(async () => ({ data: { user: { id: "user-1" } } }));
const mockSupabaseClient = {
	auth: { getUser: (...args: unknown[]) => mockGetUser(...(args as any[])) },
	from: jest.fn<any, any[]>(() => ({ insert: jest.fn<any, any[]>(), select: jest.fn<any, any[]>() })),
	functions: { invoke: jest.fn<any, any[]>() },
	rpc: jest.fn<any, any[]>(),
};
jest.mock("../src/lib/supabase", () => ({
	supabase: mockSupabaseClient,
	useSupabase: () => ({ supabase: mockSupabaseClient }),
}));

jest.mock("../src/hooks/useTransactionRealtime", () => ({
	useTransactionRealtime: () => ({ loading: false, transaction: null }),
}));

jest.mock("../src/hooks/useEntitlements", () => ({
	useEntitlements: () => ({
		data: null,
		loading: false,
		refresh: jest.fn<any, any[]>(async () => undefined),
	}),
}));

jest.mock("../src/services/budget-envelopes", () => ({
	createEnvelopeAllocation: jest.fn<any, any[]>(),
	syncEnvelopeAllocationForTransaction: jest.fn<any, any[]>(async () => undefined),
	deleteEnvelopeAllocationsForTransaction: jest.fn<any, any[]>(async () => undefined),
}));

jest.mock("../src/services/voice-intake", () => ({
	getVoiceAuthSession: jest.fn<any, any[]>(),
	processVoiceTransaction: jest.fn<any, any[]>(),
	uploadVoiceAudio: jest.fn<any, any[]>(),
}));

const mockPush = jest.fn<any, any[]>();
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
	useLocalSearchParams: () => ({}),
	useFocusEffect: (callback: () => void | (() => void)) => {
		const ReactModule = require("react");
		ReactModule.useEffect(() => callback(), [callback]);
	},
}));

const CLASSIFIED = {
	transactionType: "expense",
	amount: 35000,
	categoryId: null,
	categoryName: "Makan & Minum",
	merchant: "Kopi Kenangan",
	note: "Beli kopi",
	date: "2026-10-02",
	confidence: 0.96,
	matchedKeywords: [] as string[],
	matchedConcept: "food",
};

const SAVED_ROW = {
	id: "tx-1",
	user_id: "user-1",
	wallet_id: "w-1",
	transaction_type: "expense",
	amount: 35000,
	category: "Makan & Minum",
	description: "Beli kopi",
	merchant: "Kopi Kenangan",
	date: "2026-10-02",
	note: "Beli kopi",
	payment_method: null,
	receipt_url: null,
	group_id: null,
	is_shared: false,
	visibility: null,
	ai_confidence: 0.96,
	ai_extracted: null,
	household_id: null,
	created_by: "user-1",
	on_behalf_of: null,
	is_disputed: false,
	dispute_resolved_at: null,
};

/** A single, unambiguous expense the extractor is confident about. */
function safeExtraction() {
	return {
		transactions: [
			{
				amount: 35000,
				type: "expense",
				category: "Makan & Minum",
				note: "Beli kopi",
				merchant: "Kopi Kenangan",
				confidence: 0.96,
				date: "2026-10-02",
			},
		],
		unclear: null as string | null,
	};
}

function setFlags(overrides: Record<string, boolean>) {
	(globalThis as any).__KASWISE_FEATURE_FLAGS__ = {
		transactionEntryV2: true,
		aiAutoSaveText: true,
		simpleNavigation: true,
		voiceNote: false,
		importStatement: false,
		...overrides,
	};
}

function renderCapture() {
	return render(
		<I18nProvider>
			<ThemeProvider>
				<CaptureScreen />
			</ThemeProvider>
		</I18nProvider>,
	);
}

/**
 * Renders the screen and waits until the scoped wallet list has settled. The
 * auto-save decision attaches the default wallet to the draft, so pressing the
 * button before the wallets load would leave an unresolved wallet and force a
 * review instead of an automatic save.
 */
async function renderReady() {
	renderCapture();
	await waitFor(() =>
		expect(screen.getByTestId("capture-wallet-w-1")).toBeTruthy(),
	);
	// Flush one more frame so the entry-state snapshot picks up the wallet.
	await act(async () => {
		await Promise.resolve();
	});
}

async function submitText(value = "Beli kopi 35rb") {
	fireEvent.changeText(screen.getByLabelText("Input teks transaksi"), value);
	fireEvent.press(screen.getByTestId("capture-text-submit"));
}

beforeEach(() => {
	setFlags({});
	mockCanCreate = true;
	mockActiveContext = { type: "personal" };
	mockCreateTransaction.mockReset();
	mockDeleteTransaction.mockReset();
	mockDeleteTransaction.mockResolvedValue(undefined);
	mockSaveEntry.mockReset();
	mockSaveEntry.mockResolvedValue({
		transactions: [SAVED_ROW],
		budgetSyncWarning: false,
	});
	mockReconcileEntry.mockReset();
	mockReconcileEntry.mockResolvedValue([]);
	mockGetUser.mockReset();
	mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
	mockAnalyzeTransactionText.mockReset();
	mockAnalyzeTransactionText.mockResolvedValue({ transactions: [] });
	mockAnalyzeReceiptImage.mockReset();
	mockClassify.mockReset();
	mockClassify.mockReturnValue([]);
	mockListWallets.mockReset();
	mockListWallets.mockResolvedValue([
		{ id: "w-1", name: "Seabank", is_active: true },
	]);
	mockPush.mockClear();
	jest.mocked(AsyncStorage.getItem).mockReset();
	jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
});

describe("Capture text auto-save (aiAutoSaveText)", () => {
	it("auto-saves a clear sentence without opening review and shows the undo notice", async () => {
		mockAnalyzeTransactionText.mockResolvedValue(safeExtraction());
		await renderReady();

		await submitText();

		// The guarded write ran automatically through the same saveEntry path.
		await waitFor(() => expect(mockSaveEntry).toHaveBeenCalledTimes(1));

		// Review never stays mounted once the auto-save succeeded.
		await waitFor(() =>
			expect(screen.getByTestId("auto-save-toast")).toBeTruthy(),
		);
		expect(screen.queryByTestId("capture-entry-review")).toBeNull();
		expect(screen.queryByTestId("transaction-review")).toBeNull();
		expect(screen.queryByTestId("auto-save-reason")).toBeNull();

		// Both undo and edit affordances are offered.
		expect(screen.getByTestId("auto-save-undo")).toBeTruthy();
		expect(screen.getByTestId("auto-save-edit")).toBeTruthy();
		expect(mockCreateTransaction).not.toHaveBeenCalled();
		expect(mockDeleteTransaction).not.toHaveBeenCalled();
	});

	it("keeps review and explains itself when the extractor flags uncertainty", async () => {
		const extraction = safeExtraction();
		extraction.unclear = "tanggal transaksi belum jelas";
		mockAnalyzeTransactionText.mockResolvedValue(extraction);
		await renderReady();

		await submitText();

		await waitFor(() =>
			expect(screen.getByTestId("capture-entry-review")).toBeTruthy(),
		);
		expect(screen.getByTestId("transaction-review")).toBeTruthy();
		expect(screen.getByTestId("auto-save-reason").props.children).toMatch(
			/belum jelas/i,
		);
		expect(screen.queryByTestId("auto-save-toast")).toBeNull();
		expect(mockSaveEntry).not.toHaveBeenCalled();
	});

	it("keeps review when one sentence contains two transactions", async () => {
		mockAnalyzeTransactionText.mockResolvedValue({
			transactions: [
				{
					amount: 35000,
					type: "expense",
					category: "Makan & Minum",
					note: "Beli kopi",
					confidence: 0.96,
					date: "2026-10-02",
				},
				{
					amount: 20000,
					type: "expense",
					category: "Transportasi",
					note: "Ongkos",
					confidence: 0.93,
					date: "2026-10-02",
				},
			],
			unclear: null,
		});
		await renderReady();

		await submitText();

		await waitFor(() =>
			expect(screen.getByTestId("capture-entry-review")).toBeTruthy(),
		);
		expect(screen.getByTestId("auto-save-reason").props.children).toMatch(
			/lebih dari satu transaksi/i,
		);
		expect(screen.queryByTestId("auto-save-toast")).toBeNull();
		expect(mockSaveEntry).not.toHaveBeenCalled();
	});

	it("keeps review when the category is generic", async () => {
		const extraction = safeExtraction();
		extraction.transactions[0].category = "Lainnya";
		mockAnalyzeTransactionText.mockResolvedValue(extraction);
		await renderReady();

		await submitText();

		await waitFor(() =>
			expect(screen.getByTestId("capture-entry-review")).toBeTruthy(),
		);
		expect(screen.getByTestId("auto-save-reason").props.children).toMatch(
			/kategori/i,
		);
		expect(screen.queryByTestId("auto-save-toast")).toBeNull();
		expect(mockSaveEntry).not.toHaveBeenCalled();
	});

	it("keeps review when the amount is missing", async () => {
		// The AI path drops a zero amount entirely, so the draft survives only
		// via the classifier: it must still stop at review with a reason.
		mockClassify.mockReturnValue([{ ...CLASSIFIED, amount: 0 }]);
		mockAnalyzeTransactionText.mockResolvedValue({ transactions: [] });
		await renderReady();

		await submitText();

		await waitFor(() =>
			expect(screen.getByTestId("capture-entry-review")).toBeTruthy(),
		);
		expect(screen.getByTestId("auto-save-reason").props.children).toMatch(
			/nominal/i,
		);
		expect(screen.queryByTestId("auto-save-toast")).toBeNull();
		expect(mockSaveEntry).not.toHaveBeenCalled();
	});

	it("stays in review for a clear sentence when the flag is off", async () => {
		setFlags({ aiAutoSaveText: false });
		mockAnalyzeTransactionText.mockResolvedValue(safeExtraction());
		await renderReady();

		await submitText();

		await waitFor(() =>
			expect(screen.getByTestId("transaction-review")).toBeTruthy(),
		);
		expect(screen.getByTestId("capture-entry-review")).toBeTruthy();
		// No auto-save path runs at all: no reason bar is needed because the
		// user is simply in the normal review-first flow.
		expect(screen.queryByTestId("auto-save-toast")).toBeNull();
		expect(mockSaveEntry).not.toHaveBeenCalled();
	});

	it("undoing the automatic save deletes the transaction and hides the notice", async () => {
		mockAnalyzeTransactionText.mockResolvedValue(safeExtraction());
		await renderReady();

		await submitText();
		await waitFor(() =>
			expect(screen.getByTestId("auto-save-toast")).toBeTruthy(),
		);

		await act(async () => {
			fireEvent.press(screen.getByTestId("auto-save-undo"));
		});

		await waitFor(() =>
			expect(mockDeleteTransaction).toHaveBeenCalledTimes(1),
		);
		expect(mockDeleteTransaction).toHaveBeenCalledWith("tx-1", {
			type: "personal",
		});
		await waitFor(() =>
			expect(screen.queryByTestId("auto-save-toast")).toBeNull(),
		);
	});

});
