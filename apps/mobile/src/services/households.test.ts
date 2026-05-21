import {
	createHousehold,
	joinHouseholdByInviteCode,
	listMyHouseholds,
	removeHouseholdMember,
	updateHouseholdMemberRole,
} from "./households";

const mockSingle = jest.fn();
let chain: any;
const mockSelect = jest.fn(() => chain);
const mockInsert = jest.fn(() => chain);
const mockUpdate = jest.fn(() => chain);
const mockEq = jest.fn(() => chain);
const mockOrder = jest.fn(() => chain);
const mockFrom = jest.fn(() => chain);

chain = {
	select: mockSelect,
	insert: mockInsert,
	update: mockUpdate,
	eq: mockEq,
	order: mockOrder,
	single: mockSingle,
};

const supabase = { from: mockFrom } as any;

describe("household service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSingle.mockResolvedValue({
			data: { id: "hh-1", name: "Keluarga Budi", invite_code: "ABC123" },
			error: null,
		});
	});

	it("creates household and relies on database trigger for owner membership", async () => {
		await createHousehold(supabase, {
			name: "Keluarga Budi",
			ownerId: "user-1",
		});

		expect(mockFrom).toHaveBeenCalledTimes(1);
		expect(mockFrom).toHaveBeenCalledWith("households");
		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Keluarga Budi",
				owner_id: "user-1",
			}),
		);
		expect(mockFrom).not.toHaveBeenCalledWith("household_members");
	});

	it("lists active memberships for current user", async () => {
		await listMyHouseholds(supabase, "user-1");

		expect(mockFrom).toHaveBeenCalledWith("household_members");
		expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
		expect(mockEq).toHaveBeenCalledWith("status", "active");
	});

	it("joins household by invite code through RPC", async () => {
		const rpc = jest
			.fn()
			.mockResolvedValue({ data: { household_id: "hh-1" }, error: null });
		await joinHouseholdByInviteCode({ rpc } as any, "ABC123");

		expect(rpc).toHaveBeenCalledWith("join_household_by_invite_code", {
			invite_code_input: "ABC123",
		});
	});

	it("updates member role without allowing owner role", async () => {
		await updateHouseholdMemberRole(supabase, "member-1", "admin");

		expect(mockFrom).toHaveBeenCalledWith("household_members");
		expect(mockUpdate).toHaveBeenCalledWith({ role: "admin" });
		expect(mockEq).toHaveBeenCalledWith("id", "member-1");
	});

	it("rejects role update to owner from client service", async () => {
		await expect(
			updateHouseholdMemberRole(supabase, "member-1", "owner" as any),
		).rejects.toThrow("Owner transfer is not supported from this action");
	});

	it("removes member by marking status removed", async () => {
		await removeHouseholdMember(supabase, "member-1");

		expect(mockUpdate).toHaveBeenCalledWith({ status: "removed" });
		expect(mockEq).toHaveBeenCalledWith("id", "member-1");
	});
});
