import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react-native";

import CaptureScreen from "../app/(tabs)/capture";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

jest.mock("expo-av", () => ({
	Audio: {
		requestPermissionsAsync: jest.fn(),
		setAudioModeAsync: jest.fn(),
		Recording: { createAsync: jest.fn() },
		RecordingOptionsPresets: { HIGH_QUALITY: {} },
	},
}));

const mockCreateEnvelopeAllocation = jest.fn(async (..._args: unknown[]) => ({
	id: "alloc-1",
}));
const mockCreateTransaction = jest.fn(async (...args: unknown[]) => {
	const [input] = args as [Record<string, unknown>];
	return {
		id: "tx-created",
		...input,
	};
});
const mockInsert = jest.fn();
const mockInvoke = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockLaunchImageLibraryAsync = jest.fn(async (..._args: unknown[]) => ({
	canceled: false,
	assets: [{ uri: "file:///receipt.jpg", fileName: "receipt.jpg", mimeType: "image/jpeg" }],
}));
const mockGetReceiptAuthSession = jest.fn<Promise<{ access_token: string; user: { id: string } } | null>, unknown[]>(async () => ({ access_token: "token", user: { id: "user-1" } }));
const mockUploadReceiptImage = jest.fn(async (..._args: unknown[]) => "user-1/receipt.jpg");
const mockAnalyzeReceiptImage = jest.fn(async (..._args: unknown[]) => ({ total_amount: 125000, merchant: "RM Sederhana", confidence: 0.92 }));
const mockAnalyzeTransactionText = jest.fn(async (..._args: unknown[]) => ({
	total_amount: 35000,
	merchant: "Kopi Kenangan",
	category: "Makan & Minum",
	confidence: 0.96,
	date: "2026-07-08",
	transactions: [{
		amount: 35000,
		type: "expense",
		category: "Makan & Minum",
		note: "Beli kopi",
		merchant: "Kopi Kenangan",
		confidence: 0.96,
	}],
}));
const mockReceiptExtractionToDraft = jest.fn((..._args: unknown[]) => ({
	amount: 125000,
	transactionType: "expense",
	category: "Makan & Minum",
	description: "Struk RM Sederhana",
	merchant: "RM Sederhana",
	date: "2026-06-01",
	confidence: 0.92,
	reviewRequired: false,
}));
const mockGetUser = jest.fn(async () => ({ data: { user: { id: "user-1" } } }));
const mockSupabaseClient = {
	auth: { getUser: mockGetUser },
	from: jest.fn(() => ({
		insert: mockInsert,
	})),
	functions: { invoke: mockInvoke },
};
let mockActiveContext:
	| { type: "personal" }
	| {
			type: "household";
			householdId: string;
			role: "admin" | "member" | "owner" | "viewer";
	  } = { type: "personal" };
let mockMemberships: Array<{
	household_id: string;
	role: string;
	households?: { name: string };
}> = [];
let mockEntitlements: {
	chat_used: number;
	chat_limit: number;
	photo_limit: number;
} | null = null;
let mockRealtimeEnabled = true;
let mockEnvelopeSuggestion: null | {
	id?: string;
	envelope_id?: string;
	name: string;
	amount?: number;
	confidence?: number;
	remaining_after_transaction?: number;
	needs_review?: boolean;
} = {
	envelope_id: "env-kopi",
	name: "Kopi",
	amount: 25_000,
	confidence: 0.9,
	remaining_after_transaction: 17_000,
	needs_review: false,
};

jest.mock("../src/hooks/useTransactionRealtime", () => ({
	useTransactionRealtime: () => ({
		loading: false,
		transaction: mockRealtimeEnabled
			? {
					id: "tx-1",
					status: "done",
					confidence: 0.9,
					category: "Makan & Minum",
					description: "Kopi Kenangan",
					envelope_suggestion: mockEnvelopeSuggestion,
			  }
			: null,
	}),
}));

