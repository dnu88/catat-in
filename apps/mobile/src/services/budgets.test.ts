import {
	createBudget,
	listBudgets,
	updateBudget,
	deleteBudget,
} from "./budgets";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase");

describe("Budget Service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(supabase as any).auth = {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
		};
	});

	test("createBudget should insert with defaults and return budget", async () => {
		const mockBudget = {
			id: "b-1",
			category: "Makan",
			limit_amount: 500000,
			period: "monthly",
			period_start: "2026-05-01",
			notify_at_percent: 80,
			is_active: true,
		};
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockBudget, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		const result = await createBudget({
			category: "Makan",
			limit_amount: 500000,
			period_start: "2026-05-01",
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: "user-123",
				household_id: null,
				created_by: "user-123",
				updated_by: "user-123",
				category: "Makan",
				limit_amount: 500000,
				period_start: "2026-05-01",
				period: "monthly",
				notify_at_percent: 80,
				is_active: true,
			}),
		);
		expect(result.id).toBe("b-1");
		expect(result.is_active).toBe(true);
	});

	test("createBudget should respect custom period and notify_at_percent", async () => {
		const mockBudget = { id: "b-2", period: "yearly", notify_at_percent: 70 };
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockBudget, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await createBudget({
			category: "Tagihan",
			limit_amount: 2000000,
			period_start: "2026-01-01",
			period: "yearly",
			notify_at_percent: 70,
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				period: "yearly",
				notify_at_percent: 70,
			}),
		);
	});

	test("listBudgets should select deployed schema columns and order by period_start desc", async () => {
		const mockBudgets = [
			{ id: "b-1", period_start: "2026-05-01" },
			{ id: "b-2", period_start: "2026-04-01" },
		];
		const mockOrder = jest
			.fn()
			.mockResolvedValue({ data: mockBudgets, error: null });
		const chain = {
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: mockOrder,
		};
		const mockSelect = jest.fn().mockReturnValue(chain);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		const result = await listBudgets();

		expect(supabase.from).toHaveBeenCalledWith("budgets");
		expect(mockSelect).toHaveBeenCalledWith("*");
		expect(mockOrder).toHaveBeenCalledWith("period_start", { ascending: false });
		expect(result).toHaveLength(2);
	});

	test("updateBudget should call update/eq/select/single and return updated record", async () => {
		const updated = { id: "b-1", limit_amount: 800000 };
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: updated, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
		const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

		const result = await updateBudget("b-1", { limit_amount: 800000 });

		expect(supabase.from).toHaveBeenCalledWith("budgets");
		expect(mockUpdate).toHaveBeenCalledWith({
			limit_amount: 800000,
			updated_by: "user-123",
		});
		expect(mockEq).toHaveBeenCalledWith("id", "b-1");
		expect(result.id).toBe("b-1");
	});

	test("deleteBudget should soft-delete by setting is_active false", async () => {
		const mockEq = jest.fn().mockResolvedValue({ error: null });
		const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

		await expect(deleteBudget("b-1")).resolves.toBeUndefined();

		expect(mockUpdate).toHaveBeenCalledWith({
			is_active: false,
			updated_by: "user-123",
		});
		expect(mockEq).toHaveBeenCalledWith("id", "b-1");
	});

	test("listBudgets filters personal rows to household_id null", async () => {
		const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
		const chain = {
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: mockOrder,
		};
		const mockSelect = jest.fn().mockReturnValue(chain);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		await listBudgets({ type: "personal" });

		expect(chain.is).toHaveBeenCalledWith("household_id", null);
	});

	test("listBudgets filters household rows by household_id", async () => {
		const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
		const chain = {
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: mockOrder,
		};
		const mockSelect = jest.fn().mockReturnValue(chain);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		await listBudgets({
			type: "household",
			householdId: "hh-1",
			role: "admin",
		});

		expect(chain.eq).toHaveBeenCalledWith("household_id", "hh-1");
	});

	test("createBudget rejects viewer context", async () => {
		await expect(
			createBudget(
				{ category: "Makan", limit_amount: 1, period_start: "2026-05-01" },
				{ type: "household", householdId: "hh-1", role: "viewer" },
			),
		).rejects.toThrow("Akses lihat saja");
	});

	test("createBudget includes household audit fields", async () => {
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: { id: "b-3" }, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await createBudget(
			{ category: "Makan", limit_amount: 1, period_start: "2026-05-01" },
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

	test("listBudgets should throw when Supabase returns error", async () => {
		const mockError = { message: "Network error", code: "503" };
		const mockOrder = jest
			.fn()
			.mockResolvedValue({ data: null, error: mockError });
		const chain = {
			is: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: mockOrder,
		};
		const mockSelect = jest.fn().mockReturnValue(chain);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		await expect(listBudgets()).rejects.toEqual(mockError);
	});
});
