import { supabase } from "../lib/supabase";
import { syncEnvelopeAllocationForTransaction } from "./budget-envelopes";
import { getCurrentUserId } from "./currentUser";
import {
	createDraft,
	type TransactionDraft,
} from "../features/transaction-entry/draft";
import type { ContextSnapshot } from "../features/transaction-entry/state";
import {
	EntryPersistenceError,
	reconcileEntry,
	saveEntry,
} from "./transaction-entry-persistence";

jest.mock("../lib/supabase");
jest.mock("./currentUser", () => ({ getCurrentUserId: jest.fn() }));
jest.mock("./budget-envelopes", () => ({
	syncEnvelopeAllocationForTransaction: jest.fn(),
}));

const personalContext: ContextSnapshot = {
	id: "personal",
	label: "Pribadi",
	canCreate: true,
};
const householdContext: ContextSnapshot = {
	id: "hh-1",
	label: "Keluarga Danu",
	canCreate: true,
};

const wallets = [
	{ id: "w-1", name: "Seabank" },
	{ id: "w-2", name: "Dompet Keluarga" },
];
const categories = [{ name: "Makan & Minum" }];

function draft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return createDraft({
		source: "text",
		key: "d1",
		transactionType: "expense",
		amount: 35000,
		category: "Makan & Minum",
		description: "Lunch",
		walletId: "w-1",
		date: "2026-10-02",
		...overrides,
	});
}

const insertedRow = {
	id: "tx-1",
	user_id: "user-1",
	wallet_id: "w-1",
	type: "expense",
	nominal: 35000,
	kategori: "Makan & Minum",
	catatan: "Lunch",
	tanggal: "2026-10-02",
	created_at: "2026-10-02T01:00:00Z",
};

beforeEach(() => {
	jest.clearAllMocks();
	(getCurrentUserId as jest.Mock).mockResolvedValue("user-1");
	(syncEnvelopeAllocationForTransaction as jest.Mock).mockResolvedValue(
		undefined,
	);
	(supabase.rpc as jest.Mock).mockResolvedValue({
		data: [insertedRow],
		error: null,
	});
});

describe("saveEntry RPC arguments", () => {
	test("calls create_transaction_entry_v2 with exact params for a personal save", async () => {
		const result = await saveEntry({
			requestId: "req-personal",
			fingerprint: "fp-personal",
			context: personalContext,
			drafts: [draft()],
			wallets,
			categories,
		});

		expect(supabase.rpc).toHaveBeenCalledTimes(1);
		expect(supabase.rpc).toHaveBeenCalledWith("create_transaction_entry_v2", {
			p_request_id: "req-personal",
			p_fingerprint: "fp-personal",
			p_context_type: "personal",
			p_household_id: null,
			p_drafts: [
				{
					wallet_id: "w-1",
					target_wallet_id: null,
					transaction_type: "expense",
					amount: 35000,
					category: "Makan & Minum",
					description: "Lunch",
					merchant: null,
					date: "2026-10-02",
					receipt_url: null,
					input_type: "text",
					status: "done",
					raw_input: null,
					review_required: false,
					is_verified: false,
					confidence: null,
				},
			],
		});
		expect(result.transactions).toHaveLength(1);
	});

	test("calls create_transaction_entry_v2 with the household id for a household save", async () => {
		await saveEntry({
			requestId: "req-household",
			fingerprint: "fp-household",
			context: householdContext,
			drafts: [draft({ walletId: "w-2" })],
			wallets,
			categories,
		});

		const [, params] = (supabase.rpc as jest.Mock).mock.calls[0];
		expect(params.p_request_id).toBe("req-household");
		expect(params.p_context_type).toBe("household");
		expect(params.p_household_id).toBe("hh-1");
		expect(params.p_drafts[0].wallet_id).toBe("w-2");
	});
});

