import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";

import CaptureScreen from "../app/(tabs)/capture";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

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
const mockUploadReceiptImage = jest.fn(async (..._args: unknown[]) => "user-1/receipt.jpg");
const mockAnalyzeReceiptImage = jest.fn(async (..._args: unknown[]) => ({ total_amount: 125000, merchant: "RM Sederhana", confidence: 0.92 }));
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
		transaction: {
			id: "tx-1",
			status: "done",
			confidence: 0.9,
			category: "Makan & Minum",
			description: "Kopi Kenangan",
			envelope_suggestion: mockEnvelopeSuggestion,
		},
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
	uploadReceiptImage: (...args: unknown[]) => mockUploadReceiptImage(...args),
	analyzeReceiptImage: (...args: unknown[]) => mockAnalyzeReceiptImage(...args),
	receiptExtractionToDraft: (...args: unknown[]) => mockReceiptExtractionToDraft(...args),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => [
		{ id: "cat-food", user_id: "user-1", name: "Food & Beverage", icon: "food", is_default: true, type: "expense", created_at: "" },
		{ id: "cat-groceries", user_id: "user-1", name: "Groceries", icon: "wallet", is_default: true, type: "expense", created_at: "" },
	]),
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn(async () => []),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: true,
	}),
}));

jest.mock("../src/lib/supabase", () => ({
	supabase: mockSupabaseClient,
	useSupabase: () => ({
		supabase: mockSupabaseClient,
	}),
}));

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

function renderCapture() {
	return render(
		<I18nProvider>
			<ThemeProvider>
				<CaptureScreen />
			</ThemeProvider>
		</I18nProvider>,
	);
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
		mockUploadReceiptImage.mockClear();
		mockAnalyzeReceiptImage.mockClear();
		mockReceiptExtractionToDraft.mockClear();
		mockInsert.mockImplementation((payload) => ({
			select: () => ({
				single: async () => ({ data: { id: "tx-created", ...payload }, error: null }),
			}),
		}));
		mockInvoke.mockResolvedValue({ data: null, error: null });
		mockActiveContext = { type: "personal" };
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

		expect(screen.getByText(/Dompet/i)).toBeTruthy();
		expect(screen.getByText(/Kopi/i)).toBeTruthy();
		expect(screen.getByText(/17\.000|Rp17\.000 tersisa/i)).toBeTruthy();
		expect(screen.getByText(/Langsung simpan/i)).toBeTruthy();
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
			screen.getByPlaceholderText(/Beli kopi/i),
			"Beli kopi 35rb",
		);
		fireEvent.press(screen.getByText("Proses dengan AI"));

		await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
		expect(mockCreateTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				wallet_id: null,
				transaction_type: "expense",
				amount: 35000,
				category: "Makan & Minum",
				description: "Beli kopi 35rb",
				note: "Beli kopi 35rb",
				input_type: "text",
				status: "done",
				raw_input: "Beli kopi 35rb",
			}),
			mockActiveContext,
		);
		expect(mockInvoke).not.toHaveBeenCalled();
	});

	it("follows the selected app language for Capture copy", async () => {
		jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) =>
			key === "kaswise:language-preference" ? "en" : null,
		);
		mockEnvelopeSuggestion = null;

		renderCapture();

		expect(await screen.findByText("Track automatically with artificial intelligence.")).toBeTruthy();
		expect(screen.getByText("Text")).toBeTruthy();
		expect(screen.getByText("Photo")).toBeTruthy();
		expect(screen.getByText("Process with AI")).toBeTruthy();
	});

	it("processes a receipt photo preview and confirms it as an image transaction", async () => {
		mockEnvelopeSuggestion = null;
		renderCapture();

		fireEvent.press(screen.getByTestId("capture-mode-Foto"));
		fireEvent.press(screen.getByTestId("capture-receipt-pick"));

		await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalled());
		expect(screen.getByTestId("capture-receipt-process")).toBeTruthy();

		fireEvent.press(screen.getByTestId("capture-receipt-process"));
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
});
