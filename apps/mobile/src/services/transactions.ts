import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./currentUser";
import {
	deleteEnvelopeAllocationsForTransaction,
	syncEnvelopeAllocationForTransaction,
} from "./budget-envelopes";
import {
	applyFinanceContextFilter,
	buildFinanceInsertAudit,
	buildFinanceUpdateAudit,
	canCreateInContext,
	canDeleteInContext,
	canUpdateInContext,
	type FinanceContext,
} from "./finance-context-query";

export type TransactionType = "income" | "expense";

const defaultContext: FinanceContext = { type: "personal" };

export interface TransactionCreate {
	wallet_id?: string | null;
	transaction_type: TransactionType;
	amount: number;
	category: string;
	description: string;
	merchant?: string | null;
	date?: string | null; // ISO date YYYY-MM-DD
	note?: string | null;
	payment_method?: string | null;
	receipt_url?: string | null;
	group_id?: string | null;
	is_shared?: boolean;
	visibility?: string | null;
	ai_confidence?: number | null;
	ai_extracted?: Record<string, unknown> | null;
	input_type?: string | null;
	status?: string | null;
	raw_input?: string | null;
	review_required?: boolean | null;
	confidence?: number | null;
}

export interface Transaction {
	id: string;
	user_id: string;
	wallet_id: string | null;
	transaction_type: TransactionType;
	type?: string | null;
	nominal?: number | null;
	amount: number;
	kategori?: string | null;
	category: string;
	catatan?: string | null;
	description: string;
	merchant: string | null;
	tanggal?: string | null;
	date: string;
	note: string | null;
	payment_method: string | null;
	receipt_url: string | null;
	group_id: string | null;
	is_shared: boolean;
	visibility: string | null;
	ai_confidence: number | null;
	ai_extracted: Record<string, unknown> | null;
	review_required?: boolean | null;
	confidence?: number | null;
	household_id: string | null;
	created_by: string | null;
	updated_by?: string | null;
	on_behalf_of: string | null;
	is_disputed: boolean;
	dispute_resolved_at: string | null;
	created_at: string;
	updated_at: string;
}

export function normalizeTransaction(row: any): Transaction {
	return {
		...row,
		transaction_type: row.transaction_type ?? row.type,
		amount: row.amount ?? row.nominal,
		category: row.category ?? row.kategori,
		description: row.description ?? row.catatan ?? "",
		date: row.date ?? row.tanggal ?? row.created_at ?? "",
		note: row.note ?? row.catatan ?? null,
		review_required: row.review_required ?? null,
		confidence: row.confidence ?? row.ai_confidence ?? null,
	};
}

function buildInsertPayload(tx: TransactionCreate, userId: string) {
	const payload: Record<string, unknown> = {
		user_id: userId,
		wallet_id: tx.wallet_id ?? null,
		type: tx.transaction_type,
		nominal: tx.amount,
		kategori: tx.category,
		catatan: tx.note ?? tx.description,
		created_by: userId,
	};

	if (tx.merchant != null) payload.merchant = tx.merchant;
	if (tx.date != null) payload.tanggal = tx.date;
	if (tx.payment_method != null) payload.payment_method = tx.payment_method;
	if (tx.receipt_url != null) payload.receipt_url = tx.receipt_url;
	if (tx.group_id != null) payload.group_id = tx.group_id;
	if (tx.is_shared != null) payload.is_shared = tx.is_shared;
	if (tx.visibility != null) payload.visibility = tx.visibility;
	if (tx.ai_confidence != null) payload.ai_confidence = tx.ai_confidence;
	if (tx.ai_extracted != null) payload.ai_extracted = tx.ai_extracted;
	if (tx.input_type != null) payload.input_type = tx.input_type;
	if (tx.status != null) payload.status = tx.status;
	if (tx.raw_input != null) payload.raw_input = tx.raw_input;
	if (tx.review_required != null) payload.review_required = tx.review_required;
	if (tx.confidence != null) payload.confidence = tx.confidence;

	return payload;
}

