import {
	createWallet,
	listWallets,
	updateWallet,
	deleteWallet,
} from "./wallets";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase");

describe("Wallet Service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(supabase as any).auth = {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
		};
	});

	test("createWallet should insert wallet into Supabase", async () => {
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: { id: "wallet-123" }, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		const result = await createWallet({
			name: "My Wallet",
			type: "cash",
			balance: 100000,
		});

		expect(mockInsert).toHaveBeenCalledWith({
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
			updated_by: "user-123",
			name: "My Wallet",
			type: "cash",
			balance: 100000,
			currency: "IDR",
			is_active: true,
		});
		expect(mockSelect).toHaveBeenCalled();
		expect(mockSingle).toHaveBeenCalled();
		expect(result.id).toBe("wallet-123");
	});

	test("listWallets should call select and order and return array", async () => {
		const mockWallets = [
			{ id: "w-1", name: "Cash", type: "cash" },
			{ id: "w-2", name: "Bank BCA", type: "bank" },
		];
		const mockIs = jest.fn().mockReturnThis();
		const query = {
			order: jest.fn().mockReturnThis(),
			is: mockIs,
			then: (resolve: any) =>
				Promise.resolve({ data: mockWallets, error: null }).then(resolve),
		};
		const mockSelect = jest.fn().mockReturnValue(query);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		const result = await listWallets();

		expect(supabase.from).toHaveBeenCalledWith("wallets");
		expect(mockSelect).toHaveBeenCalledWith("*");
		expect(query.order).toHaveBeenCalledWith("created_at", {
			ascending: false,
		});
		expect(mockIs).toHaveBeenCalledWith("household_id", null);
		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("w-1");
	});

	test("lists personal wallets with household_id is null", async () => {
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

		await listWallets({ type: "personal" });

		expect(mockIs).toHaveBeenCalledWith("household_id", null);
	});

	test("creates household wallet with audit fields", async () => {
		(supabase as any).auth.getUser.mockResolvedValue({
			data: { user: { id: "user-1" } },
			error: null,
		});
		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: { id: "wallet-household" }, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await createWallet(
			{ name: "Kas Rumah", type: "cash" },
			{ type: "household", householdId: "hh-1", role: "admin" },
		);

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				household_id: "hh-1",
				created_by: "user-1",
				updated_by: "user-1",
			}),
		);
	});

	test("createWallet rejects household viewer before insert", async () => {
		await expect(
			createWallet(
				{ name: "Kas Rumah", type: "cash" },
				{ type: "household", householdId: "hh-1", role: "viewer" },
			),
		).rejects.toThrow("Akses lihat saja");

		expect(supabase.from).not.toHaveBeenCalled();
	});

	test("lists household wallets by household_id", async () => {
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

		await listWallets({
			type: "household",
			householdId: "hh-1",
			role: "member",
		});

		expect(mockEq).toHaveBeenCalledWith("household_id", "hh-1");
	});

	test("updateWallet should call update/eq/select/single and return updated record", async () => {
		const existingWallet = {
			id: "w-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
			name: "Cash",
			type: "cash",
		};
		const updatedWallet = { ...existingWallet, name: "Updated Cash" };
		const readSingle = jest
			.fn()
			.mockResolvedValue({ data: existingWallet, error: null });
		const updateSingle = jest
			.fn()
			.mockResolvedValue({ data: updatedWallet, error: null });
		const mockSelect = jest.fn().mockReturnValue({
			eq: jest.fn().mockReturnValue({ maybeSingle: readSingle }),
		});
		const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
		const mockEq = jest.fn().mockReturnValue({ select: updateSelect });
		const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as jest.Mock).mockReturnValue({
			select: mockSelect,
			update: mockUpdate,
		});

		const result = await updateWallet("w-1", { name: "Updated Cash" });

		expect(supabase.from).toHaveBeenCalledWith("wallets");
		expect(mockUpdate).toHaveBeenCalledWith({
			name: "Updated Cash",
			updated_by: "user-123",
		});
		expect(mockEq).toHaveBeenCalledWith("id", "w-1");
		expect(updateSelect).toHaveBeenCalled();
		expect(updateSingle).toHaveBeenCalled();
		expect(result.id).toBe("w-1");
		expect(result.name).toBe("Updated Cash");
	});

	test("updateWallet omits balance from update payload", async () => {
		const existingWallet = {
			id: "w-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
			name: "Cash",
			type: "cash",
			balance: 100000,
		};
		const updatedWallet = { ...existingWallet, name: "Updated Cash" };
		const readSingle = jest
			.fn()
			.mockResolvedValue({ data: existingWallet, error: null });
		const updateSingle = jest
			.fn()
			.mockResolvedValue({ data: updatedWallet, error: null });
		const mockUpdate = jest.fn().mockReturnValue({
			eq: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({ single: updateSingle }),
			}),
		});
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({ maybeSingle: readSingle }),
			}),
			update: mockUpdate,
		});

		await updateWallet("w-1", {
			name: "Updated Cash",
			balance: 999999,
		} as any);

		expect(mockUpdate).toHaveBeenCalledWith({
			name: "Updated Cash",
			updated_by: "user-123",
		});
	});

	test("updateWallet denies household member updating another member's wallet", async () => {
		const existingWallet = {
			id: "w-1",
			user_id: "owner-1",
			household_id: "hh-1",
			created_by: "owner-1",
		};
		const readSingle = jest
			.fn()
			.mockResolvedValue({ data: existingWallet, error: null });
		const mockUpdate = jest.fn();
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({ maybeSingle: readSingle }),
			}),
			update: mockUpdate,
		});

		await expect(
			updateWallet(
				"w-1",
				{ name: "Nope" },
				{ type: "household", householdId: "hh-1", role: "member" },
			),
		).rejects.toThrow("Akses lihat saja");

		expect(mockUpdate).not.toHaveBeenCalled();
	});

	test("deleteWallet enforces household viewer read-only access", async () => {
		const existingWallet = {
			id: "w-1",
			user_id: "owner-1",
			household_id: "hh-1",
			created_by: "owner-1",
		};
		const readSingle = jest
			.fn()
			.mockResolvedValue({ data: existingWallet, error: null });
		const mockUpdate = jest.fn();
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({ maybeSingle: readSingle }),
			}),
			update: mockUpdate,
		});

		await expect(
			deleteWallet("w-1", {
				type: "household",
				householdId: "hh-1",
				role: "viewer",
			}),
		).rejects.toThrow("Akses lihat saja");

		expect(mockUpdate).not.toHaveBeenCalled();
	});

	test("deleteWallet should soft-delete by setting is_active false", async () => {
		const existingWallet = {
			id: "w-1",
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
		};
		const readSingle = jest
			.fn()
			.mockResolvedValue({ data: existingWallet, error: null });
		const mockEq = jest.fn().mockResolvedValue({ error: null });
		const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as jest.Mock).mockReturnValue({
			select: jest.fn().mockReturnValue({
				eq: jest.fn().mockReturnValue({ maybeSingle: readSingle }),
			}),
			update: mockUpdate,
		});

		await expect(deleteWallet("w-1")).resolves.toBeUndefined();

		expect(supabase.from).toHaveBeenCalledWith("wallets");
		expect(mockUpdate).toHaveBeenCalledWith({
			is_active: false,
			updated_by: "user-123",
		});
		expect(mockEq).toHaveBeenCalledWith("id", "w-1");
	});

	test("listWallets should throw when Supabase returns error", async () => {
		const mockError = { message: "DB connection failed", code: "500" };
		const query = {
			order: jest.fn().mockReturnThis(),
			is: jest.fn().mockReturnThis(),
			then: (resolve: any) =>
				Promise.resolve({ data: null, error: mockError }).then(resolve),
		};
		const mockSelect = jest.fn().mockReturnValue(query);
		(supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

		await expect(listWallets()).rejects.toEqual(mockError);
	});
});
