export type HouseholdRole = "owner" | "admin" | "member" | "viewer";

export type FinanceContext =
  | { type: "personal" }
  | { type: "household"; householdId: string; role: HouseholdRole };

type FilterableQuery<TQuery> = TQuery & {
  is(column: string, value: unknown): TQuery;
  eq(column: string, value: unknown): TQuery;
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
) {
  return {
    user_id: userId,
    household_id: context.type === "household" ? context.householdId : null,
    created_by: userId,
    updated_by: userId,
  };
}

export function buildFinanceUpdateAudit(userId: string) {
  return { updated_by: userId };
}

export function canCreateInContext(context: FinanceContext) {
  return context.type === "personal" || context.role !== "viewer";
}

export function canUpdateInContext(
  context: FinanceContext,
  row: { household_id?: string | null; created_by?: string | null },
  userId: string,
) {
  if (context.type === "personal") return row.household_id == null;
  if (context.role === "owner" || context.role === "admin")
    return row.household_id === context.householdId;
  if (context.role === "member")
    return (
      row.household_id === context.householdId && row.created_by === userId
    );
  return false;
}

export function canDeleteInContext(
  context: FinanceContext,
  row: { household_id?: string | null; created_by?: string | null },
  userId: string,
) {
  return canUpdateInContext(context, row, userId);
}
