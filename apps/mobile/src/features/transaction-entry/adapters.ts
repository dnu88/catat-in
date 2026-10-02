import { getCategoryCanonicalId } from "../../services/category-taxonomy";
import { categorizeReceiptItem } from "../../services/receipt-item-categorizer";
import {
	normalizeReceiptDate,
	receiptExtractionToDrafts,
	receiptItemLines,
	type ReceiptExtraction,
} from "../../services/receipt-intake";
import type { ClassifiedTransaction } from "../../services/transaction-classifier";
import type { TransactionType } from "../../services/transactions";
import type { VoiceExtraction } from "../../services/voice-intake";
import {
	createDraft,
	isValidRupiahAmount,
	localToday,
	type ReviewField,
	type TransactionDraft,
} from "./draft";

/**
 * Entry-source adapters.
 *
 * Pure translation layer between the AI extraction shapes (text classifier,
 * voice, receipt OCR) and the review-time `TransactionDraft` contract. Nothing
 * here performs I/O, talks to Supabase, or raises an extractor's confidence:
 * adapters only normalise, mark uncertainty, and hand drafts to the review UI.
 */

/** Below this the extractor's category pick is treated as a guess to confirm. */
const CATEGORY_CONFIDENCE_THRESHOLD = 0.8;

/** Canonical id of the generic "Lainnya" / "Other expenses" fallback category. */
const GENERIC_CATEGORY_ID = "other_expenses";

/** Two distinct probe dates used to detect whether a date string parsed. */
const DATE_PROBE_A = new Date(2001, 0, 1);
const DATE_PROBE_B = new Date(2002, 5, 15);

/** Relative words `normalizeReceiptDate` resolves against the fallback date. */
const RELATIVE_DATE_WORDS = new Set([
	"today",
	"hari ini",
	"yesterday",
	"kemarin",
]);

