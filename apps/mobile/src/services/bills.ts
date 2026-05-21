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

export interface BillCreate {
	name: string;
	amount: number;
	due_day: number;
	recurrence: "monthly" | "yearly" | "once";
	next_due_date: string; // ISO date string
	notify_before_days?: number;
}

export interface Bill extends BillCreate {
	id: string;
	user_id: string;
	notify_before_days: number;
	is_paid: boolean;
	payment_history: Record<string, unknown>[];
	created_at: string;
	updated_at: string;
}

export async function createBill(
	bill: BillCreate,
	context: FinanceContext = defaultContext,
): Promise<Bill> {
	if (!canCreateInContext(context)) throw new Error("Akses lihat saja");
	const userId = await getCurrentUserId();

	const { data, error } = await supabase
		.from("bill_reminders")
		.insert({
			...bill,
			...buildFinanceInsertAudit(context, userId),
			notify_before_days: bill.notify_before_days ?? 3,
			is_paid: false,
			payment_history: [],
		})
		.select()
		.single();

	if (error) throw error;
	return data as Bill;
}

export async function listBills(
	context: FinanceContext = defaultContext,
): Promise<Bill[]> {
	let query = supabase.from("bill_reminders").select("*");
	query = applyFinanceContextFilter(query as any, context) as typeof query;
	const { data, error } = await query.order("next_due_date", {
		ascending: true,
	});

	if (error) throw error;
	return data as Bill[];
}

export async function updateBill(
	id: string,
	updates: Partial<BillCreate & { is_paid?: boolean }>,
): Promise<Bill> {
	const userId = await getCurrentUserId();
	const { data, error } = await supabase
		.from("bill_reminders")
		.update({ ...updates, ...buildFinanceUpdateAudit(userId) })
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;
	return data as Bill;
}

export async function deleteBill(id: string): Promise<void> {
	const { error } = await supabase.from("bill_reminders").delete().eq("id", id);

	if (error) throw error;
}
