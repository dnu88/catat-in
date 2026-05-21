import {
	applyFinanceContextFilter,
	buildFinanceInsertAudit,
	canCreateInContext,
	canDeleteInContext,
	canUpdateInContext,
	type FinanceContext,
	type FinancePermissionRow,
} from "./finance-context-query";

type QueryRecorder = {
	query: {
		is(column: string, value: unknown): QueryRecorder["query"];
		eq(column: string, value: unknown): QueryRecorder["query"];
	};
	calls: Array<[string, string, unknown?]>;
};

function makeQueryRecorder(): QueryRecorder {
	const calls: Array<[string, string, unknown?]> = [];
	const query: QueryRecorder["query"] = {
		is(column: string, value: unknown): QueryRecorder["query"] {
			calls.push(["is", column, value]);
			return query;
		},
		eq(column: string, value: unknown): QueryRecorder["query"] {
			calls.push(["eq", column, value]);
			return query;
		},
	};
	return { query, calls };
}

describe("finance context query helpers", () => {
	it("filters personal rows to household_id is null", () => {
		const { query, calls } = makeQueryRecorder();

		applyFinanceContextFilter(query, { type: "personal" });

		expect(calls).toEqual([["is", "household_id", null]]);
	});

	it("filters household rows by active household id", () => {
		const { query, calls } = makeQueryRecorder();

		applyFinanceContextFilter(query, {
			type: "household",
			householdId: "hh-1",
			role: "member",
		});

		expect(calls).toEqual([["eq", "household_id", "hh-1"]]);
	});

	it("builds personal insert audit fields without household_id", () => {
		expect(buildFinanceInsertAudit({ type: "personal" }, "user-1")).toEqual({
			user_id: "user-1",
			household_id: null,
			created_by: "user-1",
			updated_by: "user-1",
		});
	});

	it("builds household insert audit fields with household id", () => {
		expect(
			buildFinanceInsertAudit(
				{ type: "household", householdId: "hh-1", role: "admin" },
				"user-1",
			),
		).toEqual({
			user_id: "user-1",
			household_id: "hh-1",
			created_by: "user-1",
			updated_by: "user-1",
		});
	});

	it("allows owner/admin/member to create but viewer cannot create", () => {
		expect(canCreateInContext({ type: "personal" })).toBe(true);
		expect(
			canCreateInContext({
				type: "household",
				householdId: "hh-1",
				role: "owner",
			}),
		).toBe(true);
		expect(
			canCreateInContext({
				type: "household",
				householdId: "hh-1",
				role: "admin",
			}),
		).toBe(true);
		expect(
			canCreateInContext({
				type: "household",
				householdId: "hh-1",
				role: "member",
			}),
		).toBe(true);
		expect(
			canCreateInContext({
				type: "household",
				householdId: "hh-1",
				role: "viewer",
			}),
		).toBe(false);
	});

	it("allows personal update/delete only for the current user's personal rows", () => {
		const personal: FinanceContext = { type: "personal" };
		const ownPersonalRow: FinancePermissionRow = {
			household_id: null,
			user_id: "user-1",
			created_by: "user-1",
		};
		const otherUserPersonalRow: FinancePermissionRow = {
			household_id: null,
			user_id: "user-2",
			created_by: "user-1",
		};

		expect(canUpdateInContext(personal, ownPersonalRow, "user-1")).toBe(true);
		expect(canDeleteInContext(personal, ownPersonalRow, "user-1")).toBe(true);
		expect(canUpdateInContext(personal, otherUserPersonalRow, "user-1")).toBe(
			false,
		);
		expect(canDeleteInContext(personal, otherUserPersonalRow, "user-1")).toBe(
			false,
		);
	});

	it("denies personal rows when household_id is missing", () => {
		const personal: FinanceContext = { type: "personal" };
		const rowMissingHouseholdId = {
			user_id: "user-1",
			created_by: "user-1",
		} as unknown as FinancePermissionRow;

		expect(canUpdateInContext(personal, rowMissingHouseholdId, "user-1")).toBe(
			false,
		);
		expect(canDeleteInContext(personal, rowMissingHouseholdId, "user-1")).toBe(
			false,
		);
	});

	it("allows owner/admin update/delete only for matching household rows", () => {
		const owner: FinanceContext = {
			type: "household",
			householdId: "hh-1",
			role: "owner",
		};
		const admin: FinanceContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		const matchingRow: FinancePermissionRow = {
			household_id: "hh-1",
			user_id: "user-2",
			created_by: "user-2",
		};
		const nonMatchingRow: FinancePermissionRow = {
			household_id: "hh-2",
			user_id: "user-2",
			created_by: "user-2",
		};

		expect(canUpdateInContext(owner, matchingRow, "user-1")).toBe(true);
		expect(canDeleteInContext(owner, matchingRow, "user-1")).toBe(true);
		expect(canUpdateInContext(owner, nonMatchingRow, "user-1")).toBe(false);
		expect(canDeleteInContext(owner, nonMatchingRow, "user-1")).toBe(false);
		expect(canUpdateInContext(admin, matchingRow, "user-1")).toBe(true);
		expect(canDeleteInContext(admin, matchingRow, "user-1")).toBe(true);
		expect(canUpdateInContext(admin, nonMatchingRow, "user-1")).toBe(false);
		expect(canDeleteInContext(admin, nonMatchingRow, "user-1")).toBe(false);
	});

	it("denies viewer update/delete even for matching household rows", () => {
		const viewer: FinanceContext = {
			type: "household",
			householdId: "hh-1",
			role: "viewer",
		};
		const matchingRow: FinancePermissionRow = {
			household_id: "hh-1",
			user_id: "user-1",
			created_by: "user-1",
		};

		expect(canUpdateInContext(viewer, matchingRow, "user-1")).toBe(false);
		expect(canDeleteInContext(viewer, matchingRow, "user-1")).toBe(false);
	});

	it("limits member update/delete to matching household rows they created", () => {
		const member: FinanceContext = {
			type: "household",
			householdId: "hh-1",
			role: "member",
		};
		const ownRow: FinancePermissionRow = {
			household_id: "hh-1",
			user_id: "user-2",
			created_by: "user-1",
		};
		const otherRow: FinancePermissionRow = {
			household_id: "hh-1",
			user_id: "user-2",
			created_by: "user-2",
		};
		const missingCreatedByRow = {
			household_id: "hh-1",
			user_id: "user-2",
		} as unknown as FinancePermissionRow;

		expect(canUpdateInContext(member, ownRow, "user-1")).toBe(true);
		expect(canDeleteInContext(member, ownRow, "user-1")).toBe(true);
		expect(canUpdateInContext(member, otherRow, "user-1")).toBe(false);
		expect(canDeleteInContext(member, otherRow, "user-1")).toBe(false);
		expect(canUpdateInContext(member, missingCreatedByRow, "user-1")).toBe(
			false,
		);
		expect(canDeleteInContext(member, missingCreatedByRow, "user-1")).toBe(
			false,
		);
	});
});
