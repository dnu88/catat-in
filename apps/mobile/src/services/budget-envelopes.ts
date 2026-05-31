import {
	areCategoryNamesEquivalent,
} from "./category-taxonomy";
import {
	applyFinanceContextFilter,
	buildFinanceInsertAudit,
	canCreateInContext,
	type FinanceContext,
} from "./finance-context-query";

export type BudgetEnvelopeStatus = "active" | "archived";

const defaultContext: FinanceContext = { type: "personal" };

export type BudgetEnvelope = {
	id: string;
	user_id: string;
	name: string;
	parent_category_id: string | null;
	parent_category_name: string | null;
	limit_amount: number;
	start_date: string;
	end_date: string;
	icon: string | null;
	color: string | null;
	notes: string | null;
	status: BudgetEnvelopeStatus;
	created_at: string;
	updated_at: string;
};

export type EnvelopeAllocation = {
	id: string;
	transaction_id: string;
	envelope_id: string;
	amount: number;
	confidence: number | null;
	needs_review: boolean;
	transaction_date: string | null;
	transaction_description: string | null;
	created_at: string;
	updated_at: string;
};

export type EnvelopeProgress = {
	spent_amount: number;
	remaining_amount: number;
	used_percentage: number;
	is_near_limit: boolean;
	is_over_budget: boolean;
	over_budget_amount: number;
};

export type EnvelopeSummary = {
	envelope: BudgetEnvelope;
	progress: EnvelopeProgress;
	reviewCount: number;
};

export type EnvelopeTransactionCandidate = {
	description: string | null;
	merchant: string | null;
	categoryName: string | null;
	amount: number;
};

export type EnvelopeAllocationSyncTransaction = EnvelopeTransactionCandidate & {
	id: string;
	transaction_type?: string | null;
	type?: string | null;
	date?: string | null;
	tanggal?: string | null;
	created_at?: string | null;
};

export type EnvelopeMatch = {
	envelope: BudgetEnvelope;
	confidence: number;
	needs_review: boolean;
};

export type BudgetEnvelopeUpdateInput = Partial<
	Omit<BudgetEnvelopeInput, "user_id">
>;

const NEAR_LIMIT_THRESHOLD = 80;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

function toDateKey(value: string | null | undefined) {
	return value ? value.slice(0, 10) : "";
}

function formatLocalDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function clampDay(year: number, monthIndex: number, day: number) {
	const lastDay = new Date(year, monthIndex + 1, 0).getDate();
	return Math.min(Math.max(day, 1), lastDay);
}

function dateFromDay(year: number, monthIndex: number, day: number) {
	return new Date(year, monthIndex, clampDay(year, monthIndex, day));
}

export function resolveMonthlyEnvelopePeriod(
	startDate: string,
	endDate: string,
	reference = new Date(),
) {
	const startDay = Number(startDate.slice(8, 10)) || 1;
	const endDay = Number(endDate.slice(8, 10)) || startDay;
	let startMonth = reference.getMonth();
	let startYear = reference.getFullYear();
	let endMonth = startMonth;
	let endYear = startYear;

	if (startDay > endDay) {
		if (reference.getDate() < startDay) {
			startMonth -= 1;
			if (startMonth < 0) {
				startMonth = 11;
				startYear -= 1;
			}
			endMonth = reference.getMonth();
			endYear = reference.getFullYear();
		} else {
			endMonth += 1;
			if (endMonth > 11) {
				endMonth = 0;
				endYear += 1;
			}
		}
	}

	return {
		start: formatLocalDate(dateFromDay(startYear, startMonth, startDay)),
		end: formatLocalDate(dateFromDay(endYear, endMonth, endDay)),
		startDay,
		endDay,
	};
}

function normalize(value: string | null | undefined) {
	return (value ?? "").trim().toLowerCase();
}

