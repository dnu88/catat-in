import {
	createTransaction,
	listTransactions,
	updateTransaction,
	deleteTransaction,
} from "./transactions";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase");

describe("Transaction Service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(supabase as any).auth = {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
		};
	});

	test("createTransaction should insert with required fields and return created record", async () => {
		const mockData = {
			id: "tx-123",
			wallet_id: null,
			type: "expense",
			nominal: 50000,
			kategori: "Food",
			catatan: "Lunch",
			tanggal: "2026-05-21",
		};
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockData, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		const result = await createTransaction({
			wallet_id: "w-1",
			transaction_type: "expense",
			amount: 50000,
			category: "Food",
			description: "Lunch",
		});

		expect(supabase.from).toHaveBeenCalledWith("transactions");
		expect(mockInsert).toHaveBeenCalledWith({
			user_id: "user-123",
			household_id: null,
			wallet_id: "w-1",
			type: "expense",
			nominal: 50000,
			kategori: "Food",
			catatan: "Lunch",
			created_by: "user-123",
			updated_by: "user-123",
		});
		const insertedPayload = mockInsert.mock.calls[0][0];
		expect(insertedPayload).not.toHaveProperty("transaction_type");
		expect(insertedPayload).not.toHaveProperty("amount");
		expect(insertedPayload).not.toHaveProperty("category");
		expect(insertedPayload).not.toHaveProperty("description");
		expect(insertedPayload).not.toHaveProperty("date");
		expect(insertedPayload).not.toHaveProperty("note");
		expect(mockSelect).toHaveBeenCalled();
		expect(mockSingle).toHaveBeenCalled();
		expect(result.id).toBe("tx-123");
		expect(result.transaction_type).toBe("expense");
		expect(result.amount).toBe(50000);
		expect(result.category).toBe("Food");
		expect(result.description).toBe("Lunch");
		expect(result.date).toBe("2026-05-21");
		expect(supabase.from).not.toHaveBeenCalledWith("wallets");
	});

	test("createTransaction should include optional fields when provided", async () => {
		const mockData = { id: "tx-2" };
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockData, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await createTransaction({
			wallet_id: "w-2",
			transaction_type: "income",
			amount: 1_000_000,
			category: "Salary",
			description: "Gaji April",
			merchant: "PT Acme",
			date: "2026-05-10",
			note: "gaji bulanan",
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				merchant: "PT Acme",
				tanggal: "2026-05-10",
				catatan: "gaji bulanan",
			}),
		);
		const insertedPayload = mockInsert.mock.calls[0][0];
		expect(insertedPayload).not.toHaveProperty("date");
		expect(insertedPayload).not.toHaveProperty("note");
	});

	test("listTransactions should return all transactions ordered by date desc", async () => {
		const mockTxs = [
			{ id: "tx-1", transaction_type: "expense", amount: 10000 },
			{ id: "tx-2", transaction_type: "income", amount: 500000 },
		];
		const mockIs = jest.fn().mockReturnThis();
		const query = {
			order: jest.fn().mockReturnThis(),
			is: mockIs,
			then: (resolve: any) =>
				Promise.resolve({ data: mockTxs, error: null }).then(resolve),
		};
		const mockSelect = jest.fn().mockReturnValue(query);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		const result = await listTransactions();

		expect(supabase.from).toHaveBeenCalledWith("transactions");
		expect(mockSelect).toHaveBeenCalledWith("*");
		expect(query.order).toHaveBeenCalledWith("tanggal", { ascending: false });
		expect(mockIs).toHaveBeenCalledWith("household_id", null);
		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(2);
	});

	test("lists personal transactions with household_id is null", async () => {
		const mockIs = jest.fn().mockReturnThis();
		const query = {
			order: jest.fn().mockReturnThis(),
			is: mockIs,
			then: (resolve: any) =>
				Promise.resolve({ data: [], error: null }).then(resolve),
		};
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue(query),
		});

		await listTransactions(undefined, { type: "personal" });

		expect(mockIs).toHaveBeenCalledWith("household_id", null);
	});

	test("lists household transactions by household_id", async () => {
		const mockEq = jest.fn().mockReturnThis();
		const query = {
			order: jest.fn().mockReturnThis(),
			eq: mockEq,
			then: (resolve: any) =>
				Promise.resolve({ data: [], error: null }).then(resolve),
		};
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue(query),
		});

		await listTransactions(undefined, {
			type: "household",
			householdId: "hh-1",
			role: "member",
		});

		expect(mockEq).toHaveBeenCalledWith("household_id", "hh-1");
	});

	test("creates household transaction with audit fields", async () => {
		(supabase as any).auth.getUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		const mockData = {
			id: "tx-household",
			wallet_id: null,
			transaction_type: "expense",
			amount: 10000,
		};
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockData, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await createTransaction(
			{
				transaction_type: "expense",
				amount: 10000,
				category: "Makan",
				description: "Bakso",
			},
			{ type: "household", householdId: "hh-1", role: "member" },
		);

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				household_id: "hh-1",
				created_by: "user-1",
				updated_by: "user-1",
			}),
		);
	});

	test("listTransactions should apply wallet_id filter when provided", async () => {
		const mockTxs = [{ id: "tx-1", wallet_id: "w-1" }];
		const query = {
			order: jest.fn().mockReturnThis(),
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			then: (resolve: any) =>
				Promise.resolve({ data: mockTxs, error: null }).then(resolve),
		};
		const mockSelectChain = jest.fn().mockReturnValue(query);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelectChain });

		const result = await listTransactions({ wallet_id: "w-1" });

		expect(query.eq).toHaveBeenCalledWith("wallet_id", "w-1");
		expect(Array.isArray(result)).toBe(true);
	});

	test("listTransactions should apply transaction_type filter when provided", async () => {
		const mockTxs = [{ id: "tx-2", transaction_type: "income" }];
		const query = {
			order: jest.fn().mockReturnThis(),
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			then: (resolve: any) =>
				Promise.resolve({ data: mockTxs, error: null }).then(resolve),
		};
		const mockSelect = jest.fn().mockReturnValue(query);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		const result = await listTransactions({ transaction_type: "income" });

		expect(query.eq).toHaveBeenCalledWith("type", "income");
		expect(Array.isArray(result)).toBe(true);
	});

	test("listTransactions should apply category filter when provided", async () => {
		const mockTxs = [{ id: "tx-3", category: "Food" }];
		const query = {
			order: jest.fn().mockReturnThis(),
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			then: (resolve: any) =>
				Promise.resolve({ data: mockTxs, error: null }).then(resolve),
		};
		const mockSelect = jest.fn().mockReturnValue(query);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		const result = await listTransactions({ category: "Food" });

		expect(query.eq).toHaveBeenCalledWith("kategori", "Food");
		expect(Array.isArray(result)).toBe(true);
	});

	test("createTransaction rejects household viewer before insert", async () => {
		await expect(
			createTransaction(
				{
					transaction_type: "expense",
					amount: 100,
					category: "Food",
					description: "Test",
				},
				{ type: "household", householdId: "hh-1", role: "viewer" },
			),
		).rejects.toThrow("Akses lihat saja");

		expect(supabase.from).not.toHaveBeenCalled();
	});

	test("updateTransaction fetches previous transaction for permissions and relies on database trigger for wallet balance", async () => {
		const previous = {
			id: "tx-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
			wallet_id: "w-1",
			nominal: 50000,
			type: "expense",
		};
		const updated = {
			...previous,
			nominal: 75000,
		};
		const previousSingle = jest
			.fn()
			.mockResolvedValue({ data: previous, error: null });
		const updateSingle = jest
			.fn()
			.mockResolvedValue({ data: updated, error: null });
		const mockUpdate = jest.fn().mockReturnValue({
			eq: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({ single: updateSingle }),
			}),
		});
		const transactionsSelect = jest.fn().mockReturnValue({
			eq: jest.fn().mockReturnValue({ maybeSingle: previousSingle }),
		});
		(supabase.from as jest.Mock).mockImplementation((table: string) => {
			if (table === "transactions")
				return { select: transactionsSelect, update: mockUpdate };
			throw new Error(`unexpected table ${table}`);
		});

		const result = await updateTransaction("tx-1", { amount: 75000 });

		expect(transactionsSelect.mock.invocationCallOrder[0]).toBeLessThan(
			mockUpdate.mock.invocationCallOrder[0],
		);
		expect(mockUpdate).toHaveBeenCalledWith({
			nominal: 75000,
			updated_by: "user-123",
		});
		const updatePayload = mockUpdate.mock.calls[0][0];
		expect(updatePayload).not.toHaveProperty("amount");
		expect(updatePayload).not.toHaveProperty("transaction_type");
		expect(updatePayload).not.toHaveProperty("category");
		expect(updatePayload).not.toHaveProperty("description");
		expect(updatePayload).not.toHaveProperty("date");
		expect(updatePayload).not.toHaveProperty("note");
		expect(result.amount).toBe(75000);
		expect(supabase.from).not.toHaveBeenCalledWith("wallets");
		expect(result.id).toBe("tx-1");
	});

	test("updateTransaction maps app update fields to database columns", async () => {
		const previous = {
			id: "tx-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
			wallet_id: "w-1",
			nominal: 50000,
			type: "expense",
		};
		const updated = {
			...previous,
			type: "income",
			nominal: 90000,
			kategori: "Salary",
			catatan: "Bonus",
			tanggal: "2026-05-20",
		};
		const previousSingle = jest
			.fn()
			.mockResolvedValue({ data: previous, error: null });
		const updateSingle = jest
			.fn()
			.mockResolvedValue({ data: updated, error: null });
		const mockUpdate = jest.fn().mockReturnValue({
			eq: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({ single: updateSingle }),
			}),
		});
		const transactionsSelect = jest.fn().mockReturnValue({
			eq: jest.fn().mockReturnValue({ maybeSingle: previousSingle }),
		});
		(supabase.from as jest.Mock).mockReturnValue({
			select: transactionsSelect,
			update: mockUpdate,
		});

		const result = await updateTransaction("tx-1", {
			transaction_type: "income",
			amount: 90000,
			category: "Salary",
			description: "Bonus",
			date: "2026-05-20",
			note: "Bonus",
		});

		expect(mockUpdate).toHaveBeenCalledWith({
			type: "income",
			nominal: 90000,
			kategori: "Salary",
			catatan: "Bonus",
			tanggal: "2026-05-20",
			updated_by: "user-123",
		});
		const updatePayload = mockUpdate.mock.calls[0][0];
		for (const oldKey of [
			"transaction_type",
			"amount",
			"category",
			"description",
			"date",
			"note",
		]) {
			expect(updatePayload).not.toHaveProperty(oldKey);
		}
		expect(result.transaction_type).toBe("income");
		expect(result.amount).toBe(90000);
		expect(result.category).toBe("Salary");
		expect(result.description).toBe("Bonus");
		expect(result.date).toBe("2026-05-20");
	});

	test("updateTransaction denies household member updating another member's transaction", async () => {
		const previous = {
			id: "tx-1",
			user_id: "owner-1",
			household_id: "hh-1",
			created_by: "owner-1",
			wallet_id: null,
			amount: 50000,
			transaction_type: "expense",
		};
		const previousSingle = jest
			.fn()
			.mockResolvedValue({ data: previous, error: null });
		const mockUpdate = jest.fn();
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({ maybeSingle: previousSingle }),
			}),
			update: mockUpdate,
		});

		await expect(
			updateTransaction(
				"tx-1",
				{ amount: 60000 },
				{ type: "household", householdId: "hh-1", role: "member" },
			),
		).rejects.toThrow("Akses lihat saja");

		expect(mockUpdate).not.toHaveBeenCalled();
	});

	test("deleteTransaction enforces household viewer read-only access", async () => {
		const previous = {
			id: "tx-1",
			user_id: "owner-1",
			household_id: "hh-1",
			created_by: "owner-1",
			wallet_id: null,
			amount: 50000,
			transaction_type: "expense",
		};
		const previousSingle = jest
			.fn()
			.mockResolvedValue({ data: previous, error: null });
		const mockDelete = jest.fn();
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({ maybeSingle: previousSingle }),
			}),
			delete: mockDelete,
		});

		await expect(
			deleteTransaction("tx-1", {
				type: "household",
				householdId: "hh-1",
				role: "viewer",
			}),
		).rejects.toThrow("Akses lihat saja");

		expect(mockDelete).not.toHaveBeenCalled();
	});

	test("deleteTransaction should hard-delete by id", async () => {
		const previous = {
			id: "tx-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
			wallet_id: null,
			amount: 50000,
			transaction_type: "expense",
		};
		const previousSingle = jest
			.fn()
			.mockResolvedValue({ data: previous, error: null });
		const mockEq = jest.fn().mockResolvedValue({ error: null });
		const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({ maybeSingle: previousSingle }),
			}),
			delete: mockDelete,
		});

		await expect(deleteTransaction("tx-1")).resolves.toBeUndefined();

		expect(supabase.from).toHaveBeenCalledWith("transactions");
		expect(supabase.from).not.toHaveBeenCalledWith("wallets");
		expect(mockDelete).toHaveBeenCalled();
		expect(mockEq).toHaveBeenCalledWith("id", "tx-1");
	});

	test("createTransaction should throw when Supabase returns error", async () => {
		const mockError = { message: "Insert failed", code: "500" };
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: null, error: mockError });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await expect(
			createTransaction({
				wallet_id: "w-1",
				transaction_type: "expense",
				amount: 100,
				category: "Food",
				description: "Test",
			}),
		).rejects.toEqual(mockError);
	});
});
