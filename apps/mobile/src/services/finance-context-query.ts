export type HouseholdRole = "owner" | "admin" | "member" | "viewer";

export type FinanceContext =
	| { type: "personal" }
	| { type: "household"; householdId: string; role: HouseholdRole };

type FilterableQuery<TQuery> = TQuery & {
	is(column: string, value: unknown): TQuery;
	eq(column: string, value: unknown): TQuery;
};

export type FinanceInsertAudit = {
	user_id: string;
	household_id: string | null;
	created_by: string;
	updated_by: string;
};

export type FinanceUpdateAudit = {
	updated_by: string;
};

export type FinancePermissionRow = {
	household_id: string | null;
	user_id: string | null;
	created_by: string | null;
};

export function applyFinanceContextFilter<TQuery>(
	query: FilterableQuery<TQuery>,
	context: FinanceContext,
): TQuery {
	if (context.type === "personal") {
		return query.is("household_id", null);
	}

	return query.eq("household_id", context.householdId);
}

export function buildFinanceInsertAudit(
	context: FinanceContext,
	userId: string,
): FinanceInsertAudit {
	return {
		user_id: userId,
		household_id: context.type === "household" ? context.householdId : null,
		created_by: userId,
		updated_by: userId,
	};
}

export function buildFinanceUpdateAudit(userId: string): FinanceUpdateAudit {
	return { updated_by: userId };
}

export function canCreateInContext(context: FinanceContext): boolean {
	return context.type === "personal" || context.role !== "viewer";
}

export function canUpdateInContext(
	context: FinanceContext,
	row: FinancePermissionRow,
	userId: string,
): boolean {
	if (context.type === "personal") {
		return row.household_id === null && row.user_id === userId;
	}

	if (context.role === "owner" || context.role === "admin") {
		return row.household_id === context.householdId;
	}

	if (context.role === "member") {
		return (
			row.household_id === context.householdId && row.created_by === userId
		);
	}

	return false;
}

export function canDeleteInContext(
	context: FinanceContext,
	row: FinancePermissionRow,
	userId: string,
): boolean {
	return canUpdateInContext(context, row, userId);
}
