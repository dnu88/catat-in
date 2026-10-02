import { supabase } from "../lib/supabase";
import { Sentry } from "../lib/sentry";
import { getCurrentUserId } from "./currentUser";
import { syncEnvelopeAllocationForTransaction } from "./budget-envelopes";
import {
	canSaveDraft,
	validateDraft,
	type CategoryOption,
	type DraftFieldErrors,
	type DraftValidationContext,
	type TransactionDraft,
	type WalletOption,
} from "../features/transaction-entry/draft";
import type { ContextSnapshot } from "../features/transaction-entry/state";
import {
	applyFinanceContextFilter,
	canCreateInContext,
	type FinanceContext,
} from "./finance-context-query";
import { normalizeTransaction, type Transaction } from "./transactions";

/**
 * Atomic, idempotent persistence for a reviewed transaction-entry batch.
 *
 * The server owns the write: create_transaction_entry_v2 inserts every draft in
 * one statement, records the request id and returns the rows. Replaying the same
 * request id returns the already-written rows instead of inserting again, so a
 * retry after a timeout cannot double-charge the user. Wallet balances keep
 * being maintained by the existing database trigger; this module never writes a
 * balance.
 */

export type SaveEntryInput = {
	/** Fresh uuid minted per user-initiated save; reused verbatim on retries. */
	requestId: string;
	/** Stable hash of the exact drafts, used to detect a changed replay. */
	fingerprint: string;
	context: ContextSnapshot;
	drafts: TransactionDraft[];
	/**
	 * Optional client-side validation context. When wallets are omitted the
	 * local wallet-membership rules are skipped (the server is authoritative).
	 * Categories are never invented — omit them and category membership is not
	 * checked locally.
	 */
	wallets?: WalletOption[];
	categories?: CategoryOption[];
};

export type SaveEntryResult = {
	transactions: Transaction[];
	/** True when the (non-blocking) budget-allocation sync failed after a save. */
	budgetSyncWarning: boolean;
};

export type EntryPersistenceErrorKind =
	| "validation"
	| "permission"
	| "conflict"
	| "network"
	| "unknown";

const USER_MESSAGES: Record<EntryPersistenceErrorKind, string> = {
	validation: "Periksa kembali data transaksi.",
	permission: "Akses lihat saja",
	conflict: "Permintaan ini sudah tercatat dengan data berbeda.",
	network: "Koneksi bermasalah. Coba lagi.",
	unknown: "Gagal menyimpan transaksi.",
};

/**
 * Carries a user-safe message plus a machine-readable kind. The raw backend
 * error is kept on `cause` for logging only and is never shown to the user.
 */
export class EntryPersistenceError extends Error {
	readonly kind: EntryPersistenceErrorKind;
	readonly fields?: Record<string, DraftFieldErrors>;
	/** Raw backend error, for logging only. Never surfaced to the user. */
	readonly cause?: unknown;

	constructor(
		kind: EntryPersistenceErrorKind,
		message: string,
		options?: { fields?: Record<string, DraftFieldErrors>; cause?: unknown },
	) {
		super(message);
		this.name = "EntryPersistenceError";
		this.kind = kind;
		this.fields = options?.fields;
		this.cause = options?.cause;
	}
}

function toFinanceContext(context: ContextSnapshot): FinanceContext {
	if (context.id === "personal") return { type: "personal" };
	// ContextSnapshot only carries canCreate; a non-writer is a viewer.
	return {
		type: "household",
		householdId: context.id,
		role: context.canCreate ? "member" : "viewer",
	};
}

/**
 * Wallet options derived from the drafts themselves, used only when the caller
 * did not pass a wallet list. This keeps amount/date/permission checks active
 * without inventing wallets the user never chose.
 */
function deriveWalletsFromDrafts(drafts: TransactionDraft[]): WalletOption[] {
	const ids = new Set<string>();
	for (const draft of drafts) {
		if (draft.walletId) ids.add(draft.walletId);
		if (draft.targetWalletId) ids.add(draft.targetWalletId);
	}
	return Array.from(ids).map((id) => ({ id, name: id }));
}

function buildValidationContext(input: SaveEntryInput): DraftValidationContext {
	const wallets =
		input.wallets === undefined
			? deriveWalletsFromDrafts(input.drafts)
			: input.wallets;
	return {
		wallets,
		categories: input.categories ?? [],
		canCreate: input.context.canCreate,
		allowMissingWallet: false,
	};
}

function buildDraftPayload(draft: TransactionDraft): Record<string, unknown> {
	return {
		wallet_id: draft.walletId,
		target_wallet_id: draft.targetWalletId,
		transaction_type: draft.transactionType,
		amount: draft.amount,
		category: draft.category,
		description: draft.description,
		merchant: draft.merchant,
		date: draft.date,
		receipt_url: draft.receiptUrl,
		input_type: draft.source,
		status: "done",
		raw_input: null,
		review_required: draft.unresolvedFields.length > 0,
		is_verified: false,
		confidence: draft.confidence,
	};
}

function extractMessage(error: unknown): string {
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string") return message;
	}
	if (typeof error === "string") return error;
	return "";
}

function extractCode(error: unknown): string {
	if (error && typeof error === "object" && "code" in error) {
		const code = (error as { code?: unknown }).code;
		if (typeof code === "string") return code;
	}
	return "";
}

