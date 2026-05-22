import { createBill, listBills, updateBill, deleteBill } from "./bills";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase");

describe("Bill Service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(supabase.from as jest.Mock).mockReset();
		(supabase as any).auth = {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
		};
	});

	test("createBill should insert with defaults and return bill", async () => {
		const mockBill = {
			id: "bill-1",
			name: "Internet",
			amount: 300000,
			notify_before_days: 3,
			is_paid: false,
			payment_history: [],
		};
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockBill, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		const result = await createBill({
			name: "Internet",
			amount: 300000,
			due_day: 15,
			recurrence: "monthly",
			next_due_date: "2026-05-15",
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: "user-123",
				household_id: null,
				created_by: "user-123",
				updated_by: "user-123",
				name: "Internet",
				amount: 300000,
				due_day: 15,
				recurrence: "monthly",
				next_due_date: "2026-05-15",
				notify_before_days: 3,
				is_paid: false,
				payment_history: [],
			}),
		);
		expect(result.id).toBe("bill-1");
		expect(result.is_paid).toBe(false);
		expect(result.payment_history).toEqual([]);
	});

	test("createBill should respect custom notify_before_days", async () => {
		const mockBill = { id: "bill-2", notify_before_days: 7 };
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockBill, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await createBill({
			name: "Rent",
			amount: 2000000,
			due_day: 1,
			recurrence: "monthly",
			next_due_date: "2026-06-01",
			notify_before_days: 7,
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({ notify_before_days: 7 }),
		);
	});

	test("listBills should return array ordered by next_due_date asc", async () => {
		const mockBills = [
			{ id: "bill-1", next_due_date: "2026-05-10" },
			{ id: "bill-2", next_due_date: "2026-05-20" },
		];
		const mockOrder = jest
			.fn()
			.mockResolvedValue({ data: mockBills, error: null });
		const chain = { is: jest.fn().mockReturnThis(), order: mockOrder };
		const mockSelect = jest.fn().mockReturnValue(chain);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		const result = await listBills();

		expect(supabase.from).toHaveBeenCalledWith("bill_reminders");
		expect(mockSelect).toHaveBeenCalledWith("*");
		expect(mockOrder).toHaveBeenCalledWith("next_due_date", {
			ascending: true,
		});
		expect(result).toHaveLength(2);
	});

	test("updateBill fetches existing row, checks permission, updates with audit, and returns updated record", async () => {
		const existing = {
			id: "bill-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
		};
		const updated = { id: "bill-1", is_paid: true };
		const fetchSingle = jest
			.fn()
			.mockResolvedValue({ data: existing, error: null });
		const fetchEq = jest.fn().mockReturnValue({ single: fetchSingle });
		const fetchSelect = jest.fn().mockReturnValue({ eq: fetchEq });
		const updateSingle = jest
			.fn()
			.mockResolvedValue({ data: updated, error: null });
		const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
		const updateEq = jest.fn().mockReturnValue({ select: updateSelect });
		const mockUpdate = jest.fn().mockReturnValue({ eq: updateEq });
		(supabase.from as jest.Mock)
			.mockReturnValueOnce({ select: fetchSelect })
			.mockReturnValueOnce({ update: mockUpdate });

		const result = await updateBill("bill-1", { is_paid: true });

		expect(fetchSelect).toHaveBeenCalledWith(
			"id,user_id,household_id,created_by",
		);
		expect(fetchEq).toHaveBeenCalledWith("id", "bill-1");
		expect(mockUpdate).toHaveBeenCalledWith({
			is_paid: true,
			updated_by: "user-123",
		});
		expect(updateEq).toHaveBeenCalledWith("id", "bill-1");
		expect(result.id).toBe("bill-1");
	});

	test("deleteBill fetches existing row, checks permission, then hard-deletes the record", async () => {
		const existing = {
			id: "bill-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
		};
		const fetchSingle = jest
			.fn()
			.mockResolvedValue({ data: existing, error: null });
		const fetchEq = jest.fn().mockReturnValue({ single: fetchSingle });
		const fetchSelect = jest.fn().mockReturnValue({ eq: fetchEq });
		const deleteEq = jest.fn().mockResolvedValue({ error: null });
		const mockDelete = jest.fn().mockReturnValue({ eq: deleteEq });
		(supabase.from as jest.Mock)
			.mockReturnValueOnce({ select: fetchSelect })
			.mockReturnValueOnce({ delete: mockDelete });

		await expect(deleteBill("bill-1")).resolves.toBeUndefined();

		expect(fetchSelect).toHaveBeenCalledWith(
			"id,user_id,household_id,created_by",
		);
		expect(fetchEq).toHaveBeenCalledWith("id", "bill-1");
		expect(mockDelete).toHaveBeenCalled();
		expect(deleteEq).toHaveBeenCalledWith("id", "bill-1");
	});

	test("updateBill rejects viewer context before updating", async () => {
		const existing = {
			id: "bill-1",
			user_id: "user-456",
			household_id: "hh-1",
			created_by: "user-456",
		};
		const fetchSingle = jest
			.fn()
			.mockResolvedValue({ data: existing, error: null });
		const fetchEq = jest.fn().mockReturnValue({ single: fetchSingle });
		const fetchSelect = jest.fn().mockReturnValue({ eq: fetchEq });
		const mockUpdate = jest.fn();
		(supabase.from as jest.Mock)
			.mockReturnValueOnce({ select: fetchSelect })
			.mockReturnValueOnce({ update: mockUpdate });

		await expect(
			updateBill(
				"bill-1",
				{ is_paid: true },
				{ type: "household", householdId: "hh-1", role: "viewer" },
			),
		).rejects.toThrow("Akses lihat saja");
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	test("member cannot update or delete another member bill row", async () => {
		const existing = {
			id: "bill-1",
			user_id: "user-456",
			household_id: "hh-1",
			created_by: "user-456",
		};
		const fetchSingle = jest
			.fn()
			.mockResolvedValue({ data: existing, error: null });
		const fetchEq = jest.fn().mockReturnValue({ single: fetchSingle });
		const fetchSelect = jest.fn().mockReturnValue({ eq: fetchEq });
		(supabase.from as jest.Mock).mockReturnValue({ select: fetchSelect });

		await expect(
			updateBill(
				"bill-1",
				{ is_paid: true },
				{ type: "household", householdId: "hh-1", role: "member" },
			),
		).rejects.toThrow("Tidak diizinkan");
		await expect(
			deleteBill("bill-1", {
				type: "household",
				householdId: "hh-1",
				role: "member",
			}),
		).rejects.toThrow("Tidak diizinkan");
	});

	test("member can update own household bill row", async () => {
		const existing = {
			id: "bill-1",
			user_id: "user-123",
			household_id: "hh-1",
			created_by: "user-123",
		};
		const updated = { id: "bill-1", is_paid: true };
		const fetchSingle = jest
			.fn()
			.mockResolvedValue({ data: existing, error: null });
		const fetchEq = jest.fn().mockReturnValue({ single: fetchSingle });
		const fetchSelect = jest.fn().mockReturnValue({ eq: fetchEq });
		const updateSingle = jest
			.fn()
			.mockResolvedValue({ data: updated, error: null });
		const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
		const updateEq = jest.fn().mockReturnValue({ select: updateSelect });
		const mockUpdate = jest.fn().mockReturnValue({ eq: updateEq });
		(supabase.from as jest.Mock)
			.mockReturnValueOnce({ select: fetchSelect })
			.mockReturnValueOnce({ update: mockUpdate });

		await expect(
			updateBill(
				"bill-1",
				{ is_paid: true },
				{ type: "household", householdId: "hh-1", role: "member" },
			),
		).resolves.toEqual(updated);
		expect(mockUpdate).toHaveBeenCalledWith({
			is_paid: true,
			updated_by: "user-123",
		});
	});

	test("listBills filters personal rows to household_id null", async () => {
		const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
		const chain = {
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: mockOrder,
		};
		const mockSelect = jest.fn().mockReturnValue(chain);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		await listBills({ type: "personal" });

		expect(chain.is).toHaveBeenCalledWith("household_id", null);
	});

	test("listBills filters household rows by household_id", async () => {
		const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
		const chain = {
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: mockOrder,
		};
		const mockSelect = jest.fn().mockReturnValue(chain);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		await listBills({ type: "household", householdId: "hh-1", role: "admin" });

		expect(chain.eq).toHaveBeenCalledWith("household_id", "hh-1");
	});

	test("createBill rejects viewer context", async () => {
		await expect(
			createBill(
				{
					name: "Rent",
					amount: 1,
					due_day: 1,
					recurrence: "monthly",
					next_due_date: "2026-06-01",
				},
				{ type: "household", householdId: "hh-1", role: "viewer" },
			),
		).rejects.toThrow("Akses lihat saja");
	});

	test("createBill includes household audit fields", async () => {
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: { id: "bill-3" }, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await createBill(
			{
				name: "Rent",
				amount: 1,
				due_day: 1,
				recurrence: "monthly",
				next_due_date: "2026-06-01",
			},
			{ type: "household", householdId: "hh-1", role: "admin" },
		);

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				household_id: "hh-1",
				created_by: "user-123",
				updated_by: "user-123",
			}),
		);
	});

	test("createBill should throw when Supabase returns error", async () => {
		const mockError = { message: "Insert failed", code: "400" };
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: null, error: mockError });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await expect(
			createBill({
				name: "Fail",
				amount: 0,
				due_day: 1,
				recurrence: "once",
				next_due_date: "2026-05-01",
			}),
		).rejects.toEqual(mockError);
	});
});