jest.mock("../src/services/budget-envelopes", () => ({
	createEnvelopeAllocation: (...args: unknown[]) =>
		mockCreateEnvelopeAllocation.apply(null, args),
	syncEnvelopeAllocationForTransaction: jest.fn(async () => undefined),
	deleteEnvelopeAllocationsForTransaction: jest.fn(async () => undefined),
}));

jest.mock("../src/services/transactions", () => ({
	createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
}));

jest.mock("expo-image-picker", () => ({
	requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissionsAsync(),
	launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

jest.mock("../src/services/receipt-intake", () => ({
	getReceiptAuthSession: (...args: unknown[]) => mockGetReceiptAuthSession(...args),
	uploadReceiptImage: (...args: unknown[]) => mockUploadReceiptImage(...args),
	analyzeReceiptImage: (...args: unknown[]) => mockAnalyzeReceiptImage(...args),
	analyzeTransactionText: (...args: unknown[]) => mockAnalyzeTransactionText(...args),
	receiptExtractionToDraft: (...args: unknown[]) => mockReceiptExtractionToDraft(...args),
	receiptExtractionToDrafts: (...args: unknown[]) => [mockReceiptExtractionToDraft(...args)].filter(Boolean),
	normalizeReceiptDate: (value: unknown) =>
		typeof value === "string" && value.trim()
			? value
			: new Date().toISOString().slice(0, 10),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => [
		{ id: "cat-food", user_id: "user-1", name: "Food & Beverage", icon: "food", is_default: true, type: "expense", created_at: "" },
		{ id: "cat-groceries", user_id: "user-1", name: "Groceries", icon: "wallet", is_default: true, type: "expense", created_at: "" },
	]),
}));

let mockWallets: Array<{ id: string; name: string; is_active: boolean }> = [];
jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn(async () => mockWallets),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: true,
		memberships: mockMemberships,
		setPersonalContext: jest.fn(),
		setActiveHousehold: jest.fn(),
	}),
}));

jest.mock("../src/lib/supabase", () => ({
	supabase: mockSupabaseClient,
	useSupabase: () => ({
		supabase: mockSupabaseClient,
	}),
}));

jest.mock("../src/hooks/useEntitlements", () => ({
	useEntitlements: () => ({
		data: mockEntitlements,
		loading: false,
		refresh: jest.fn(async () => undefined),
	}),
}));

const mockPush = jest.fn();
let mockSearchParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
	useLocalSearchParams: () => mockSearchParams,
	useFocusEffect: (callback: () => void | (() => void)) => {
		const React = require("react");
		React.useEffect(() => callback(), [callback]);
	},
}));

function captureTree() {
	return (
		<I18nProvider>
			<ThemeProvider>
				<CaptureScreen />
			</ThemeProvider>
		</I18nProvider>
	);
}

function renderCapture() {
	return render(captureTree());
}

