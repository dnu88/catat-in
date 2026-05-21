import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./currentUser";
import {
	applyFinanceContextFilter,
	buildFinanceInsertAudit,
	buildFinanceUpdateAudit,
	canCreateInContext,
	type FinanceContext,
} from "./finance-context-query";

const defaultContext: FinanceContext = { type: "personal" };

export interface BudgetCreate {
	category: string;
	limit_amount: number;
	period_start: string; // ISO date string
	period?: string;
	notify_at_percent?: number;
}

export interface Budget {
	id: string;
	user_id: string;
	category: string;
	limit_amount: number;
	period: string;
	period_start: string;
	notify_at_percent: number;
	is_active: boolean;
	household_id: string | null;
	created_at: string;
	// Derived client-side from transactions; not stored in deployed schema.
	spent_amount?: number;
}

export async function createBudget(
	budget: BudgetCreate,
	context: FinanceContext = defaultContext,
): Promise<Budget> {
	if (!canCreateInContext(context)) throw new Error("Akses lihat saja");
	const userId = await getCurrentUserId();

	const payload: Record<string, unknown> = {
		...buildFinanceInsertAudit(context, userId),
		category: budget.category,
		limit_amount: budget.limit_amount,
		period_start: budget.period_start,
		period: budget.period ?? "monthly",
		notify_at_percent: budget.notify_at_percent ?? 80,
		is_active: true,
	};

	const { data, error } = await supabase
		.from("budgets")
		.insert(payload)
		.select()
		.single();

	if (error) throw error;
	return data as Budget;
}

export async function listBudgets(
	context: FinanceContext = defaultContext,
): Promise<Budget[]> {
	const userId = await getCurrentUserId();
	let query = supabase.from("budgets").select("*");
	query = applyFinanceContextFilter(query as any, context) as typeof query;
	if (context.type === "personal") {
		query = query.eq("user_id", userId) as typeof query;
	}
	const { data, error } = await query.order("period_start", {
		ascending: false,
	});

	if (error) throw error;
	return (data ?? []) as Budget[];
}

export async function updateBudget(
	id: string,
	updates: Partial<BudgetCreate>,
): Promise<Budget> {
	const userId = await getCurrentUserId();
	const { data, error } = await supabase
		.from("budgets")
		.update({ ...updates, ...buildFinanceUpdateAudit(userId) })
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data as Budget;
}

export async function deleteBudget(id: string): Promise<void> {
	const userId = await getCurrentUserId();
	const { error } = await supabase
		.from("budgets")
		.update({ is_active: false, ...buildFinanceUpdateAudit(userId) })
		.eq("id", id);

	if (error) throw error;
}
