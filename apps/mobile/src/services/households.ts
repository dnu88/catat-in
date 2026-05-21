export type HouseholdRole = "owner" | "admin" | "member" | "viewer";

export type Household = {
	id: string;
	name: string;
	owner_id: string;
	invite_code: string;
	created_at: string;
	updated_at: string;
};

export type HouseholdMember = {
	id: string;
	household_id: string;
	user_id: string;
	role: HouseholdRole;
	status: "active" | "invited" | "removed";
	joined_at: string;
	created_at: string;
	updated_at: string;
	households?: Household;
};

type SupabaseLike = {
	from(table: string): any;
	rpc?(
		name: string,
		params?: Record<string, unknown>,
	): Promise<{ data: unknown; error: unknown }>;
};

function generateInviteCode() {
	return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createHousehold(
	supabase: SupabaseLike,
	input: { name: string; ownerId: string },
): Promise<Household> {
	const { data: household, error } = await supabase
		.from("households")
		.insert({
			name: input.name.trim(),
			owner_id: input.ownerId,
			invite_code: generateInviteCode(),
		})
		.select("*")
		.single();

	if (error) throw error;

	return household as Household;
}

export async function listMyHouseholds(
	supabase: SupabaseLike,
	userId: string,
): Promise<HouseholdMember[]> {
	const { data, error } = await supabase
		.from("household_members")
		.select("*, households(*)")
		.eq("user_id", userId)
		.eq("status", "active")
		.order("joined_at", { ascending: false });

	if (error) throw error;
	return (data ?? []) as HouseholdMember[];
}

export async function joinHouseholdByInviteCode(
	supabase: SupabaseLike,
	inviteCode: string,
) {
	if (!supabase.rpc) {
		throw new Error("Supabase RPC client is required");
	}

	const { data, error } = await supabase.rpc("join_household_by_invite_code", {
		invite_code_input: inviteCode.trim().toUpperCase(),
	});
	if (error) throw error;
	return data;
}

export async function listHouseholdMembers(
	supabase: SupabaseLike,
	householdId: string,
): Promise<HouseholdMember[]> {
	const { data, error } = await supabase
		.from("household_members")
		.select("*")
		.eq("household_id", householdId)
		.eq("status", "active")
		.order("joined_at", { ascending: true });

	if (error) throw error;
	return (data ?? []) as HouseholdMember[];
}

export async function updateHouseholdMemberRole(
	supabase: SupabaseLike,
	memberId: string,
	role: HouseholdRole,
): Promise<HouseholdMember> {
	if (role === "owner") {
		throw new Error("Owner transfer is not supported from this action");
	}

	const { data, error } = await supabase
		.from("household_members")
		.update({ role })
		.eq("id", memberId)
		.select("*")
		.single();

	if (error) throw error;
	return data as HouseholdMember;
}

export async function removeHouseholdMember(
	supabase: SupabaseLike,
	memberId: string,
): Promise<void> {
	const { error } = await supabase
		.from("household_members")
		.update({ status: "removed" })
		.eq("id", memberId);

	if (error) throw error;
}

export async function leaveHousehold(
	supabase: SupabaseLike,
	memberId: string,
): Promise<void> {
	return removeHouseholdMember(supabase, memberId);
}
