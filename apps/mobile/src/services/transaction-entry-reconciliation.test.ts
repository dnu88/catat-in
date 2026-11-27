import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./currentUser";
import { createDraft } from "../features/transaction-entry/draft";
import { reconcileEntry } from "./transaction-entry-persistence";

jest.mock("../lib/supabase");
jest.mock("./currentUser", () => ({ getCurrentUserId: jest.fn() }));
jest.mock("./budget-envelopes", () => ({
	syncEnvelopeAllocationForTransaction: jest.fn(),
}));
const draft = (key = "d1") =>
	createDraft({
		key,
		source: "text",
		transactionType: "expense",
		amount: 35000,
		category: "Makan & Minum",
		description: "Lunch",
		walletId: "w-1",
		date: "2026-10-02",
	});
const input = () => ({
	requestId: "req-1",
	fingerprint: "fp-1",
	context: { id: "personal", label: "Pribadi", canCreate: true },
	drafts: [draft()],
});
const operation = (overrides: Record<string, unknown> = {}) => ({
	user_id: "user-1",
	household_id: null,
	request_id: "req-1",
	fingerprint: "fp-1",
	transaction_ids: ["tx-1"],
	...overrides,
});
const row = {
	id: "tx-1",
	user_id: "user-1",
	household_id: null,
	wallet_id: "w-1",
	type: "expense",
	nominal: 35000,
	kategori: "Makan & Minum",
	catatan: "Lunch",
	tanggal: "2026-10-02",
	created_at: "2026-10-02T01:00:00Z",
};
function queries(
	operations: unknown[],
	rows: unknown[],
	error: unknown = null,
) {
	const make = (data: unknown[], queryError: unknown = null) => ({
		select: jest.fn().mockReturnThis(),
		is: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		then: (
			resolve: (value: unknown) => unknown,
			reject?: (reason: unknown) => unknown,
		) => Promise.resolve({ data, error: queryError }).then(resolve, reject),
	});
	const ops = make(operations, error);
	const txs = make(rows);
	(supabase.from as jest.Mock).mockImplementation((table: string) =>
		table === "transaction_entry_operations" ? ops : txs,
	);
	return { ops, txs };
}
beforeEach(() => {
	jest.clearAllMocks();
	(getCurrentUserId as jest.Mock).mockResolvedValue("user-1");
});
afterEach(() => {
	expect(supabase.rpc).not.toHaveBeenCalled();
});
describe("request-scoped read-only reconciliation", () => {
	test("unrelated same amount/date/category row is not proof when operation is missing", async () => {
		queries(
			[],
			[{ ...row, id: "unrelated", wallet_id: "other-wallet", type: "income" }],
		);
		expect(await reconcileEntry(input())).toEqual([]);
		expect(supabase.from).not.toHaveBeenCalledWith("transactions");
	});
	test("partial batch is not a successful reconciliation", async () => {
		queries([operation({ transaction_ids: ["tx-1", "tx-2"] })], [row]);
		expect(
			await reconcileEntry({ ...input(), drafts: [draft(), draft("d2")] }),
		).toEqual([]);
	});
	test("returns exactly the complete request batch in recorded ID order", async () => {
		const { ops, txs } = queries(
			[operation({ transaction_ids: ["tx-1", "tx-2"] })],
			[{ ...row, id: "tx-2" }, row],
		);
		const result = await reconcileEntry({
			...input(),
			drafts: [draft(), draft("d2")],
		});
		expect(result.map((tx) => tx.id)).toEqual(["tx-1", "tx-2"]);
		expect(ops.eq).toHaveBeenCalledWith("request_id", "req-1");
		expect(ops.eq).toHaveBeenCalledWith("user_id", "user-1");
		expect(ops.is).toHaveBeenCalledWith("household_id", null);
		expect(txs.in).toHaveBeenCalledWith("id", ["tx-1", "tx-2"]);
		expect(txs.is).toHaveBeenCalledWith("household_id", null);
		expect(txs.gte).not.toHaveBeenCalled();
	});
	test("household operation and transactions use the exact context", async () => {
		const { ops, txs } = queries(
			[operation({ household_id: "hh-1" })],
			[{ ...row, household_id: "hh-1" }],
		);
		expect(
			await reconcileEntry({
				...input(),
				context: { id: "hh-1", label: "Keluarga", canCreate: true },
			}),
		).toHaveLength(1);
		expect(ops.eq).toHaveBeenCalledWith("household_id", "hh-1");
		expect(txs.eq).toHaveBeenCalledWith("household_id", "hh-1");
	});
	test("fingerprint mismatch is a conflict, not a matching transaction", async () => {
		queries([operation({ fingerprint: "different" })], [row]);
		await expect(reconcileEntry(input())).rejects.toMatchObject({
			kind: "conflict",
		});
	});
	test.each([
		["pending/empty IDs", { transaction_ids: [] }],
		["too few IDs", { transaction_ids: ["tx-1"] }],
		["duplicate IDs", { transaction_ids: ["tx-1", "tx-1"] }],
		["invalid IDs", { transaction_ids: ["tx-1", null] }],
		["wrong request", { request_id: "other" }],
		["wrong user", { user_id: "other" }],
		["wrong context", { household_id: "other" }],
	])("does not confirm %s", async (_name, overrides) => {
		queries(
			[operation({ transaction_ids: ["tx-1", "tx-2"], ...overrides })],
			[row, { ...row, id: "tx-2" }],
		);
		expect(
			await reconcileEntry({ ...input(), drafts: [draft(), draft("d2")] }),
		).toEqual([]);
	});
	test.each([
		["extra unrelated row", [row, { ...row, id: "unrelated" }]],
		["wrong returned ID", [{ ...row, id: "unrelated" }]],
		["wrong row context", [{ ...row, household_id: "other" }]],
		["wrong row owner", [{ ...row, user_id: "other" }]],
		["no surviving rows", []],
	])("does not confirm %s", async (_name, rows) => {
		queries([operation()], rows);
		expect(await reconcileEntry(input())).toEqual([]);
	});
	test("duplicate returned IDs cannot satisfy a two-draft batch", async () => {
		queries([operation({ transaction_ids: ["tx-1", "tx-2"] })], [row, row]);
		expect(
			await reconcileEntry({ ...input(), drafts: [draft(), draft("d2")] }),
		).toEqual([]);
	});
	test("multiple operation rows are not proof", async () => {
		queries([operation(), operation()], [row]);
		expect(await reconcileEntry(input())).toEqual([]);
	});
	test("missing request identity never reads transactions", async () => {
		queries([operation()], [row]);
		expect(await reconcileEntry({ ...input(), requestId: "" })).toEqual([]);
		expect(supabase.from).not.toHaveBeenCalled();
	});
	test("a rejected transport read stays a network failure", async () => {
		const { ops } = queries([operation()], [row]);
		ops.then = (_resolve, reject) =>
			Promise.reject(new TypeError("Failed to fetch")).then(undefined, reject);
		await expect(reconcileEntry(input())).rejects.toMatchObject({
			kind: "network",
		});
		expect(supabase.from).not.toHaveBeenCalledWith("transactions");
	});
	test("transaction read failure does not confirm the batch", async () => {
		const { txs } = queries([operation()], [row]);
		txs.then = (resolve) =>
			Promise.resolve({
				data: null,
				error: { code: "42501", message: "permission denied" },
			}).then(resolve);
		await expect(reconcileEntry(input())).rejects.toMatchObject({
			kind: "permission",
		});
	});
	test("read failures stay failures with no fallback heuristic", async () => {
		queries([], [row], { message: "Network request failed" });
		await expect(reconcileEntry(input())).rejects.toMatchObject({
			kind: "network",
		});
		expect(supabase.from).not.toHaveBeenCalledWith("transactions");
	});
});
