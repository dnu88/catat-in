import { CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD } from "../../services/transaction-classifier";
import { OTHER_CATEGORY_NAMES } from "../../services/transaction-review";
import {
	allDraftsValid,
	type DraftValidationContext,
	type EntrySource,
	type TransactionDraft,
} from "./draft";

/**
 * Why a draft batch was not saved automatically. Every value maps to a short
 * user-facing sentence on the review screen, so the user knows what to check.
 */
export type AutoSaveBlockReason =
	| "no_drafts"
	| "source_not_text"
	| "multi_transaction"
	| "missing_amount"
	| "low_confidence"
	| "generic_category"
	| "transfer_requires_target"
	| "extractor_unsure"
	| "unresolved_fields"
	| "invalid_draft";

export type AutoSaveDecision = {
	auto: boolean;
	reason: AutoSaveBlockReason | null;
};

export type AutoSaveInput = {
	/** Where the drafts came from. Only text may be written automatically. */
	source: EntrySource;
	/** Drafts exactly as the review screen would receive them (wallet attached). */
	drafts: TransactionDraft[];
	/** Free-text uncertainty the extractor flagged (AI `unclear` field). */
	extractionUnclear?: string | null;
	/** Same validation context the review screen uses (wallets/categories/canCreate). */
	validation: DraftValidationContext;
	/** Minimum confidence required to save without asking. Defaults to the classifier threshold. */
	minConfidence?: number;
};

const GENERIC_CATEGORY_NAMES = OTHER_CATEGORY_NAMES.map((name) =>
	name.trim().toLowerCase(),
);

function isGenericCategory(name: string) {
	return GENERIC_CATEGORY_NAMES.includes(name.trim().toLowerCase());
}

function hasUnclearFlag(value: string | null | undefined) {
	return typeof value === "string" && value.trim() !== "";
}

/**
 * Decides whether a text entry may be written without asking the user.
 *
 * Every rule must pass: one transaction, a positive amount, a specific
 * category, no transfer (it needs a target wallet), no uncertainty flagged by
 * the extractor, enough confidence, and a draft that passes the same
 * validation the review screen enforces. Anything else falls back to review —
 * the flow never guesses on the user's behalf.
 */
export function shouldAutoSaveEntry(input: AutoSaveInput): AutoSaveDecision {
	const minConfidence =
		input.minConfidence ?? CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD;
	const { drafts } = input;

	if (drafts.length === 0) return { auto: false, reason: "no_drafts" };
	// Receipts and photos always keep the confirmation step: their drafts need a
	// human to check items, totals, tax and splits.
	if (input.source !== "text") {
		return { auto: false, reason: "source_not_text" };
	}
	if (drafts.length > 1) return { auto: false, reason: "multi_transaction" };

	const [draft] = drafts;

	if (draft.transactionType === "transfer") {
		return { auto: false, reason: "transfer_requires_target" };
	}
	if (draft.amount == null || draft.amount <= 0) {
		return { auto: false, reason: "missing_amount" };
	}
	if (isGenericCategory(draft.category)) {
		return { auto: false, reason: "generic_category" };
	}
	if (draft.unresolvedFields.length > 0) {
		return { auto: false, reason: "unresolved_fields" };
	}
	if (hasUnclearFlag(input.extractionUnclear)) {
		return { auto: false, reason: "extractor_unsure" };
	}

	const confidence =
		typeof draft.confidence === "number" ? draft.confidence : null;
	if (confidence == null || confidence < minConfidence) {
		return { auto: false, reason: "low_confidence" };
	}
	if (!allDraftsValid(drafts, input.validation)) {
		return { auto: false, reason: "invalid_draft" };
	}

	return { auto: true, reason: null };
}