function tokenize(value: string | null | undefined) {
	return normalize(value)
		.replace(/[^a-z0-9\s&]/gi, " ")
		.split(/\s+/)
		.filter((token) => token.length >= 3);
}

export function getEnvelopeStatus(
	envelope: Pick<BudgetEnvelope, "end_date" | "status">,
	todayKey = new Date().toISOString().slice(0, 10),
): BudgetEnvelopeStatus {
	if (envelope.status === "archived") return "archived";
	return toDateKey(envelope.end_date) < todayKey ? "archived" : "active";
}

export function buildEnvelopeProgress(
	envelope: Pick<
		BudgetEnvelope,
		"id" | "limit_amount" | "start_date" | "end_date"
	>,
	allocations: EnvelopeAllocation[],
): EnvelopeProgress {
	const start = toDateKey(envelope.start_date);
	const end = toDateKey(envelope.end_date);
	const spent = allocations
		.filter((allocation) => allocation.envelope_id === envelope.id)
		.filter((allocation) => {
			const transactionDate = toDateKey(allocation.transaction_date);
			return transactionDate >= start && transactionDate <= end;
		})
		.reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0);

	const limit = Number(envelope.limit_amount ?? 0);
	const usedPercentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
	const remaining = limit - spent;
	const isOverBudget = spent > limit;

	return {
		spent_amount: spent,
		remaining_amount: remaining,
		used_percentage: usedPercentage,
		is_near_limit: usedPercentage >= NEAR_LIMIT_THRESHOLD && !isOverBudget,
		is_over_budget: isOverBudget,
		over_budget_amount: Math.max(spent - limit, 0),
	};
}

export function getHomeEnvelopeAlerts(items: EnvelopeSummary[], maxItems = 3) {
	return items
		.filter(
			(item) => item.progress.is_over_budget || item.progress.is_near_limit,
		)
		.sort((a, b) => {
			if (a.progress.is_over_budget !== b.progress.is_over_budget) {
				return a.progress.is_over_budget ? -1 : 1;
			}
			return b.progress.used_percentage - a.progress.used_percentage;
		})
		.slice(0, maxItems);
}

function envelopeMatchesTransactionCategory(
	categoryName: string | null | undefined,
	envelope: BudgetEnvelope,
) {
	const normalizedCategory = normalize(categoryName);
	if (!normalizedCategory) return false;

	if (
		envelope.parent_category_name &&
		areCategoryNamesEquivalent(envelope.parent_category_name, categoryName)
	) {
		return true;
	}

	// Backward compatibility for older budget wallets that were created before
	// category selection existed. They can still sync when the wallet name is the
	// exact transaction category.
	return (
		!envelope.parent_category_id && normalize(envelope.name) === normalizedCategory
	);
}

function scoreEnvelopeForTransaction(
	candidate: EnvelopeTransactionCandidate,
	envelope: BudgetEnvelope,
) {
	const sourceText = `${candidate.description ?? ""} ${candidate.merchant ?? ""}`;
	const sourceTokens = new Set(tokenize(sourceText));
	const sourceNormalized = normalize(sourceText);
	let score = 0;
	const envelopeName = normalize(envelope.name);
	const noteTokens = tokenize(envelope.notes);

	if (envelopeName && sourceTokens.has(envelopeName)) score += 4;
	if (envelopeName && sourceNormalized.includes(envelopeName)) score += 2;

	for (const token of noteTokens) {
		if (sourceTokens.has(token)) score += 2;
	}

	if (
		candidate.categoryName &&
		envelope.parent_category_name &&
		areCategoryNamesEquivalent(candidate.categoryName, envelope.parent_category_name)
	) {
		score += 2;
	}

	// Users often name budget wallets after the same category they pick in transactions.
	if (
		candidate.categoryName &&
		envelopeName &&
		(areCategoryNamesEquivalent(candidate.categoryName, envelope.name) ||
			normalize(candidate.categoryName) === envelopeName)
	) {
		score += 3;
	}

	return score;
}

