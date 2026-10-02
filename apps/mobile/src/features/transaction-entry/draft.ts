import type { TransactionType } from "../../services/transactions";

/**
 * Transaction entry draft contract.
 *
 * A draft is a pure, serialisable description of what the user intends to save.
 * Nothing in this module performs I/O: adapters produce drafts, the review UI
 * edits them, and the save layer validates then persists them exactly once.
 */

export type EntrySource = "manual" | "text" | "voice" | "image";

/** Fields that AI extraction can leave uncertain and the reviewer must confirm. */
export type ReviewField = "amount" | "category" | "date" | "wallet";

export type TransactionDraft = {
	/** Stable identity for list keys and per-draft error reporting. */
	key: string;
	source: EntrySource;
	transactionType: TransactionType;
	amount: number | null;
	category: string;
	description: string;
	walletId: string | null;
	targetWalletId: string | null;
	/** Local ISO calendar date, YYYY-MM-DD. Never a UTC-shifted timestamp. */
	date: string;
	merchant: string | null;
	/** Extraction confidence, kept as metadata. Editing a field never raises it. */
	confidence: number | null;
	/** Fields the extractor marked uncertain (from extraction metadata only). */
	unresolvedFields: ReviewField[];
	/** Uncertainty the user has explicitly reviewed and accepted. */
	acknowledgedFields: ReviewField[];
	receiptUrl: string | null;
	extraction: Record<string, unknown> | null;
};

export type WalletOption = {
	id: string;
	name: string;
	is_active?: boolean;
};

export type CategoryOption = {
	name: string;
};

export type DraftValidationContext = {
	wallets: WalletOption[];
	categories: CategoryOption[];
	canCreate: boolean;
	/**
	 * Legacy/import paths may still record a transaction without a wallet.
	 * The interactive entry flow must keep this false so a wallet problem asks
	 * the user to choose again instead of silently saving an unscoped row.
	 */
	allowMissingWallet?: boolean;
};