function finiteConfidence(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A category is generic when empty or when it maps to the "Lainnya" fallback. */
function isGenericCategory(category: string | null | undefined): boolean {
	const name = (category ?? "").trim();
	if (!name) return true;
	return getCategoryCanonicalId(name) === GENERIC_CATEGORY_ID;
}

/** Missing confidence is as uncertain as an explicitly low one. */
function isLowConfidence(confidence: number | null): boolean {
	return confidence === null || confidence < CATEGORY_CONFIDENCE_THRESHOLD;
}

/**
 * Resolve an extraction's date to a local ISO calendar date.
 *
 * Uses `normalizeReceiptDate` for parsing and `localToday()` for the fallback,
 * never a UTC-shifted timestamp. `normalizeReceiptDate` silently returns its
 * fallback argument when it cannot parse, so we probe with two different
 * fallbacks: a parsed date ignores the fallback and returns the same value both
 * times, while an unusable value returns each distinct fallback.
 */
function resolveExtractionDate(raw: unknown): {
	date: string;
	missing: boolean;
} {
	if (typeof raw !== "string" || !raw.trim()) {
		return { date: localToday(), missing: true };
	}
	const text = raw.trim().toLowerCase();
	if (RELATIVE_DATE_WORDS.has(text)) {
		return { date: normalizeReceiptDate(raw), missing: false };
	}
	const probeA = normalizeReceiptDate(raw, DATE_PROBE_A);
	const probeB = normalizeReceiptDate(raw, DATE_PROBE_B);
	if (probeA === probeB) return { date: probeA, missing: false };
	return { date: localToday(), missing: true };
}

type DraftSeed = {
	source: TransactionDraft["source"];
	transactionType: TransactionType;
	amount: number | null;
	category: string;
	description: string;
	walletId: string | null;
	targetWalletId?: string | null;
	date: string;
	dateMissing: boolean;
	merchant: string | null;
	confidence: number | null;
	extraction: Record<string, unknown> | null;
};

function buildDraft(seed: DraftSeed): TransactionDraft {
	const unresolvedFields: ReviewField[] = [];
	if (!isValidRupiahAmount(seed.amount)) unresolvedFields.push("amount");
	if (isGenericCategory(seed.category) || isLowConfidence(seed.confidence)) {
		unresolvedFields.push("category");
	}
	if (seed.dateMissing) unresolvedFields.push("date");
	if (!seed.walletId) unresolvedFields.push("wallet");

	return createDraft({
		source: seed.source,
		transactionType: seed.transactionType,
		amount: seed.amount,
		category: seed.category,
		description: seed.description,
		walletId: seed.walletId,
		targetWalletId: seed.targetWalletId ?? null,
		date: seed.date,
		merchant: seed.merchant,
		confidence: seed.confidence,
		unresolvedFields,
		extraction: seed.extraction,
	});
}

/**
 * Text-classifier output to drafts.
 *
 * The classifier already resolved transaction type, category and amount, so the
 * adapter mirrors that result rather than re-deriving it. `fallbackInput` backs
 * the description when the classifier captured no note.
 */
export function textDraftsToDrafts(input: {
	classified: ClassifiedTransaction[];
	fallbackInput: string;
}): TransactionDraft[] {
	const fallbackInput = input.fallbackInput?.trim() ?? "";

	return input.classified.map((classified) => {
		const { date, missing } = resolveExtractionDate(classified.date);
		const note = classified.note?.trim();

		return buildDraft({
			source: "text",
			transactionType: classified.transactionType,
			amount: isValidRupiahAmount(classified.amount) ? classified.amount : null,
			category: classified.categoryName?.trim() ?? "",
			description: note || fallbackInput,
			walletId: null,
			date,
			dateMissing: missing,
			merchant: classified.merchant?.trim() || null,
			confidence: finiteConfidence(classified.confidence),
			extraction: { ...classified } as Record<string, unknown>,
		});
	});
}

/**
 * Voice extraction to a single draft, or null when the recording failed.
 *
 * The transaction type is whatever the extractor reported: an income utterance
 * stays income rather than being forced to expense.
 */
export function voiceExtractionToDraft(
	extraction: VoiceExtraction,
	walletId: string | null,
): TransactionDraft | null {
	if (extraction.status !== "done") return null;

	const fields = extraction.fields;
	const nominal = fields?.nominal ?? null;
	const { date, missing } = resolveExtractionDate(fields?.tanggal ?? null);
	const transcript =
		typeof extraction.transcript === "string" ? extraction.transcript.trim() : "";
	const note = fields?.catatan?.trim();

	return buildDraft({
		source: "voice",
		transactionType: fields?.type === "income" ? "income" : "expense",
		amount: isValidRupiahAmount(nominal) ? nominal : null,
		category: fields?.kategori?.trim() ?? "",
		description: note || transcript,
		walletId,
		date,
		dateMissing: missing,
		merchant: fields?.merchant?.trim() || null,
		confidence: finiteConfidence(extraction.confidence),
		extraction: { ...extraction } as Record<string, unknown>,
	});
}

function receiptCategoryLabel(
	extraction: ReceiptExtraction,
	merchant: string | null,
): string {
	return categorizeReceiptItem({
		itemName: merchant ? `Struk ${merchant}` : "Transaksi dari struk",
		merchant,
		fallbackCategory: extraction.category,
	}).category;
}

/**
 * Receipt extraction to a single total-summary draft (the default mode).
 *
 * The extracted total is the amount and the raw extraction travels untouched in
 * the `extraction` metadata, so the line items stay available for a toggle.
 * Subtotal adjustments are not labelled tax or discount: the extractor does not
 * report which they are.
 */
export function receiptExtractionToSummaryDraft(
	extraction: ReceiptExtraction,
	walletId: string | null,
): TransactionDraft | null {
	const amount = isValidRupiahAmount(extraction.total_amount)
		? extraction.total_amount
		: null;
	if (amount === null) return null;

	const merchant = extraction.merchant?.trim() || null;
	const { date, missing } = resolveExtractionDate(extraction.date);

	return buildDraft({
		source: "image",
		transactionType: "expense",
		amount,
		category: receiptCategoryLabel(extraction, merchant),
		description: merchant ? `Struk ${merchant}` : "Transaksi dari struk",
		walletId,
		date,
		dateMissing: missing,
		merchant,
		confidence: finiteConfidence(extraction.confidence),
		extraction: { ...extraction } as Record<string, unknown>,
	});
}

/**
 * Receipt extraction to one draft per normalised line item.
 *
 * Item amounts come from the same normalisation the receipt service already
 * uses, so totals reconcile. Item name and quantity are preserved in each
 * draft's `extraction` metadata for display.
 */
export function receiptExtractionToItemDrafts(
	extraction: ReceiptExtraction,
	walletId: string | null,
): TransactionDraft[] {
	const { date, missing } = resolveExtractionDate(extraction.date);
	const confidence = finiteConfidence(extraction.confidence);

	return receiptExtractionToDrafts(extraction)
		.filter((legacy) => Boolean(legacy.itemName))
		.map((legacy) =>
			buildDraft({
				source: "image",
				transactionType: "expense",
				amount: isValidRupiahAmount(legacy.amount) ? legacy.amount : null,
				category: legacy.category,
				description: legacy.description,
				walletId,
				date,
				dateMissing: missing,
				merchant: legacy.merchant?.trim() || null,
				confidence,
				extraction: {
					itemName: legacy.itemName ?? null,
					quantity: legacy.quantity ?? null,
				},
			}),
		);
}

/**
 * Preferred receipt review mode: `total` by default, `items` when only line
 * items are usable, and `unreadable` when neither is.
 */
export function receiptDraftMode(
	extraction: ReceiptExtraction,
): "total" | "items" | "unreadable" {
	if (isValidRupiahAmount(extraction.total_amount)) return "total";
	if (receiptExtractionToItemDrafts(extraction, null).length > 0) return "items";
	return "unreadable";
}

/** The two explicit recording modes the user chooses between, plus unreadable. */
export type ReceiptDraftMode = "total" | "items" | "unreadable";

/**
 * Drafts for one explicit receipt recording mode.
 *
 * `total` records the whole receipt as a single transaction (the default) and
 * mirrors `receiptExtractionToSummaryDraft` exactly. `items` records one
 * transaction per printed line; when the printed lines do not add up to the
 * receipt total, the affected drafts are marked with an unresolved `amount`
 * warning so the difference is acknowledged rather than hidden. `unreadable`
 * yields nothing.
 */
export function receiptDraftsForMode(
	extraction: ReceiptExtraction,
	mode: ReceiptDraftMode,
	walletId: string | null,
): TransactionDraft[] {
	if (mode === "unreadable") return [];

	if (mode === "total") {
		const summary = receiptExtractionToSummaryDraft(extraction, walletId);
		return summary ? [summary] : [];
	}

	const lines = receiptItemLines(extraction);
	if (lines.length === 0) return [];

	const { date, missing } = resolveExtractionDate(extraction.date);
	const confidence = finiteConfidence(extraction.confidence);
	const merchant = extraction.merchant?.trim() || null;
	const total = isValidRupiahAmount(extraction.total_amount)
		? extraction.total_amount
		: null;
	const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
	// No confirmed total to reconcile against means nothing to flag.
	const reconciles = total === null || subtotal === total;

	return lines.map((line) => {
		const draft = buildDraft({
			source: "image",
			transactionType: "expense",
			amount: isValidRupiahAmount(line.amount) ? line.amount : null,
			category: categorizeReceiptItem({
				itemName: line.name,
				itemCategory: line.category,
				merchant,
				fallbackCategory: extraction.category,
			}).category,
			description: line.name,
			walletId,
			date,
			dateMissing: missing,
			merchant,
			confidence,
			extraction: { itemName: line.name, quantity: line.quantity },
		});
		if (reconciles) return draft;
		// The split does not add up to the confirmed total: surface it as an
		// unresolved amount rather than adjusting any single printed item.
		return {
			...draft,
			unresolvedFields: [...draft.unresolvedFields, "amount" as ReviewField],
		};
	});
}

/**
 * True only when every draft carries a valid rupiah amount and their sum is
 * exactly the confirmed total. Gates a per-item split save so a batch that
 * does not add up can never be written as if it did.
 */
export function draftsMatchConfirmedTotal(
	drafts: TransactionDraft[],
	confirmedTotal: number,
): boolean {
	if (!isValidRupiahAmount(confirmedTotal)) return false;
	if (drafts.length === 0) return false;
	let sum = 0;
	for (const draft of drafts) {
		if (!isValidRupiahAmount(draft.amount)) return false;
		sum += draft.amount;
	}
	return sum === confirmedTotal;
}

/**
 * Stable fingerprint of the semantic draft payload, ignoring volatile keys.
 * Two draft batches are the same review if this matches; any change to type,
 * amount, category, date, wallet, description or merchant changes the string.
 */
export function draftFingerprint(drafts: TransactionDraft[]): string {
	return drafts
		.map((draft) =>
			[
				draft.transactionType,
				draft.amount === null ? "" : `${draft.amount}`,
				draft.category,
				draft.date,
				draft.walletId ?? "",
				draft.description,
				draft.merchant ?? "",
				draft.targetWalletId ?? "",
			].join("|"),
		)
		.join("||");
}
