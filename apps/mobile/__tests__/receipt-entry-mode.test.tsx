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
import {
	draftsMatchConfirmedTotal,
	receiptDraftMode,
	receiptDraftsForMode,
} from "../src/features/transaction-entry/adapters";
import { createDraft } from "../src/features/transaction-entry/draft";
import type { ReceiptExtraction } from "../src/services/receipt-intake";

// The flag object is read through getters so individual tests can flip the
// review-first flow on or off without re-importing the screen.
const mockTransactionEntryV2 = true;
jest.mock("../src/config/features", () => ({
	featureFlags: {
		get transactionEntryV2() {
			return mockTransactionEntryV2;
		},
		get simpleNavigation() {
			return true;
		},
		get voiceNote() {
			return false;
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

const mockRequestMediaLibraryPermissionsAsync = jest.fn<any, any[]>(
	async () => ({ granted: true }),
);
const mockLaunchImageLibraryAsync = jest.fn<any, any[]>(async () => ({
	canceled: false,
	assets: [{ uri: "file:///receipt.jpg", fileName: "receipt.jpg", mimeType: "image/jpeg" }],
}));
jest.mock("expo-image-picker", () => ({
	requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
		mockRequestMediaLibraryPermissionsAsync(...(args as any[])),
	launchImageLibraryAsync: (...args: unknown[]) =>
		mockLaunchImageLibraryAsync(...(args as any[])),
}));

const mockCreateTransaction = jest.fn<any, any[]>(async (input: Record<string, unknown>) => ({
	id: "tx-legacy",
	...input,
}));
jest.mock("../src/services/transactions", () => ({
	createTransaction: (...args: unknown[]) => mockCreateTransaction(args[0] as any),
}));

const mockSaveEntry = jest.fn<any, any[]>();
const mockReconcileEntry = jest.fn<any, any[]>(async () => []);
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
const mockAnalyzeReceiptImage = jest.fn<any, any[]>();
const mockGetReceiptAuthSession = jest.fn<any, any[]>(async () => ({
	access_token: "token",
	user: { id: "user-1" },
}));
const mockUploadReceiptImage = jest.fn<any, any[]>(async () => "user-1/receipt.jpg");
// Keep every pure receipt helper real (reconcileReceipt, receiptItemLines,
// receiptExtractionToDrafts, normalizeReceiptDate); only stub the I/O edges.
jest.mock("../src/services/receipt-intake", () => {
	const actual = jest.requireActual("../src/services/receipt-intake");
	return {
		...actual,
		analyzeTransactionText: (...args: unknown[]) =>
			mockAnalyzeTransactionText(...(args as any[])),
		analyzeReceiptImage: (...args: unknown[]) =>
			mockAnalyzeReceiptImage(...(args as any[])),
		getReceiptAuthSession: (...args: unknown[]) =>
			mockGetReceiptAuthSession(...(args as any[])),
		uploadReceiptImage: (...args: unknown[]) =>
			mockUploadReceiptImage(...(args as any[])),
	};
});

jest.mock("../src/services/transaction-classifier", () => ({
	classifyTransactionTextBatch: jest.fn<any, any[]>(() => []),
	CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD: 0.8,
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn<any, any[]>(async () => []),
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn<any, any[]>(async () => [
		{ id: "w-1", name: "Seabank", is_active: true },
	]),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: { type: "personal" },
		canCreate: true,
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

const SAVED_ROW = {
	id: "tx-1",
	wallet_id: "w-1",
	transaction_type: "expense",
	amount: 125000,
	category: "Makan & Minum",
	description: "Struk RM Sederhana",
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

/** Drives photo selection through analysis until the receipt review is mounted. */
async function reachReceiptReview() {
	fireEvent.press(screen.getByTestId("capture-mode-Foto"));
	fireEvent.press(screen.getByTestId("capture-receipt-pick"));
	await waitFor(() =>
		expect(screen.getByTestId("capture-receipt-preview")).toBeTruthy(),
	);
}

function recordedTotalText(): string {
	return String(screen.getByTestId("capture-receipt-recorded-total").props.children);
}

beforeEach(() => {
	mockSaveEntry.mockReset();
	mockReconcileEntry.mockReset();
	mockReconcileEntry.mockResolvedValue([]);
	mockGetUser.mockReset();
	mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
	mockAnalyzeTransactionText.mockReset();
	mockAnalyzeTransactionText.mockResolvedValue({ transactions: [] });
	mockAnalyzeReceiptImage.mockReset();
	mockRequestMediaLibraryPermissionsAsync.mockClear();
	mockLaunchImageLibraryAsync.mockClear();
	mockGetReceiptAuthSession.mockClear();
	mockUploadReceiptImage.mockClear();
	mockCreateTransaction.mockReset();
	mockPush.mockClear();
	jest.mocked(AsyncStorage.getItem).mockReset();
	jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
});

describe("capture receipt recording modes", () => {
	it("(a) defaults to ONE transaction whose amount equals the receipt total", async () => {
		mockAnalyzeReceiptImage.mockResolvedValue({
			total_amount: 125000,
			merchant: "RM Sederhana",
			confidence: 0.92,
			date: "2026-10-02",
			items: [
				{ name: "Kopi", price: 50000 },
				{ name: "Roti", price: 75000 },
			],
		} satisfies ReceiptExtraction);
		mockSaveEntry.mockResolvedValue({
			transactions: [{ ...SAVED_ROW }],
			budgetSyncWarning: false,
		});

		renderCapture();
		await reachReceiptReview();

		expect(recordedTotalText()).toBe("1 transaksi · Rp 125.000");

		fireEvent.press(screen.getByTestId("capture-receipt-confirm"));
		await waitFor(() => expect(mockSaveEntry).toHaveBeenCalledTimes(1));

		const payload = mockSaveEntry.mock.calls[0][0] as {
			drafts: Array<{ amount: number }>;
		};
		expect(payload.drafts).toHaveLength(1);
		expect(payload.drafts[0].amount).toBe(125000);
	});

	it("(b) splits per item and the drafts sum to the confirmed total", async () => {
		mockAnalyzeReceiptImage.mockResolvedValue({
			total_amount: 125000,
			merchant: "RM Sederhana",
			confidence: 0.92,
			date: "2026-10-02",
			items: [
				{ name: "Kopi", price: 50000 },
				{ name: "Roti", price: 75000 },
			],
		} satisfies ReceiptExtraction);

		renderCapture();
		await reachReceiptReview();

		fireEvent.press(screen.getByTestId("capture-receipt-split"));
		await waitFor(() => expect(recordedTotalText()).toBe("2 transaksi · Rp 125.000"));

		const drafts = screen.getAllByTestId(/^review-draft-/);
		expect(drafts).toHaveLength(2);
	});

	it("(c) surfaces a discrepancy and never absorbs it into the largest item", async () => {
		mockAnalyzeReceiptImage.mockResolvedValue({
			total_amount: 100000,
			merchant: "Indomaret",
			confidence: 0.9,
			date: "2026-10-02",
			items: [
				{ name: "Kopi", price: 30000 },
				{ name: "Roti", price: 40000 },
			],
		} satisfies ReceiptExtraction);

		renderCapture();
		await reachReceiptReview();

		fireEvent.press(screen.getByTestId("capture-receipt-split"));
		await waitFor(() =>
			expect(screen.getByTestId("capture-receipt-discrepancy")).toBeTruthy(),
		);

		// The printed amounts are shown as printed: nothing is inflated to 60000.
		expect(screen.getAllByText(/Rp 30\.000/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Rp 40\.000/).length).toBeGreaterThan(0);
		expect(screen.queryAllByText(/Rp 60\.000/)).toHaveLength(0);

		// The save CTA stays blocked until the discrepancy is acknowledged.
		expect(screen.getByTestId("capture-receipt-confirm")).toBeDisabled();
		expect(mockSaveEntry).not.toHaveBeenCalled();

		fireEvent.press(screen.getByTestId("capture-receipt-discrepancy-ack"));
		await waitFor(() =>
			expect(screen.getByTestId("capture-receipt-confirm")).not.toBeDisabled(),
		);
	});

	it("(d) saving per item calls saveEntry exactly once with all drafts", async () => {
		mockAnalyzeReceiptImage.mockResolvedValue({
			total_amount: 125000,
			merchant: "RM Sederhana",
			confidence: 0.92,
			date: "2026-10-02",
			items: [
				{ name: "Kopi", price: 50000 },
				{ name: "Roti", price: 75000 },
			],
		} satisfies ReceiptExtraction);
		mockSaveEntry.mockResolvedValue({
			transactions: [
				{ ...SAVED_ROW, amount: 50000 },
				{ ...SAVED_ROW, id: "tx-2", amount: 75000 },
			],
			budgetSyncWarning: false,
		});

		renderCapture();
		await reachReceiptReview();

		fireEvent.press(screen.getByTestId("capture-receipt-split"));
		await waitFor(() => expect(recordedTotalText()).toBe("2 transaksi · Rp 125.000"));

		fireEvent.press(screen.getByTestId("capture-receipt-confirm"));
		await waitFor(() => expect(mockSaveEntry).toHaveBeenCalledTimes(1));

		const payload = mockSaveEntry.mock.calls[0][0] as {
			drafts: Array<{ amount: number }>;
		};
		expect(payload.drafts).toHaveLength(2);
		expect(payload.drafts.map((draft) => draft.amount)).toEqual([50000, 75000]);
		// One atomic batch, never a loop of per-item inserts.
		expect(mockCreateTransaction).not.toHaveBeenCalled();
	});
});

describe("receipt mode adapters", () => {
	const reconciled: ReceiptExtraction = {
		total_amount: 125000,
		merchant: "RM Sederhana",
		confidence: 0.92,
		date: "2026-10-02",
		items: [
			{ name: "Kopi", price: 50000 },
			{ name: "Roti", price: 75000 },
		],
	};

	it("(e) draftsMatchConfirmedTotal rejects a batch whose sum differs", () => {
		const matching = [
			createDraft({ source: "image", amount: 50000, date: "2026-10-02" }),
			createDraft({ source: "image", amount: 75000, date: "2026-10-02" }),
		];
		expect(draftsMatchConfirmedTotal(matching, 125000)).toBe(true);
		expect(draftsMatchConfirmedTotal(matching, 120000)).toBe(false);

		const withInvalid = [
			...matching.slice(1),
			createDraft({ source: "image", amount: null, date: "2026-10-02" }),
		];
		expect(draftsMatchConfirmedTotal(withInvalid, 125000)).toBe(false);
		expect(draftsMatchConfirmedTotal([], 125000)).toBe(false);
	});

	it("(f) an unreadable receipt yields no drafts", () => {
		const unreadable: ReceiptExtraction = {
			total_amount: null,
			readable: false,
			items: [],
		};
		expect(receiptDraftsForMode(unreadable, "unreadable", "w-1")).toEqual([]);
		expect(receiptDraftMode(unreadable)).toBe("unreadable");
	});

	it("total mode is one draft; items mode is one draft per printed line", () => {
		expect(receiptDraftsForMode(reconciled, "total", "w-1")).toHaveLength(1);
		expect(receiptDraftsForMode(reconciled, "total", "w-1")[0].amount).toBe(125000);

		const items = receiptDraftsForMode(reconciled, "items", "w-1");
		expect(items).toHaveLength(2);
		expect(items.map((draft) => draft.amount)).toEqual([50000, 75000]);
		expect(draftsMatchConfirmedTotal(items, 125000)).toBe(true);
	});

	it("marks printed items unresolved instead of fudging when they do not reconcile", () => {
		const off: ReceiptExtraction = {
			total_amount: 100000,
			merchant: "Indomaret",
			date: "2026-10-02",
			items: [
				{ name: "Kopi", price: 30000 },
				{ name: "Roti", price: 40000 },
			],
		};

		const items = receiptDraftsForMode(off, "items", "w-1");
		expect(items.map((draft) => draft.amount)).toEqual([30000, 40000]);
		expect(items.every((draft) => draft.unresolvedFields.includes("amount"))).toBe(true);
		expect(draftsMatchConfirmedTotal(items, 100000)).toBe(false);
	});
});