describe("Capture envelope suggestion", () => {
	beforeEach(() => {
		mockCreateEnvelopeAllocation.mockClear();
		mockCreateTransaction.mockClear();
		mockInsert.mockReset();
		mockInvoke.mockReset();
		mockGetUser.mockClear();
		jest.mocked(AsyncStorage.getItem).mockReset();
		jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
		mockRequestMediaLibraryPermissionsAsync.mockClear();
		mockLaunchImageLibraryAsync.mockClear();
		mockGetReceiptAuthSession.mockClear();
		mockUploadReceiptImage.mockClear();
		mockAnalyzeReceiptImage.mockClear();
		mockAnalyzeTransactionText.mockClear();
		mockReceiptExtractionToDraft.mockClear();
		mockInsert.mockImplementation((payload) => ({
			select: () => ({
				single: async () => ({ data: { id: "tx-created", ...payload }, error: null }),
			}),
		}));
		mockInvoke.mockResolvedValue({ data: null, error: null });
		mockActiveContext = { type: "personal" };
		mockMemberships = [];
		mockEntitlements = null;
		mockSearchParams = {};
		mockRealtimeEnabled = true;
		mockWallets = [];
		mockPush.mockClear();
		mockEnvelopeSuggestion = {
			envelope_id: "env-kopi",
			name: "Kopi",
			amount: 25_000,
			confidence: 0.9,
			remaining_after_transaction: 17_000,
			needs_review: false,
		};
	});

	it("shows suggested envelope without blocking save", () => {
		renderCapture();

		expect(screen.getAllByText(/Dompet/i).length).toBeGreaterThan(0);
		expect(screen.getByText(/Kopi/i)).toBeTruthy();
		expect(screen.getByText(/17\.000|Rp17\.000 tersisa/i)).toBeTruthy();
		expect(screen.getByText(/Langsung simpan/i)).toBeTruthy();
	});

	it("only exposes text and photo capture modes for reviewer-safe Track A surfaces", () => {
		renderCapture();

		expect(screen.getByTestId("capture-mode-Teks")).toBeTruthy();
		expect(screen.getByTestId("capture-mode-Foto")).toBeTruthy();
		expect(screen.queryByTestId("capture-mode-Rekam")).toBeNull();
		expect(screen.queryByTestId("capture-mode-Import")).toBeNull();
		expect(screen.queryByText(/Rekam suara transaksi|Record transaction voice notes|Whisper/i)).toBeNull();
	});

	it("renders an action-first Quiet Ledger capture shell", () => {
		renderCapture();

		expect(screen.getByText("Catat transaksi")).toBeTruthy();
		expect(screen.queryByTestId("capture-flow-card")).toBeNull();
		expect(screen.queryByText(/ala Monveo/i)).toBeNull();
		expect(screen.getByTestId("capture-mode-Teks")).toBeTruthy();
		expect(screen.queryByText("Mode Teks")).toBeNull();
		expect(screen.getByText("Simpan transaksi")).toBeTruthy();
	});

	it("shows review copy inside the suggestion card for low-confidence matches", () => {
		mockEnvelopeSuggestion = {
			envelope_id: "env-kopi",
			name: "Kopi",
			amount: 25_000,
			confidence: 0.62,
			remaining_after_transaction: 17_000,
			needs_review: true,
		};

		renderCapture();

		expect(screen.getByTestId("capture-envelope-suggestion")).toBeTruthy();
		expect(screen.getByText("Perlu cek di Reports")).toBeTruthy();
	});

	it("persists an envelope allocation when suggestion has an envelope id", async () => {
		renderCapture();

		await waitFor(() =>
			expect(mockCreateEnvelopeAllocation).toHaveBeenCalledTimes(1),
		);
		expect(mockCreateEnvelopeAllocation.mock.calls[0][1]).toEqual({
			transaction_id: "tx-1",
			envelope_id: "env-kopi",
			amount: 25000,
			confidence: 0.9,
			needs_review: false,
		});
	});

	it("is safe when the transaction has no envelope suggestion", async () => {
		mockEnvelopeSuggestion = null;

		renderCapture();

		expect(screen.getByText(/Transaksi tercatat/i)).toBeTruthy();
		expect(screen.queryByTestId("capture-envelope-suggestion")).toBeNull();
		await waitFor(() =>
			expect(mockCreateEnvelopeAllocation).not.toHaveBeenCalled(),
		);
	});

	it("saves text capture instantly in the active household context", async () => {
		mockEnvelopeSuggestion = null;
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		renderCapture();

		fireEvent.changeText(
			screen.getByLabelText("Input teks transaksi"),
			"Beli kopi 35rb",
		);
		expect(screen.getByDisplayValue("Beli kopi 35rb")).toBeTruthy();
		fireEvent.press(screen.getByLabelText("Simpan transaksi"));

		await waitFor(() => expect(mockAnalyzeTransactionText).toHaveBeenCalledTimes(1), {
			timeout: 4000,
		});
		expect(mockAnalyzeTransactionText).toHaveBeenCalledWith(
			expect.anything(),
			"Beli kopi 35rb",
		);
		expect(mockInvoke).not.toHaveBeenCalled();
	});

	it("follows the selected app language for Capture copy", async () => {
		jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) =>
			key === "kaswise:language-preference" ? "en" : null,
		);
		mockEnvelopeSuggestion = null;

		renderCapture();

		expect(await screen.findByText("Text or receipt—choose the fastest input.")).toBeTruthy();
		expect(screen.getByText("Text")).toBeTruthy();
		expect(screen.getByText("Photo")).toBeTruthy();
		expect(screen.getByText("Save transaction")).toBeTruthy();
	});

	it("shows a clear login message when receipt processing has no active session", async () => {
		mockEnvelopeSuggestion = null;
		mockGetReceiptAuthSession.mockResolvedValueOnce(null);
		renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));
		await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalled());

		await waitFor(() =>
			expect(screen.getByText(/Sesi login tidak ditemukan/i)).toBeTruthy(),
		);
		expect(mockUploadReceiptImage).not.toHaveBeenCalled();
		expect(mockAnalyzeReceiptImage).not.toHaveBeenCalled();
	});


	it("continues receipt preview and save when private receipt upload is blocked by RLS", async () => {
		const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
		mockEnvelopeSuggestion = null;
		mockUploadReceiptImage.mockRejectedValueOnce(
			new Error("new row violates row-level security policy"),
		);
		renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));
		await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalled());
		await waitFor(() =>
			expect(screen.getByTestId("capture-receipt-preview")).toBeTruthy(),
		);

		fireEvent.press(screen.getByTestId("capture-receipt-confirm"));

		await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Receipt image upload skipped:",
			expect.any(Error),
		);
		consoleErrorSpy.mockRestore();
		expect(mockCreateTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				input_type: "image",
				receipt_url: null,
			}),
			mockActiveContext,
		);
	});

	it("processes a receipt photo preview and confirms it as an image transaction", async () => {
		mockEnvelopeSuggestion = null;
		renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));

		await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalled());
		await waitFor(() =>
			expect(screen.getByTestId("capture-receipt-preview")).toBeTruthy(),
		);

		fireEvent.press(screen.getByTestId("capture-receipt-confirm"));

		await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
		expect(mockCreateTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				transaction_type: "expense",
				amount: 125000,
				category: "Makan & Minum",
				description: "Struk RM Sederhana",
				merchant: "RM Sederhana",
				date: "2026-06-01",
				input_type: "image",
				status: "done",
				receipt_url: "user-1/receipt.jpg",
				raw_input: "receipt.jpg",
				ai_confidence: 0.92,
				confidence: 0.92,
			}),
			mockActiveContext,
		);
	});

	it("falls back to the default mode when ?mode=photo is locked by entitlements", () => {
		mockEntitlements = { chat_used: 3, chat_limit: 25, photo_limit: 0 };
		mockSearchParams = { mode: "photo" };
		renderCapture();

		// The locked photo entry param must not select the Foto panel.
		expect(screen.queryByTestId("capture-receipt-pick")).toBeNull();
		expect(screen.getByLabelText("Input teks transaksi")).toBeTruthy();

		// The visible Foto action keeps its own gating behaviour.
		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		expect(mockPush).toHaveBeenCalledWith("/upgrade");
		expect(screen.queryByTestId("capture-receipt-pick")).toBeNull();
	});
});

