import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AutoSaveBlockReason } from "./auto-save";
import type { ReviewField, TransactionDraft } from "./draft";

/**
 * Local, non-identifying counters for the review step.
 *
 * Purpose: answer "how often does the review ask for one field instead of a
 * whole form, and does that path still end in a saved transaction?" without
 * shipping analytics infrastructure or any personal data. Counters live on the
 * device only; nothing here contains amounts, categories, text or identifiers.
 */
export type ReviewMode = "focus" | "full";
export type ReviewCloseOutcome = "saved" | "failed" | "abandoned";

export type ReviewMetrics = {
	version: 1;
	opened: number;
	focus: number;
	full: number;
	/** Keyed `<mode>:<reason>` so a soft reason that fell back to full is visible. */
	byModeReason: Record<string, number>;
	closed: Record<ReviewCloseOutcome, number>;
	fieldsTouched: Record<ReviewField, number>;
};

export const REVIEW_METRICS_KEY = "kaswise:review-metrics:v1";

/**
 * Reasons that mean "the extractor was unsure", not "the data is broken".
 * Anything else (no drafts, receipt source, multiple transactions, transfer,
 * hard validation failure) always deserves the full review.
 */
const SOFT_REASONS: readonly AutoSaveBlockReason[] = [
	"unresolved_fields",
	"extractor_unsure",
	"low_confidence",
	"generic_category",
];

export function emptyReviewMetrics(): ReviewMetrics {
	return {
		version: 1,
		opened: 0,
		focus: 0,
		full: 0,
		byModeReason: {},
		closed: { saved: 0, failed: 0, abandoned: 0 },
		fieldsTouched: { amount: 0, category: 0, date: 0, wallet: 0 },
	};
}

/**
 * Routing rule for the focus review: one draft whose only problem is extractor
 * doubt. Receipts, batches, transfers and hard errors are never focus reviews,
 * even while the form itself still renders in full.
 */
export function focusEligible(
	drafts: TransactionDraft[],
	reason: AutoSaveBlockReason | null | undefined,
): boolean {
	if (drafts.length !== 1) return false;
	if (!reason) return false;
	return SOFT_REASONS.includes(reason);
}

export function reviewMode(
	drafts: TransactionDraft[],
	reason: AutoSaveBlockReason | null | undefined,
): ReviewMode {
	return focusEligible(drafts, reason) ? "focus" : "full";
}

export function applyOpened(
	metrics: ReviewMetrics,
	mode: ReviewMode,
	reason: AutoSaveBlockReason | null | undefined,
): ReviewMetrics {
	const key = `${mode}:${reason ?? "unknown"}`;
	return {
		...metrics,
		opened: metrics.opened + 1,
		focus: metrics.focus + (mode === "focus" ? 1 : 0),
		full: metrics.full + (mode === "full" ? 1 : 0),
		byModeReason: { ...metrics.byModeReason, [key]: (metrics.byModeReason[key] ?? 0) + 1 },
	};
}

export function applyFieldTouched(
	metrics: ReviewMetrics,
	field: ReviewField,
): ReviewMetrics {
	return {
		...metrics,
		fieldsTouched: {
			...metrics.fieldsTouched,
			[field]: (metrics.fieldsTouched[field] ?? 0) + 1,
		},
	};
}

export function applyClosed(
	metrics: ReviewMetrics,
	outcome: ReviewCloseOutcome,
): ReviewMetrics {
	return {
		...metrics,
		closed: { ...metrics.closed, [outcome]: (metrics.closed[outcome] ?? 0) + 1 },
	};
}

/** Coerces whatever is stored into a complete, additive shape. */
export function normaliseMetrics(raw: unknown): ReviewMetrics {
	const base = emptyReviewMetrics();
	if (!raw || typeof raw !== "object") return base;
	const parsed = raw as Partial<ReviewMetrics>;
	return {
		version: 1,
		opened: typeof parsed.opened === "number" ? parsed.opened : 0,
		focus: typeof parsed.focus === "number" ? parsed.focus : 0,
		full: typeof parsed.full === "number" ? parsed.full : 0,
		byModeReason: { ...(parsed.byModeReason ?? {}) },
		closed: { ...base.closed, ...(parsed.closed ?? {}) },
		fieldsTouched: { ...base.fieldsTouched, ...(parsed.fieldsTouched ?? {}) },
	};
}

// Read-modify-write on a single key; the writes are chained so two quick events
// cannot clobber each other, and every failure is swallowed: instrumentation must
// never break a save.
let writeChain: Promise<void> = Promise.resolve();

async function mutate(
	update: (metrics: ReviewMetrics) => ReviewMetrics,
): Promise<void> {
	writeChain = writeChain.then(async () => {
		try {
			const raw = await AsyncStorage.getItem(REVIEW_METRICS_KEY);
			const current = normaliseMetrics(raw ? JSON.parse(raw) : null);
			await AsyncStorage.setItem(
				REVIEW_METRICS_KEY,
				JSON.stringify(update(current)),
			);
		} catch {
			// Ignore: counters are diagnostics, not product state.
		}
	});
	await writeChain;
}

export function trackReviewOpened(
	mode: ReviewMode,
	reason: AutoSaveBlockReason | null | undefined,
): Promise<void> {
	return mutate((metrics) => applyOpened(metrics, mode, reason));
}

export function trackFieldTouched(field: ReviewField): Promise<void> {
	return mutate((metrics) => applyFieldTouched(metrics, field));
}

export function trackReviewClosed(outcome: ReviewCloseOutcome): Promise<void> {
	return mutate((metrics) => applyClosed(metrics, outcome));
}

export async function readReviewMetrics(): Promise<ReviewMetrics> {
	try {
		const raw = await AsyncStorage.getItem(REVIEW_METRICS_KEY);
		return normaliseMetrics(raw ? JSON.parse(raw) : null);
	} catch {
		return emptyReviewMetrics();
	}
}

export async function resetReviewMetrics(): Promise<void> {
	try {
		await AsyncStorage.removeItem(REVIEW_METRICS_KEY);
	} catch {
		// Ignore.
	}
}