function classifyError(error: unknown): EntryPersistenceErrorKind {
	const message = extractMessage(error).toLowerCase();
	const code = extractCode(error);
	const name =
		error && typeof error === "object" && "name" in error
			? String((error as { name?: unknown }).name ?? "")
			: "";

	// A replayed request id with a different payload.
	if (
		message.includes("entry_request_conflict") ||
		message.includes("fingerprint")
	) {
		return "conflict";
	}

	// RLS / Postgres permission failures.
	if (
		code === "42501" ||
		message.includes("akses lihat saja") ||
		message.includes("permission denied") ||
		message.includes("row-level security") ||
		message.includes("row level security")
	) {
		return "permission";
	}

	// Transport-level failures (fetch throws, not a PostgREST error object).
	if (
		name === "AbortError" ||
		message.includes("network request failed") ||
		message.includes("failed to fetch") ||
		message.includes("network") ||
		message.includes("timeout") ||
		message.includes("timed out") ||
		message.includes("offline") ||
		message.includes("econn") ||
		message.includes("enotfound")
	) {
		return "network";
	}

	return "unknown";
}

function toEntryError(error: unknown): EntryPersistenceError {
	const kind = classifyError(error);
	return new EntryPersistenceError(kind, USER_MESSAGES[kind], { cause: error });
}

function toBudgetSyncTransaction(transaction: Transaction) {
	return {
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
	};
}

/**
 * Validates, then persists the whole draft batch atomically and idempotently.
 *
 * Throws EntryPersistenceError('validation') before any network call when a
 * draft is unsaveable, carrying per-draft field errors keyed by draft.key.
 * A budget-allocation failure never fails the save; it only sets
 * budgetSyncWarning.
 */
export async function saveEntry(input: SaveEntryInput): Promise<SaveEntryResult> {
	const financeContext = toFinanceContext(input.context);

	if (
		!input.context.canCreate ||
		!canCreateInContext(financeContext)
	) {
		throw new EntryPersistenceError("permission", USER_MESSAGES.permission);
	}

	if (input.drafts.length === 0) {
		throw new EntryPersistenceError("validation", USER_MESSAGES.validation, {
			fields: {},
		});
	}

	const validationContext = buildValidationContext(input);
	const fields: Record<string, DraftFieldErrors> = {};
	for (const draft of input.drafts) {
		if (!canSaveDraft(draft, validationContext)) {
			fields[draft.key] = validateDraft(draft, validationContext);
		}
	}
	if (Object.keys(fields).length > 0) {
		throw new EntryPersistenceError("validation", USER_MESSAGES.validation, {
			fields,
		});
	}

	let data: unknown;
	let error: unknown;
	try {
		const response = await supabase.rpc("create_transaction_entry_v2", {
			p_request_id: input.requestId,
			p_fingerprint: input.fingerprint,
			p_context_type: financeContext.type,
			p_household_id:
				financeContext.type === "household" ? financeContext.householdId : null,
			p_drafts: input.drafts.map(buildDraftPayload),
		});
		data = response.data;
		error = response.error;
	} catch (thrown) {
		throw toEntryError(thrown);
	}

	if (error) throw toEntryError(error);

	const rows = Array.isArray(data) ? data : data ? [data] : [];
	const transactions = rows.map((row) => normalizeTransaction(row));

	let budgetSyncWarning = false;
	try {
		const userId = await getCurrentUserId();
		for (const transaction of transactions) {
			try {
				await syncEnvelopeAllocationForTransaction(
					supabase,
					toBudgetSyncTransaction(transaction),
					userId,
					financeContext,
				);
			} catch (syncError) {
				budgetSyncWarning = true;
				console.error(
					"[entry-persistence] budget allocation sync failed after a successful save:",
					syncError,
				);
				Sentry.captureException(syncError);
			}
		}
	} catch (userError) {
		budgetSyncWarning = true;
		console.error(
			"[entry-persistence] could not resolve user for budget sync:",
			userError,
		);
		Sentry.captureException(userError);
	}

	return { transactions, budgetSyncWarning };
}

function normalizedCategory(value: string | null | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

function matchesDraft(
	draft: TransactionDraft,
	transaction: Transaction,
): boolean {
	if (draft.amount === null || Number(transaction.amount) !== draft.amount) {
		return false;
	}
	if ((transaction.date ?? "").slice(0, 10) !== draft.date) {
		return false;
	}
	return (
		normalizedCategory(transaction.category) ===
		normalizedCategory(draft.category)
	);
}

/**
 * Recovery path for an unknown-outcome save (e.g. a timeout).
 *
 * Read-only: it re-reads the rows for the SAME finance context created at or
 * after `sinceIso` and returns those matching any draft on
 * amount + date + category. It never inserts anything — its only job is to
 * reveal whether a timed-out save actually committed.
 */
export async function reconcileEntry(input: {
	context: ContextSnapshot;
	drafts: TransactionDraft[];
	sinceIso: string;
}): Promise<Transaction[]> {
	const financeContext = toFinanceContext(input.context);

	let query: any = supabase.from("transactions").select("*");
	query = applyFinanceContextFilter(query, financeContext);
	query = query.gte("created_at", input.sinceIso);

	let data: unknown;
	let error: unknown;
	try {
		const response = await query;
		data = response.data;
		error = response.error;
	} catch (thrown) {
		throw toEntryError(thrown);
	}

	if (error) throw toEntryError(error);

	const rows = (Array.isArray(data) ? data : []) as unknown[];
	return rows
		.map((row) => normalizeTransaction(row))
		.filter((transaction) =>
			input.drafts.some((draft) => matchesDraft(draft, transaction)),
		);
}
