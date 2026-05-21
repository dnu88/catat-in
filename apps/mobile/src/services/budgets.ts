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
	category_id: string;
	limit_amount: number;
	start_date: string; // ISO date string
	period?: string;
	notify_at_percent?: number;
	group_id?: string | null;
}

export interface Budget {
	id: string;
	user_id: string;
	category_id: string;
	limit_amount: number;
	period: string;
	start_date: string;
	notify_at_percent: number;
	is_active: boolean;
	group_id: string | null;
	created_at: string;
	// Derived client-side from transactions; not stored in deployed schema.
	spent_amount?: number;
	// Optional joined category info for display.
	category?: { id: string; name: string; icon: string | null } | null;
}

export async function createBudget(
	budget: BudgetCreate,
	context: FinanceContext = defaultContext,
): Promise<Budget> {
	if (!canCreateInContext(context)) throw new Error("Akses lihat saja");
	const userId = await getCurrentUserId();

	const payload: Record<string, unknown> = {
		...buildFinanceInsertAudit(context, userId),
		category_id: budget.category_id,
		limit_amount: budget.limit_amount,
		start_date: budget.start_date,
		period: budget.period ?? "monthly",
		notify_at_percent: budget.notify_at_percent ?? 80,
		is_active: true,
	};
	if (budget.group_id) payload.group_id = budget.group_id;

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
	let query = supabase
		.from("budgets")
		.select("*, category:categories(id, name, icon)");
	query = applyFinanceContextFilter(query as any, context) as typeof query;
	const { data, error } = await query.order("start_date", { ascending: false });

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
	const { error } = await supabase
		.from("budgets")
		.update({ is_active: false })
		.eq("id", id);

	if (error) throw error;
}