export function matchEnvelopesForTransaction(
	candidate: EnvelopeTransactionCandidate,
	envelopes: BudgetEnvelope[],
): EnvelopeMatch[] {
	return envelopes
		.map((envelope) => ({
			envelope,
			score: scoreEnvelopeForTransaction(candidate, envelope),
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ envelope, score }) => {
			const confidence = Math.min(0.98, 0.45 + score * 0.08);
			return {
				envelope,
				confidence,
				needs_review: confidence < HIGH_CONFIDENCE_THRESHOLD,
			};
		});
}

export function matchEnvelopeForTransaction(
	candidate: EnvelopeTransactionCandidate,
	envelopes: BudgetEnvelope[],
): EnvelopeMatch | null {
	return matchEnvelopesForTransaction(candidate, envelopes)[0] ?? null;
}

type SupabaseLike = {
	from: (table: string) => any;
};

export type BudgetEnvelopeInput = {
	user_id: string;
	name: string;
	parent_category_id: string | null;
	limit_amount: number;
	start_date: string;
	end_date: string;
	icon: string | null;
	color: string | null;
	notes: string | null;
};

export type EnvelopeAllocationInput = {
	transaction_id: string;
	envelope_id: string;
	amount: number;
	confidence: number | null;
	needs_review: boolean;
};

type BudgetEnvelopeRow = {
	id: string;
	user_id: string;
	name: string;
	parent_category_id: string | null;
	limit_amount: number | string | null;
	start_date: string;
	end_date: string;
	icon: string | null;
	color: string | null;
	notes: string | null;
	status: BudgetEnvelopeStatus;
	created_at: string;
	updated_at: string;
	category?: { name?: string | null } | null;
};

type EnvelopeAllocationRow = {
	id: string;
	transaction_id: string;
	envelope_id: string;
	amount: number | string | null;
	confidence: number | string | null;
	needs_review: boolean | null;
	created_at: string;
	updated_at: string;
	transaction?: {
		tanggal?: string | null;
		catatan?: string | null;
		merchant?: string | null;
	} | null;
};

type BudgetSyncTransactionRow = {
	id: string;
	type?: string | null;
	transaction_type?: string | null;
	nominal?: number | string | null;
	amount?: number | string | null;
	kategori?: string | null;
	category?: string | null;
	tanggal?: string | null;
	date?: string | null;
	created_at?: string | null;
	catatan?: string | null;
	description?: string | null;
	merchant?: string | null;
};