function buildUpdatePayload(updates: Partial<TransactionCreate>) {
	const payload: Record<string, unknown> = {};

	if ("wallet_id" in updates) payload.wallet_id = updates.wallet_id ?? null;
	if ("transaction_type" in updates) payload.type = updates.transaction_type;
	if ("amount" in updates) payload.nominal = updates.amount;
	if ("category" in updates) payload.kategori = updates.category;
	if ("description" in updates) payload.catatan = updates.description;
	if ("note" in updates) payload.catatan = updates.note;
	if ("merchant" in updates) payload.merchant = updates.merchant ?? null;
	if ("date" in updates) payload.tanggal = updates.date;
	if ("payment_method" in updates)
		payload.payment_method = updates.payment_method ?? null;
	if ("receipt_url" in updates)
		payload.receipt_url = updates.receipt_url ?? null;
	if ("group_id" in updates) payload.group_id = updates.group_id ?? null;
	if ("is_shared" in updates) payload.is_shared = updates.is_shared;
	if ("visibility" in updates) payload.visibility = updates.visibility ?? null;
	if ("ai_confidence" in updates)
		payload.ai_confidence = updates.ai_confidence ?? null;
	if ("ai_extracted" in updates)
		payload.ai_extracted = updates.ai_extracted ?? null;
	if ("input_type" in updates) payload.input_type = updates.input_type ?? null;
	if ("status" in updates) payload.status = updates.status ?? null;
	if ("raw_input" in updates) payload.raw_input = updates.raw_input ?? null;
	if ("review_required" in updates)
		payload.review_required = updates.review_required ?? null;
	if ("confidence" in updates) payload.confidence = updates.confidence ?? null;

	return payload;
}

async function syncBudgetAllocationSafely(
	transaction: Transaction,
	userId: string,
	context: FinanceContext,
) {
	try {
		await syncEnvelopeAllocationForTransaction(
			supabase,
			{
				id: transaction.id,
				transaction_type: transaction.transaction_type,
				type: transaction.type,
				amount: transaction.amount,
				description: transaction.description,
				merchant: transaction.merchant,
				categoryName: transaction.category,
				date: transaction.date,
				tanggal: transaction.tanggal,
				created_at: transaction.created_at,
			},
			userId,
			context,
		);
	} catch {
		// Budget allocation must never block the transaction write.
	}
}


async function deleteBudgetAllocationSafely(transactionId: string) {
	try {
		await deleteEnvelopeAllocationsForTransaction(supabase, transactionId);
	} catch {
		// If the allocation table is unavailable, the transaction delete still proceeds.
	}
}

export async function getTransaction(id: string): Promise<Transaction | null> {
	const { data, error } = await supabase
		.from("transactions")
		.select("*")
		.eq("id", id)
		.maybeSingle();
	if (error) throw error;
	return data ? normalizeTransaction(data) : null;
}

export async function createTransaction(
	tx: TransactionCreate,
	context: FinanceContext = defaultContext,
): Promise<Transaction> {
	if (!canCreateInContext(context)) throw new Error("Akses lihat saja");

	const userId = await getCurrentUserId();
	const payload = {
		...buildInsertPayload(tx, userId),
		...buildFinanceInsertAudit(context, userId),
	};

	const { data, error } = await supabase
		.from("transactions")
		.insert(payload)
		.select()
		.single();

	if (error) throw error;

	const created = normalizeTransaction(data);
	await syncBudgetAllocationSafely(created, userId, context);
	return created;
}

export async function listTransactions(
	filters?: {
		wallet_id?: string;
		transaction_type?: TransactionType;
		category?: string;
	},
	context: FinanceContext = defaultContext,
): Promise<Transaction[]> {
	let query: any = supabase
		.from("transactions")
		.select("*")
		.order("tanggal", { ascending: false });

	query = applyFinanceContextFilter(query, context);

	if (filters?.wallet_id) {
		query = query.eq("wallet_id", filters.wallet_id);
	}
	if (filters?.transaction_type) {
		query = query.eq("type", filters.transaction_type);
	}
	if (filters?.category) {
		query = query.eq("kategori", filters.category);
	}

	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []).map(normalizeTransaction);
}

export async function updateTransaction(
	id: string,
	updates: Partial<TransactionCreate>,
	context: FinanceContext = defaultContext,
): Promise<Transaction> {
	const userId = await getCurrentUserId();
	const previous = await getTransaction(id);
	if (!previous) throw new Error("Transaksi tidak ditemukan");
	if (!canUpdateInContext(context, previous, userId))
		throw new Error("Akses lihat saja");

	const payload = {
		...buildUpdatePayload(updates),
		...buildFinanceUpdateAudit(userId),
	};

	const { data, error } = await supabase
		.from("transactions")
		.update(payload)
		.eq("id", id)
		.select()
		.single();

	if (error) throw error;

	const updated = normalizeTransaction(data);
	await syncBudgetAllocationSafely(updated, userId, context);
	return updated;
}

export async function deleteTransaction(
	id: string,
	context: FinanceContext = defaultContext,
): Promise<void> {
	const userId = await getCurrentUserId();
	const previous = await getTransaction(id);
	if (!previous) throw new Error("Transaksi tidak ditemukan");
	if (!canDeleteInContext(context, previous, userId))
		throw new Error("Akses lihat saja");

	await deleteBudgetAllocationSafely(id);

	const { error } = await supabase.from("transactions").delete().eq("id", id);
	if (error) throw error;
}
