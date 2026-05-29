import React from "react";
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
				category: "Food & Beverage",
				description: "Beli kopi 35rb",
				note: "Beli kopi 35rb",
				input_type: "text",
				status: "done",
				raw_input: "Beli kopi 35rb",
				ai_extracted: expect.objectContaining({
					category_id: "cat-food",
					category_name: "Food & Beverage",
					matched_keywords: expect.arrayContaining(["kopi"]),
				}),
			}),
			mockActiveContext,
		);
		expect(mockInvoke).not.toHaveBeenCalled();
	});
});