function mapBudgetEnvelope(row: BudgetEnvelopeRow): BudgetEnvelope {
	const period = resolveMonthlyEnvelopePeriod(row.start_date, row.end_date);
	return {
		id: row.id,
		user_id: row.user_id,
		name: row.name,
		parent_category_id: row.parent_category_id,
		parent_category_name: row.category?.name ?? null,
		limit_amount: Number(row.limit_amount ?? 0),
		start_date: period.start,
		end_date: period.end,
		icon: row.icon,
		color: row.color,
		notes: row.notes,
		status: row.status,
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

export async function listBudgetEnvelopes(
	supabase: SupabaseLike,
	userId: string,
	context: FinanceContext = defaultContext,
): Promise<BudgetEnvelope[]> {
	let query = supabase
		.from("budget_envelopes")
		.select("*, category:categories(id,name)");
	query = applyFinanceContextFilter(query, context) as typeof query;
	if (context.type === "personal") {
		query = query.eq("user_id", userId);
	}
	const { data, error } = await query.order("end_date");

	if (error) throw error;
	return (data ?? []).map(mapBudgetEnvelope);
}

export async function createBudgetEnvelope(
	supabase: SupabaseLike,
	input: BudgetEnvelopeInput,
	context: FinanceContext = defaultContext,
): Promise<BudgetEnvelope> {
	if (!canCreateInContext(context)) throw new Error("Akses lihat saja");
	const { data, error } = await supabase
		.from("budget_envelopes")
		.insert({
			...input,
			status: "active",
			...buildFinanceInsertAudit(context, input.user_id),
		})
		.select("*, category:categories(id,name)")
		.single();

	if (error) throw error;
	return mapBudgetEnvelope(data);
}

export async function updateBudgetEnvelope(
	supabase: SupabaseLike,
	id: string,
	updates: BudgetEnvelopeUpdateInput,
	userId: string,
	context: FinanceContext = defaultContext,
): Promise<BudgetEnvelope> {
	if (!canCreateInContext(context)) throw new Error("Akses lihat saja");
	const { data, error } = await supabase
		.from("budget_envelopes")
		.update({
			...updates,
			updated_by: userId,
		})
		.eq("id", id)
		.select("*, category:categories(id,name)")
		.single();

	if (error) throw error;
	return mapBudgetEnvelope(data);
}

export async function deleteBudgetEnvelope(
	supabase: SupabaseLike,
	id: string,
	userId: string,
): Promise<void> {
	const { error } = await supabase
		.from("budget_envelopes")
		.update({ status: "archived", updated_by: userId })
		.eq("id", id);

	if (error) throw error;
}

function mapEnvelopeAllocation(row: EnvelopeAllocationRow): EnvelopeAllocation {
	return {
		id: row.id,
		transaction_id: row.transaction_id,
		envelope_id: row.envelope_id,
		amount: Number(row.amount ?? 0),
		confidence: row.confidence == null ? null : Number(row.confidence),
		needs_review: Boolean(row.needs_review),
		transaction_date: row.transaction?.tanggal ?? null,
		transaction_description:
			row.transaction?.catatan ?? row.transaction?.merchant ?? null,
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

export async function listEnvelopeAllocations(
	supabase: SupabaseLike,
	envelopeIds: string[],
): Promise<EnvelopeAllocation[]> {
	if (envelopeIds.length === 0) return [];

	const { data, error } = await supabase
		.from("transaction_envelope_allocations")
		.select("*, transaction:transactions(id,tanggal,catatan,merchant)")
		.in("envelope_id", envelopeIds);

	if (error) throw error;
	return (data ?? []).map(mapEnvelopeAllocation);
}

export async function createEnvelopeAllocation(
	supabase: SupabaseLike,
	input: EnvelopeAllocationInput,
): Promise<EnvelopeAllocation> {
	const { data, error } = await supabase
		.from("transaction_envelope_allocations")
		.insert(input)
		.select("*, transaction:transactions(id,tanggal,catatan,merchant)")
		.single();

	if (error) throw error;
	return mapEnvelopeAllocation(data);
}


export async function deleteEnvelopeAllocationsForTransaction(
	supabase: SupabaseLike,
	transactionId: string,
): Promise<void> {
	const { error } = await supabase
		.from("transaction_envelope_allocations")
		.delete()
		.eq("transaction_id", transactionId);

	if (error) throw error;
}

export async function deleteEnvelopeAllocationsForEnvelope(
	supabase: SupabaseLike,
	envelopeId: string,
): Promise<void> {
	const { error } = await supabase
		.from("transaction_envelope_allocations")
		.delete()
		.eq("envelope_id", envelopeId);

	if (error) throw error;
}

function normalizeBudgetSyncTransaction(
	row: BudgetSyncTransactionRow,
): EnvelopeAllocationSyncTransaction {
	return {
		id: row.id,
		transaction_type: row.transaction_type ?? row.type,
		type: row.type,
		amount: Number(row.amount ?? row.nominal ?? 0),
		categoryName: row.category ?? row.kategori ?? null,
		description: row.description ?? row.catatan ?? null,
		merchant: row.merchant ?? null,
		date: row.date ?? row.tanggal ?? null,
		tanggal: row.tanggal ?? row.date ?? null,
		created_at: row.created_at ?? null,
	};
}

export async function syncEnvelopeAllocationsForBudgetEnvelope(
	supabase: SupabaseLike,
	envelope: BudgetEnvelope,
	userId: string,
	context: FinanceContext = defaultContext,
): Promise<void> {
	const start = toDateKey(envelope.start_date);
	const end = toDateKey(envelope.end_date);
	if (!start || !end || getEnvelopeStatus(envelope, end) !== "active") {
		await deleteEnvelopeAllocationsForEnvelope(supabase, envelope.id);
		return;
	}

	let query = supabase
		.from("transactions")
		.select("id,type,transaction_type,nominal,amount,kategori,category,tanggal,date,created_at,catatan,description,merchant");
	query = applyFinanceContextFilter(query, context) as typeof query;
	if (context.type === "personal") {
		query = query.eq("user_id", userId) as typeof query;
	}

	const { data, error } = await query;
	if (error) throw error;

	const rows = ((data ?? []) as BudgetSyncTransactionRow[])
		.map(normalizeBudgetSyncTransaction)
		.filter((transaction) => {
			const transactionType = transaction.transaction_type ?? transaction.type;
			const transactionDate = toDateKey(
				transaction.date ?? transaction.tanggal ?? transaction.created_at,
			);
			return (
				transactionType === "expense" &&
				Number(transaction.amount ?? 0) > 0 &&
				transactionDate >= start &&
				transactionDate <= end &&
				envelopeMatchesTransactionCategory(transaction.categoryName, envelope)
			);
		})
		.map((transaction) => ({
			transaction_id: transaction.id,
			envelope_id: envelope.id,
			amount: Number(transaction.amount ?? 0),
			confidence: 0.98,
			needs_review: false,
		}));

	await deleteEnvelopeAllocationsForEnvelope(supabase, envelope.id);
	if (rows.length === 0) return;

	const { error: insertError } = await supabase
		.from("transaction_envelope_allocations")
		.insert(rows);
	if (insertError) throw insertError;
}

export async function syncEnvelopeAllocationForTransaction(
	supabase: SupabaseLike,
	transaction: EnvelopeAllocationSyncTransaction,
	userId: string,
	context: FinanceContext = defaultContext,
): Promise<void> {
	const transactionType = transaction.transaction_type ?? transaction.type;
	const amount = Number(transaction.amount ?? 0);
	const transactionDate = toDateKey(
		transaction.date ?? transaction.tanggal ?? transaction.created_at,
	);

	if (transactionType !== "expense" || amount <= 0 || !transactionDate) {
		await deleteEnvelopeAllocationsForTransaction(supabase, transaction.id);
		return;
	}

	const envelopes = (await listBudgetEnvelopes(supabase, userId, context)).filter(
		(envelope) =>
			getEnvelopeStatus(envelope, transactionDate) === "active" &&
			toDateKey(envelope.start_date) <= transactionDate &&
			toDateKey(envelope.end_date) >= transactionDate,
	);

	const allocations = envelopes
		.filter((envelope) =>
			envelopeMatchesTransactionCategory(transaction.categoryName, envelope),
		)
		.map((envelope) => ({
			envelope,
			confidence: 0.98,
			needs_review: false,
		}));

	await deleteEnvelopeAllocationsForTransaction(supabase, transaction.id);

	if (allocations.length === 0) return;

	const rows = allocations.map((match) => ({
		transaction_id: transaction.id,
		envelope_id: match.envelope.id,
		amount,
		confidence: match.confidence,
		needs_review: match.needs_review,
	}));

	// Delete-first + insert avoids noisy browser 400s on live databases that do not
	// yet have the unique constraint required by PostgREST upsert on this table.
	const { error: insertError } = await supabase
		.from("transaction_envelope_allocations")
		.insert(rows);

	if (insertError) throw insertError;
}