describe("saveEntry normalisation and budget sync", () => {
	test("normalises legacy columns and does not warn when the sync succeeds", async () => {
		const result = await saveEntry({
			requestId: "req-1",
			fingerprint: "fp-1",
			context: personalContext,
			drafts: [draft()],
			wallets,
			categories,
		});

		const [transaction] = result.transactions;
		expect(transaction.id).toBe("tx-1");
		expect(transaction.transaction_type).toBe("expense");
		expect(transaction.amount).toBe(35000);
		expect(transaction.category).toBe("Makan & Minum");
		expect(transaction.description).toBe("Lunch");
		expect(transaction.date).toBe("2026-10-02");
		expect(result.budgetSyncWarning).toBe(false);
		expect(syncEnvelopeAllocationForTransaction).toHaveBeenCalledTimes(1);
	});

	test("a budget-sync failure sets budgetSyncWarning without failing the save", async () => {
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		(syncEnvelopeAllocationForTransaction as jest.Mock).mockRejectedValue(
			new Error("allocation table unavailable"),
		);

		const result = await saveEntry({
			requestId: "req-2",
			fingerprint: "fp-2",
			context: personalContext,
			drafts: [draft()],
			wallets,
			categories,
		});

		expect(result.budgetSyncWarning).toBe(true);
		expect(result.transactions).toHaveLength(1);
		errorSpy.mockRestore();
	});
});

describe("saveEntry local validation and permissions", () => {
	test("throws kind validation with per-draft errors and never calls the network", async () => {
		const good = draft({ key: "good" });
		const bad = draft({ key: "bad", amount: null });

		await expect(
			saveEntry({
				requestId: "req-bad",
				fingerprint: "fp-bad",
				context: personalContext,
				drafts: [good, bad],
				wallets,
				categories,
			}),
		).rejects.toMatchObject({
			name: "EntryPersistenceError",
			kind: "validation",
			fields: { bad: { amount: "INVALID_AMOUNT" } },
			message: "Periksa kembali data transaksi.",
		});

		expect(supabase.rpc).not.toHaveBeenCalled();
	});

	test("skips category membership when the caller supplies no categories", async () => {
		await expect(
			saveEntry({
				requestId: "req-3",
				fingerprint: "fp-3",
				context: personalContext,
				drafts: [draft({ category: "Kategori Baru" })],
				wallets,
			}),
		).resolves.toBeDefined();
	});

	test("rejects a viewer context with kind permission without a network call", async () => {
		const viewerContext: ContextSnapshot = {
			id: "hh-1",
			label: "Keluarga",
			canCreate: false,
		};

		await expect(
			saveEntry({
				requestId: "req-viewer",
				fingerprint: "fp-viewer",
				context: viewerContext,
				drafts: [draft({ walletId: "w-2" })],
				wallets,
				categories,
			}),
		).rejects.toMatchObject({
			name: "EntryPersistenceError",
			kind: "permission",
			message: "Akses lihat saja",
		});

		expect(supabase.rpc).not.toHaveBeenCalled();
	});
});

