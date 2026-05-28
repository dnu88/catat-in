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
const mockInsert = jest.fn();
const mockInvoke = jest.fn();
const mockGetUser = jest.fn(async () => ({ data: { user: { id: "user-1" } } }));
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
	useSupabase: () => ({
		supabase: {
			auth: { getUser: mockGetUser },
			from: jest.fn(() => ({
				insert: mockInsert,
			})),
			functions: { invoke: mockInvoke },
		},
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
		mockInsert.mockReset();
		mockInvoke.mockReset();
		mockGetUser.mockClear();
		mockInsert.mockReturnValue({
			select: () => ({
				single: async () => ({ data: { id: "tx-created" }, error: null }),
			}),
		});
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

		await waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));
		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: "user-1",
				household_id: "hh-1",
				created_by: "user-1",
				updated_by: "user-1",
				input_type: "text",
				status: "done",
				raw_input: "Beli kopi 35rb",
				type: "expense",
				nominal: 35000,
				kategori: "Makanan & Minuman",
				catatan: "Beli kopi 35rb",
			}),
		);
		expect(mockInvoke).not.toHaveBeenCalled();
	});
});
