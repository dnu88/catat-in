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

// The flag object is read through getters so individual tests can flip the
// review-first flow on or off without re-importing the screen.
let mockTransactionEntryV2 = true;
let mockSimpleNavigation = true;
let mockVoiceNote = false;

jest.mock("../src/config/features", () => ({
	featureFlags: {
		get transactionEntryV2() {
			return mockTransactionEntryV2;
		},
		get simpleNavigation() {
			return mockSimpleNavigation;
		},
		get voiceNote() {
			return mockVoiceNote;
		},
		get importStatement() {
			return false;
		},
	},
}));

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
jest.mock("../src/services/transactions", () => ({
	createTransaction: (...args: unknown[]) => mockCreateTransaction(args[0] as any),
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

const mockAnalyzeTransactionText = jest.fn<any, any[]>(async () => ({ transactions: [] }));
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
// Stable identity across renders: capture useState/useFocusEffect key on the
// active context object, so a fresh object per render would loop.
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
	wallet_id: "w-1",
	transaction_type: "expense",
	amount: 35000,
	category: "Makan & Minum",
	description: "Beli kopi",
	date: "2026-10-02",
};

function renderCapture() {
	return render(
		<I18nProvider>
			<ThemeProvider>
				<CaptureScreen />
			</ThemeProvider>
		</I18nProvider>,
	);
}

/** Drives text input through analysis until the editable review is mounted. */
async function reachReview() {
	fireEvent.changeText(
		screen.getByLabelText("Input teks transaksi"),
		"Beli kopi 35rb",
	);
	fireEvent.press(screen.getByTestId("capture-text-submit"));
	await waitFor(() => expect(screen.getByTestId("transaction-review")).toBeTruthy());
}

beforeEach(() => {
	mockTransactionEntryV2 = true;
	mockSimpleNavigation = true;
	mockVoiceNote = false;
	mockCanCreate = true;
	mockActiveContext = { type: "personal" };
	mockCreateTransaction.mockReset();
	mockSaveEntry.mockReset();
	mockReconcileEntry.mockReset();
	mockReconcileEntry.mockResolvedValue([]);
	mockGetUser.mockReset();
	mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
	mockAnalyzeTransactionText.mockReset();
	mockAnalyzeTransactionText.mockResolvedValue({ transactions: [] });
	mockAnalyzeReceiptImage.mockReset();
	mockClassify.mockReset();
	mockPush.mockClear();
	jest.mocked(AsyncStorage.getItem).mockReset();
	jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
});

describe("Capture review-first entry (transactionEntryV2)", () => {
	it("(a) produces an editable review and saves nothing before confirm", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		renderCapture();

		fireEvent.changeText(
			screen.getByLabelText("Input teks transaksi"),
			"Beli kopi 35rb",
		);
		// The text action is a review action, not an immediate save.
		expect(screen.getByLabelText("Cek transaksi")).toBeTruthy();
		fireEvent.press(screen.getByTestId("capture-text-submit"));

		await waitFor(() =>
			expect(screen.getByTestId("transaction-review")).toBeTruthy(),
		);

		// Analysis stopped at review; no write happened yet.
		expect(mockCreateTransaction).not.toHaveBeenCalled();
		expect(mockSaveEntry).not.toHaveBeenCalled();
		expect(screen.getByTestId("review-save")).toBeTruthy();
	});

	it("(b) leaves the legacy path intact when the flag is off", async () => {
		mockTransactionEntryV2 = false;
		mockClassify.mockReturnValue([CLASSIFIED]);
		mockAnalyzeTransactionText.mockResolvedValue({
			transactions: [
				{
					amount: 35000,
					type: "expense",
					category: "Makan & Minum",
					note: "Beli kopi",
					merchant: "Kopi Kenangan",
					confidence: 0.96,
				},
			],
		});
		mockCreateTransaction.mockResolvedValue({ id: "tx-legacy", status: "done" });
		renderCapture();

		fireEvent.changeText(
			screen.getByLabelText("Input teks transaksi"),
			"Beli kopi 35rb",
		);
		fireEvent.press(screen.getByTestId("capture-text-submit"));

		await waitFor(() =>
			expect(mockCreateTransaction).toHaveBeenCalledTimes(1),
		);
		// The idempotent entry path is never used by the legacy branch.
		expect(mockSaveEntry).not.toHaveBeenCalled();
		expect(screen.queryByTestId("transaction-review")).toBeNull();
	});

	it("(c) sends the edited draft amount to saveEntry", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		mockSaveEntry.mockResolvedValue({
			transactions: [{ ...SAVED_ROW, amount: 5000 }],
			budgetSyncWarning: false,
		});
		renderCapture();

		await reachReview();

		fireEvent.changeText(screen.getAllByLabelText("Nominal")[0], "5000");
		fireEvent.press(screen.getByTestId("review-save"));

		await waitFor(() => expect(mockSaveEntry).toHaveBeenCalledTimes(1));
		const payload = mockSaveEntry.mock.calls[0][0] as {
			requestId: string;
			fingerprint: string;
			drafts: Array<{ amount: number }>;
		};
		expect(payload.drafts[0].amount).toBe(5000);
		expect(payload.requestId).toEqual(expect.any(String));
		expect(payload.requestId.length).toBeGreaterThan(0);
		expect(payload.fingerprint).toEqual(expect.any(String));
		expect(mockCreateTransaction).not.toHaveBeenCalled();
	});

	it("(d) a rapid double confirm triggers exactly one saveEntry call", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		let resolveSave!: (value: unknown) => void;
		mockSaveEntry.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveSave = resolve;
				}),
		);
		renderCapture();

		await reachReview();
		const save = screen.getByTestId("review-save");

		// The review mounts one frame before the entry state settles (default
		// wallet/categories). Flush that frame first, otherwise the responder
		// system silently drops the press.
		await act(async () => {
			await Promise.resolve();
		});

		await act(async () => {
			fireEvent.press(save);
			fireEvent.press(save);
		});

		expect(mockSaveEntry).toHaveBeenCalledTimes(1);

		await act(async () => {
			resolveSave({ transactions: [SAVED_ROW], budgetSyncWarning: false });
		});
	});

	it("(e) reconciles an unknown outcome and offers no blind retry", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		mockSaveEntry.mockRejectedValue(new Error("Network request failed"));
		mockReconcileEntry.mockResolvedValue([]);
		renderCapture();

		await reachReview();

		// See note in (d): flush the mount frame before pressing, otherwise the
		// press is dropped by the responder system.
		await act(async () => {
			await Promise.resolve();
		});

		await act(async () => {
			fireEvent.press(screen.getByTestId("review-save"));
		});

		await waitFor(() => expect(mockReconcileEntry).toHaveBeenCalledTimes(1));

		// The unknown outcome is reconciled, never blindly retried.
		expect(screen.queryByTestId("capture-entry-retry")).toBeNull();
		expect(screen.queryByTestId("capture-error-retry")).toBeNull();
		await waitFor(() => expect(screen.getByTestId("capture-reconcile")).toBeTruthy());

		// An absent operation is unconfirmed, never proof of a failed commit.
		await waitFor(() =>
			expect(screen.getByTestId("capture-reconcile-retry")).toBeTruthy(),
		);
		expect(screen.getByText(/hasil simpan lengkap belum bisa dipastikan/i)).toBeTruthy();
		expect(screen.queryByTestId("capture-entry-success")).toBeNull();
		const saveInput = mockSaveEntry.mock.calls[0][0];
		expect(mockReconcileEntry.mock.calls[0][0]).toEqual({
			requestId: saveInput.requestId,
			fingerprint: saveInput.fingerprint,
			context: saveInput.context,
			drafts: saveInput.drafts,
		});
		expect(mockSaveEntry).toHaveBeenCalledTimes(1);
	});

	it("does not show success for only one row of a two-draft reconciliation", async () => {
		mockClassify.mockReturnValue([CLASSIFIED, { ...CLASSIFIED, amount: 40000 }]);
		mockSaveEntry.mockRejectedValue(new Error("Network request failed"));
		mockReconcileEntry.mockResolvedValue([SAVED_ROW]);
		renderCapture();
		await reachReview();
		await act(async () => { await Promise.resolve(); });
		fireEvent.press(screen.getByTestId("review-save"));
		await screen.findByTestId("capture-reconcile-retry");
		expect(mockSaveEntry.mock.calls[0][0].drafts).toHaveLength(2);
		expect(screen.queryByTestId("capture-entry-success")).toBeNull();
		expect(screen.getByText(/hasil simpan lengkap belum bisa dipastikan/i)).toBeTruthy();
		expect(mockSaveEntry).toHaveBeenCalledTimes(1);
	});

	it("retains edited text drafts through reconciliation and retries the same request", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		mockSaveEntry.mockRejectedValueOnce(new Error("Network request failed"));
		mockSaveEntry.mockResolvedValueOnce({ transactions: [SAVED_ROW], budgetSyncWarning: false });
		renderCapture();
		await reachReview();
		fireEvent.changeText(screen.getAllByLabelText("Nominal")[0], "42000");
		fireEvent.press(screen.getByTestId("review-save"));
		await screen.findByTestId("capture-reconcile-retry");
		expect(mockSaveEntry).toHaveBeenCalledTimes(1);
		fireEvent.press(screen.getByTestId("capture-reconcile-retry"));
		await screen.findByTestId("transaction-review");
		expect(screen.getAllByLabelText("Nominal")[0].props.value).toBe("42000");
		fireEvent.press(screen.getByTestId("review-save"));
		await waitFor(() => expect(mockSaveEntry).toHaveBeenCalledTimes(2));
		expect(mockSaveEntry.mock.calls[1][0]).toMatchObject({
			requestId: mockSaveEntry.mock.calls[0][0].requestId,
			fingerprint: mockSaveEntry.mock.calls[0][0].fingerprint,
			drafts: mockSaveEntry.mock.calls[0][0].drafts,
		});
		await screen.findByTestId("capture-entry-success");
	});

	it("blocks a changed payload while the original save outcome is unknown", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		mockSaveEntry.mockRejectedValue(new Error("Network request failed"));
		renderCapture();
		await reachReview();
		await act(async () => { await Promise.resolve(); });
		fireEvent.press(screen.getByTestId("review-save"));
		await screen.findByTestId("capture-reconcile-retry");
		fireEvent.press(screen.getByTestId("capture-reconcile-retry"));
		await screen.findByTestId("transaction-review");
		fireEvent.changeText(screen.getAllByLabelText("Nominal")[0], "42000");
		fireEvent.press(screen.getByTestId("review-save"));
		await screen.findByText(/pulihkan isian semula/i);
		expect(mockSaveEntry).toHaveBeenCalledTimes(1);
	});

	it("retries a failed reconciliation without submitting another write", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		mockSaveEntry.mockRejectedValue(new Error("Network request failed"));
		mockReconcileEntry.mockRejectedValueOnce(new Error("offline"));
		mockReconcileEntry.mockResolvedValueOnce([SAVED_ROW]);
		renderCapture();
		await reachReview();
		await act(async () => { await Promise.resolve(); });
		fireEvent.press(screen.getByTestId("review-save"));
		await screen.findByTestId("capture-reconcile-retry");
		fireEvent.press(screen.getByTestId("capture-reconcile-retry"));
		await screen.findByTestId("capture-entry-success");
		expect(mockReconcileEntry).toHaveBeenCalledTimes(2);
		expect(mockSaveEntry).toHaveBeenCalledTimes(1);
	});

	it("cancels review without writing and retains the original text input", async () => {
		mockClassify.mockReturnValue([CLASSIFIED]);
		renderCapture();
		await reachReview();
		fireEvent.press(screen.getByTestId("review-cancel"));
		await waitFor(() => expect(screen.queryByTestId("transaction-review")).toBeNull());
		expect(screen.getByLabelText("Input teks transaksi").props.value).toBe("Beli kopi 35rb");
		expect(mockSaveEntry).not.toHaveBeenCalled();
		expect(mockCreateTransaction).not.toHaveBeenCalled();
	});

	it("(f) blocks every submit with a read-only notice for viewers", async () => {
		mockCanCreate = false;
		mockClassify.mockReturnValue([CLASSIFIED]);
		renderCapture();

		expect(await screen.findByTestId("capture-viewer-notice")).toBeTruthy();
		expect(
			screen.getByText(/akses lihat di ruang uang ini/i),
		).toBeTruthy();

		fireEvent.changeText(
			screen.getByLabelText("Input teks transaksi"),
			"Beli kopi 35rb",
		);
		fireEvent.press(screen.getByTestId("capture-text-submit"));

		expect(mockSaveEntry).not.toHaveBeenCalled();
		expect(mockCreateTransaction).not.toHaveBeenCalled();
		expect(screen.queryByTestId("transaction-review")).toBeNull();
	});
});