describe("saveEntry error mapping", () => {
	async function catchError(
		error: unknown,
		thrown = false,
	): Promise<EntryPersistenceError> {
		if (thrown) {
			(supabase.rpc as jest.Mock).mockRejectedValue(error);
		} else {
			(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error });
		}
		try {
			await saveEntry({
				requestId: "req-err",
				fingerprint: "fp-err",
				context: personalContext,
				drafts: [draft()],
				wallets,
				categories,
			});
		} catch (caught) {
			return caught as EntryPersistenceError;
		}
		throw new Error("expected saveEntry to reject");
	}

	test("maps an RLS/permission error to kind permission", async () => {
		const raw = {
			code: "42501",
			message: "permission denied for table transactions",
		};
		const error = await catchError(raw);
		expect(error).toBeInstanceOf(EntryPersistenceError);
		expect(error.kind).toBe("permission");
		expect(error.cause).toBe(raw);
		expect(error.message).toBe("Akses lihat saja");
		expect(error.message).not.toContain("permission denied");
	});

	test("maps a fingerprint mismatch to kind conflict", async () => {
		const raw = {
			code: "23505",
			message:
				'ENTRY_REQUEST_CONFLICT: request abc was already recorded with a different payload',
		};
		const error = await catchError(raw);
		expect(error.kind).toBe("conflict");
		expect(error.cause).toBe(raw);
		expect(error.message).not.toContain("ENTRY_REQUEST_CONFLICT");
	});

	test("maps a thrown transport failure to kind network", async () => {
		const raw = new TypeError("Network request failed");
		const error = await catchError(raw, true);
		expect(error.kind).toBe("network");
		expect(error.cause).toBe(raw);
		expect(error.message).toBe("Koneksi bermasalah. Coba lagi.");
	});

	test("maps anything else to kind unknown without leaking backend text", async () => {
		const raw = { code: "XX000", message: "internal boom" };
		const error = await catchError(raw);
		expect(error.kind).toBe("unknown");
		expect(error.cause).toBe(raw);
		expect(error.message).not.toContain("boom");
	});
});

describe("reconcileEntry", () => {
	function queryWith(rows: unknown[]) {
		return {
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			then: (resolve: (value: unknown) => unknown) =>
				Promise.resolve({ data: rows, error: null }).then(resolve),
		};
	}

	test("filters by context and time window, matches amount+date+category, and writes nothing", async () => {
		const query = queryWith([
			{
				id: "tx-match",
				type: "expense",
				nominal: 35000,
				kategori: "Makan & Minum",
				tanggal: "2026-10-02",
				created_at: "2026-10-02T01:00:00Z",
			},
			{
				id: "tx-other-amount",
				type: "expense",
				nominal: 40000,
				kategori: "Makan & Minum",
				tanggal: "2026-10-02",
				created_at: "2026-10-02T01:00:00Z",
			},
			{
				id: "tx-other-category",
				type: "expense",
				nominal: 35000,
				kategori: "Transportasi",
				tanggal: "2026-10-02",
				created_at: "2026-10-02T01:00:00Z",
			},
			{
				id: "tx-other-date",
				type: "expense",
				nominal: 35000,
				kategori: "Makan & Minum",
				tanggal: "2026-09-30",
				created_at: "2026-09-30T01:00:00Z",
			},
		]);
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue(query),
		});

		const result = await reconcileEntry({
			context: personalContext,
			drafts: [draft()],
			sinceIso: "2026-10-02T00:00:00Z",
		});

		expect(supabase.from).toHaveBeenCalledWith("transactions");
		expect(
			(supabase.from as jest.Mock).mock.calls.every(
				([table]) => table === "transactions",
			),
		).toBe(true);
		expect(query.is).toHaveBeenCalledWith("household_id", null);
		expect(query.gte).toHaveBeenCalledWith(
			"created_at",
			"2026-10-02T00:00:00Z",
		);
		expect(result.map((transaction) => transaction.id)).toEqual(["tx-match"]);
		expect(supabase.rpc).not.toHaveBeenCalled();
	});

	test("scopes a household reconciliation by household_id", async () => {
		const query = queryWith([
			{
				id: "tx-hh",
				type: "expense",
				nominal: 35000,
				kategori: "Makan & Minum",
				tanggal: "2026-10-02",
				created_at: "2026-10-02T01:00:00Z",
			},
		]);
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue(query),
		});

		const result = await reconcileEntry({
			context: householdContext,
			drafts: [draft({ walletId: "w-2" })],
			sinceIso: "2026-10-02T00:00:00Z",
		});

		expect(query.eq).toHaveBeenCalledWith("household_id", "hh-1");
		expect(result.map((transaction) => transaction.id)).toEqual(["tx-hh"]);
	});
});
