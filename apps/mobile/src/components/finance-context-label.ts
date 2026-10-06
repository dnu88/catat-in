import type { Language } from "../i18n/i18n-context";
import type { FinanceContext } from "../services/finance-context-query";

/** Display only: never use this label as a scope or persistence identity. */
export function financeContextLabel(
	context: FinanceContext,
	memberships: readonly { household_id: string; households?: { name?: string | null } | null }[],
	language: Language,
): string {
	if (context.type === "personal") return language === "en" ? "Personal" : "Pribadi";
	return memberships.find((row) => row.household_id === context.householdId)
		?.households?.name?.trim() || (language === "en" ? "Family" : "Keluarga");
}