describe("Capture simple-mode action hub", () => {
	beforeEach(() => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__ = {
			simpleNavigation: true,
			voiceNote: false,
			importStatement: false,
		};
		mockRealtimeEnabled = false;
		mockEnvelopeSuggestion = null;
		mockWallets = [{ id: "wallet-1", name: "BCA", is_active: true }];
		mockMemberships = [];
		mockEntitlements = null;
		mockSearchParams = {};
		mockCreateEnvelopeAllocation.mockClear();
		mockCreateTransaction.mockClear();
		mockGetUser.mockClear();
		mockRequestMediaLibraryPermissionsAsync.mockClear();
		mockLaunchImageLibraryAsync.mockClear();
		mockGetReceiptAuthSession.mockClear();
		mockUploadReceiptImage.mockClear();
		mockAnalyzeReceiptImage.mockClear();
		mockAnalyzeTransactionText.mockClear();
		mockReceiptExtractionToDraft.mockClear();
		mockPush.mockClear();
	});
	afterEach(() => {
		delete (globalThis as any).__KASWISE_FEATURE_FLAGS__;
		mockRealtimeEnabled = true;
		mockWallets = [];
		mockMemberships = [];
		mockEntitlements = null;
		mockSearchParams = {};
	});

	it("renders an action-first hub with one idle workspace and a destination row", async () => {
		renderCapture();

		expect(screen.getByText("Catat transaksi")).toBeTruthy();
		expect(
			screen.getByText("Pilih cara tercepat. Kaswise rapikan sisanya."),
		).toBeTruthy();
		// Primary options: text + receipt only while voiceNote is off.
		expect(screen.getByTestId("capture-mode-Teks")).toBeTruthy();
		expect(screen.getByTestId("capture-mode-Foto")).toBeTruthy();
		expect(screen.queryByTestId("capture-mode-Suara")).toBeNull();
		// Exactly one workspace state at a time.
		expect(screen.getByTestId("capture-workspace-idle")).toBeTruthy();
		expect(screen.getByTestId("capture-input")).toBeTruthy();
		expect(screen.queryByTestId("capture-workspace-review")).toBeNull();
		// Destination row shows the money space (active finance context) and the
		// selected wallet together.
		const destination = screen.getByTestId("capture-destination");
		expect(destination).toBeTruthy();
		expect(screen.getByTestId("capture-wallet-selector")).toBeTruthy();
		expect(within(destination).getByText("Ruang uang")).toBeTruthy();
		expect(within(destination).getByText("Pribadi")).toBeTruthy();
		await waitFor(() =>
			expect(within(destination).getByText("BCA")).toBeTruthy(),
		);
		// Secondary actions carry accessibility labels like the other controls.
		expect(screen.getByTestId("capture-secondary-manual")).toBeTruthy();
		expect(screen.getByLabelText("Isi detail manual")).toBeTruthy();
		expect(screen.queryByTestId("capture-secondary-import")).toBeNull();
		// No Moonveo/Monveo wording anywhere in product UI.
		expect(screen.queryByText(/Moonveo|Monveo/i)).toBeNull();
	});

	it("shows the active household money space next to the selected wallet", async () => {
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		mockMemberships = [
			{ household_id: "hh-1", role: "admin", households: { name: "Keluarga Danu" } },
		];
		renderCapture();

		const destination = screen.getByTestId("capture-destination");
		expect(within(destination).getByText("Keluarga Danu")).toBeTruthy();
		expect(within(destination).queryByText("Pribadi")).toBeNull();
		await waitFor(() =>
			expect(within(destination).getByText("BCA")).toBeTruthy(),
		);
	});

	it("routes secondary actions to manual detail and import statement", () => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
		renderCapture();

		expect(screen.getByLabelText("Isi detail manual")).toBeTruthy();
		fireEvent.press(screen.getByTestId("capture-secondary-manual"));
		expect(mockPush).toHaveBeenCalledWith("/(tabs)/transaction-new");

		expect(screen.getByLabelText("Impor rekening")).toBeTruthy();
		fireEvent.press(screen.getByLabelText("Impor rekening"));
		expect(mockPush).toHaveBeenCalledWith("/(tabs)/imports");
	});

	it("renders only the selected mode panel", () => {
		renderCapture();

		expect(screen.getByLabelText("Input teks transaksi")).toBeTruthy();
		expect(screen.queryByTestId("capture-voice-card")).toBeNull();
		expect(screen.queryByTestId("capture-receipt-pick")).toBeNull();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));

		expect(screen.getByTestId("capture-receipt-pick")).toBeTruthy();
		expect(screen.queryByLabelText("Input teks transaksi")).toBeNull();
	});

	it("runs receipt photo through automatic processing into a single review workspace", async () => {
		renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));
		await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalled());
		await waitFor(() =>
			expect(screen.getByTestId("capture-workspace-review")).toBeTruthy(),
		);

		expect(screen.getByTestId("capture-receipt-preview")).toBeTruthy();
		expect(screen.getByTestId("capture-receipt-confirm")).toBeTruthy();
		// Retired duplicate manual process action; retry lives in the error state.
		expect(screen.queryByTestId("capture-receipt-process")).toBeNull();
		expect(screen.queryByTestId("capture-input")).toBeNull();
		expect(screen.queryByTestId("capture-workspace-idle")).toBeNull();
	});

	it("never exposes a duplicate receipt process action while the Foto panel is active", () => {
		renderCapture();

		expect(screen.queryByTestId("capture-receipt-process")).toBeNull();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));

		// The Foto panel is genuinely mounted (so the legacy branch would render
		// here if it leaked back into the simple hub) and must stay process-free.
		expect(screen.getByTestId("capture-receipt-pick")).toBeTruthy();
		expect(screen.queryByTestId("capture-receipt-process")).toBeNull();
		expect(screen.queryByTestId("capture-receipt-confirm")).toBeNull();
		expect(screen.queryByTestId("capture-text-submit")).toBeNull();
	});

	it("offers 'Catat transaksi lain' on success and hides the input workspace", async () => {
		renderCapture();

		fireEvent.changeText(
			screen.getByLabelText("Input teks transaksi"),
			"Beli kopi 35rb",
		);
		fireEvent.press(screen.getByTestId("capture-text-submit"));

		await waitFor(() => expect(screen.getByTestId("capture-success-new")).toBeTruthy(), {
			timeout: 4000,
		});
		expect(screen.getByText("Catat transaksi lain")).toBeTruthy();
		expect(screen.queryByText("Langsung simpan")).toBeNull();
		expect(screen.getByTestId("capture-success-review")).toBeTruthy();
		expect(screen.queryByTestId("capture-input")).toBeNull();
	});

	it("keeps retry in the error workspace when the session is missing", async () => {
		mockGetUser.mockResolvedValueOnce({ data: { user: null } } as any);
		renderCapture();

		fireEvent.changeText(
			screen.getByLabelText("Input teks transaksi"),
			"Beli kopi 35rb",
		);
		fireEvent.press(screen.getByTestId("capture-text-submit"));

		await waitFor(() => expect(screen.getByTestId("capture-error-retry")).toBeTruthy(), {
			timeout: 4000,
		});
		expect(screen.getByText(/Sesi login tidak ditemukan/)).toBeTruthy();
		expect(screen.queryByTestId("capture-input")).toBeNull();
	});

	it("hides the idle input workspace while a submission is processing", async () => {
		const resolvedAi = {
			total_amount: 35000,
			merchant: "Kopi Kenangan",
			category: "Makan & Minum",
			confidence: 0.96,
			date: "2026-07-08",
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
		};
		let resolveAi!: (value: typeof resolvedAi) => void;
		mockAnalyzeTransactionText.mockImplementationOnce(
			() =>
				new Promise<typeof resolvedAi>((resolve) => {
					resolveAi = resolve;
				}),
		);
		renderCapture();

		fireEvent.changeText(
			screen.getByLabelText("Input teks transaksi"),
			"Beli kopi 35rb",
		);
		fireEvent.press(screen.getByTestId("capture-text-submit"));

		await waitFor(() =>
			expect(screen.getByTestId("capture-processing")).toBeTruthy(),
		);
		expect(screen.queryByTestId("capture-input")).toBeNull();
		expect(screen.queryByTestId("capture-workspace-idle")).toBeNull();

		await act(async () => {
			resolveAi(resolvedAi);
		});
		await waitFor(
			() => expect(screen.getByTestId("capture-success-new")).toBeTruthy(),
			{ timeout: 4000 },
		);
	});

	it("opens the Foto panel when the entry param is ?mode=photo", () => {
		mockSearchParams = { mode: "photo" };
		renderCapture();

		expect(screen.getByTestId("capture-receipt-pick")).toBeTruthy();
		expect(screen.getByText("Scan struk belanja dengan OCR")).toBeTruthy();
		expect(screen.queryByLabelText("Input teks transaksi")).toBeNull();
		expect(screen.queryByTestId("capture-voice-card")).toBeNull();
	});

	it("falls back to the default mode when ?mode=voice is requested while voiceNote is off", () => {
		mockSearchParams = { mode: "voice" };
		renderCapture();

		expect(screen.getByLabelText("Input teks transaksi")).toBeTruthy();
		expect(screen.getByText("Ketik transaksi dengan bahasa natural")).toBeTruthy();
		expect(screen.queryByTestId("capture-voice-card")).toBeNull();
		expect(screen.queryByTestId("capture-receipt-pick")).toBeNull();
		expect(screen.queryByTestId("capture-mode-Suara")).toBeNull();
	});

	it("falls back to the default mode when ?mode=photo is locked by entitlements", () => {
		mockEntitlements = { chat_used: 0, chat_limit: 25, photo_limit: 0 };
		mockSearchParams = { mode: "photo" };
		renderCapture();

		expect(screen.getByTestId("capture-workspace-idle")).toBeTruthy();
		expect(screen.getByLabelText("Input teks transaksi")).toBeTruthy();
		expect(screen.queryByTestId("capture-receipt-pick")).toBeNull();
	});

	it("reprocesses the picked receipt photo when retrying after an error", async () => {
		mockGetReceiptAuthSession.mockResolvedValueOnce(null);
		renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));

		await waitFor(() =>
			expect(screen.getByTestId("capture-error-retry")).toBeTruthy(),
		);
		expect(screen.getByText(/Sesi login tidak ditemukan/)).toBeTruthy();
		// Nothing was processed yet and no duplicate manual action leaked in.
		expect(mockAnalyzeReceiptImage).not.toHaveBeenCalled();
		expect(screen.queryByTestId("capture-receipt-process")).toBeNull();
		expect(screen.queryByTestId("capture-receipt-confirm")).toBeNull();

		fireEvent.press(screen.getByTestId("capture-error-retry"));

		// Retry must genuinely resume receipt processing (not just reset state).
		await waitFor(() =>
			expect(screen.getByTestId("capture-workspace-review")).toBeTruthy(),
		);
		expect(mockAnalyzeReceiptImage).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId("capture-receipt-preview")).toBeTruthy();
		expect(screen.getByTestId("capture-receipt-confirm")).toBeTruthy();
		// Still no duplicate process action exposed anywhere in the tree.
		expect(screen.queryByTestId("capture-receipt-process")).toBeNull();
	});

	it("does not fire a second unattended receipt attempt when the manual retry also fails", async () => {
		mockGetReceiptAuthSession.mockResolvedValue(null);
		renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));

		await waitFor(() =>
			expect(screen.getByTestId("capture-error-retry")).toBeTruthy(),
		);
		// The auto-process effect made exactly one unattended attempt.
		expect(mockGetReceiptAuthSession).toHaveBeenCalledTimes(1);

		fireEvent.press(screen.getByTestId("capture-error-retry"));

		// Let the manual retry run to completion (it fails as well).
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});

		expect(screen.getByTestId("capture-error-retry")).toBeTruthy();
		// Exactly one attempt for the manual retry — the failed retry must not
		// hand a second unattended attempt back to the auto-process effect.
		expect(mockGetReceiptAuthSession).toHaveBeenCalledTimes(2);
	});

	it("keeps the receipt confirm action when a mid-review plan change locks photo quota", async () => {
		mockGetReceiptAuthSession.mockResolvedValue({
			access_token: "token",
			user: { id: "user-1" },
		});
		mockEntitlements = { chat_used: 0, chat_limit: 25, photo_limit: 5 };
		const view = renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));

		await waitFor(() =>
			expect(screen.getByTestId("capture-workspace-review")).toBeTruthy(),
		);
		expect(screen.getByTestId("capture-receipt-confirm")).toBeTruthy();

		// The plan downgrades mid-session while a receipt review is mounted.
		mockEntitlements = { chat_used: 0, chat_limit: 25, photo_limit: 0 };
		await act(async () => {
			view.rerender(captureTree());
		});

		// The already-mounted review must survive: its confirm action cannot
		// vanish just because the quota demotion effect fired.
		expect(screen.getByTestId("capture-workspace-review")).toBeTruthy();
		expect(screen.getByTestId("capture-receipt-confirm")).toBeTruthy();
	});
});