export type DraftFieldErrors = {
	amount?: string;
	category?: string;
	date?: string;
	walletId?: string;
	targetWalletId?: string;
	permission?: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Local (not UTC) calendar date, so "today" does not shift across timezones. */
export function localToday(now: Date = new Date()): string {
	const year = now.getFullYear();
	const month = `${now.getMonth() + 1}`.padStart(2, "0");
	const day = `${now.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** True only for a real calendar date written as YYYY-MM-DD. */
export function isValidLocalIsoDate(value: unknown): value is string {
	if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
	const [year, month, day] = value.split("-").map(Number);
	if (month < 1 || month > 12 || day < 1 || day > 31) return false;
	const candidate = new Date(year, month - 1, day);
	return (
		candidate.getFullYear() === year &&
		candidate.getMonth() === month - 1 &&
		candidate.getDate() === day
	);
}

/** Rupiah has no minor unit: whole, finite, positive numbers only. */
export function isValidRupiahAmount(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		Number.isInteger(value) &&
		value > 0
	);
}

function activeWalletIds(wallets: WalletOption[]): Set<string> {
	return new Set(
		wallets.filter((wallet) => wallet.is_active !== false).map((wallet) => wallet.id),
	);
}

function categoryNames(categories: CategoryOption[]): Set<string> {
	return new Set(
		categories.map((category) => category.name?.trim().toLowerCase()).filter(Boolean),
	);
}

/**
 * Fields still carrying extractor uncertainty that the user has not accepted.
 * Saving is blocked while this is non-empty, so a doubtful AI read cannot be
 * written silently.
 */
export function unacknowledgedWarnings(draft: TransactionDraft): ReviewField[] {
	const acknowledged = new Set(draft.acknowledgedFields);
	return draft.unresolvedFields.filter((field) => !acknowledged.has(field));
}

/**
 * Errors that block persistence for a single draft against a context snapshot.
 * Re-run immediately before saving: the wallet list and role can change while a
 * draft sits open.
 */
export function validateDraft(
	draft: TransactionDraft,
	context: DraftValidationContext,
): DraftFieldErrors {
	const errors: DraftFieldErrors = {};

	if (!context.canCreate) {
		errors.permission = "Akses lihat saja";
	}

	if (!isValidRupiahAmount(draft.amount)) {
		errors.amount = "INVALID_AMOUNT";
	}

	if (!isValidLocalIsoDate(draft.date)) {
		errors.date = "INVALID_DATE";
	}

	const wallets = activeWalletIds(context.wallets);
	const allowMissing = context.allowMissingWallet === true;

	if (draft.transactionType === "transfer") {
		if (!draft.walletId || !wallets.has(draft.walletId)) {
			errors.walletId = "MISSING_WALLET";
		}
		if (!draft.targetWalletId || !wallets.has(draft.targetWalletId)) {
			errors.targetWalletId = "MISSING_TARGET_WALLET";
		} else if (draft.walletId && draft.targetWalletId === draft.walletId) {
			errors.targetWalletId = "SAME_WALLET";
		}
		return errors;
	}

	if (!draft.walletId) {
		if (!allowMissing) errors.walletId = "MISSING_WALLET";
	} else if (!wallets.has(draft.walletId)) {
		errors.walletId = "WALLET_NOT_IN_CONTEXT";
	}

	const name = draft.category?.trim();
	if (!name) {
		errors.category = "MISSING_CATEGORY";
	} else if (context.categories.length > 0 && !categoryNames(context.categories).has(name.toLowerCase())) {
		errors.category = "UNKNOWN_CATEGORY";
	}

	return errors;
}

export function isDraftValid(
	draft: TransactionDraft,
	context: DraftValidationContext,
): boolean {
	return Object.keys(validateDraft(draft, context)).length === 0;
}

/** A draft may be saved only when it is valid and has no unaccepted warning. */
export function canSaveDraft(
	draft: TransactionDraft,
	context: DraftValidationContext,
): boolean {
	return (
		isDraftValid(draft, context) && unacknowledgedWarnings(draft).length === 0
	);
}

export function validateDrafts(
	drafts: TransactionDraft[],
	context: DraftValidationContext,
): DraftFieldErrors[] {
	return drafts.map((draft) => validateDraft(draft, context));
}

export function allDraftsValid(
	drafts: TransactionDraft[],
	context: DraftValidationContext,
): boolean {
	return (
		drafts.length > 0 &&
		drafts.every((draft) => canSaveDraft(draft, context))
	);
}

export function acknowledgeField(
	draft: TransactionDraft,
	field: ReviewField,
): TransactionDraft {
	if (draft.acknowledgedFields.includes(field)) return draft;
	return {
		...draft,
		acknowledgedFields: [...draft.acknowledgedFields, field],
	};
}

export type DraftBatchSummary = {
	count: number;
	total: number;
};

export function summariseDrafts(drafts: TransactionDraft[]): DraftBatchSummary {
	return {
		count: drafts.length,
		total: drafts.reduce(
			(sum, draft) => sum + (isValidRupiahAmount(draft.amount) ? draft.amount : 0),
			0,
		),
	};
}

export function createDraft(
	partial: Partial<TransactionDraft> & Pick<TransactionDraft, "source">,
	now: Date = new Date(),
): TransactionDraft {
	return {
		key: partial.key ?? `${partial.source}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
		source: partial.source,
		transactionType: partial.transactionType ?? "expense",
		amount: partial.amount ?? null,
		category: partial.category ?? "",
		description: partial.description ?? "",
		walletId: partial.walletId ?? null,
		targetWalletId: partial.targetWalletId ?? null,
		date: partial.date ?? localToday(now),
		merchant: partial.merchant ?? null,
		confidence: partial.confidence ?? null,
		unresolvedFields: partial.unresolvedFields ?? [],
		acknowledgedFields: partial.acknowledgedFields ?? [],
		receiptUrl: partial.receiptUrl ?? null,
		extraction: partial.extraction ?? null,
	};
}
