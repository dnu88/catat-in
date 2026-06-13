import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "./currentUser";
import { applyFinanceContextFilter, type FinanceContext } from "./finance-context-query";
import { normalizeTransaction, type Transaction } from "./transactions";

const OTHER_CATEGORY_NAMES = ["Lainnya", "Other", "Other expenses"];

export type TransactionReviewSummary = {
  count: number;
  reasons: {
    review_required: number;
    low_confidence: number;
    other_category: number;
    missing_fields: number;
  };
};

export type TransactionReviewResult = {
  summary: TransactionReviewSummary;
  transactions: Transaction[];
};

/**
 * Evaluates whether a single transaction needs review.
 */
function needsReview(tx: Transaction): {
  review_required: boolean;
  low_confidence: boolean;
  other_category: boolean;
  missing_fields: boolean;
} {
  if (tx.is_verified === true) {
    return {
      review_required: false,
      low_confidence: false,
      other_category: false,
      missing_fields: false,
    };
  }

  const flags = {
    review_required: tx.review_required === true,
    low_confidence:
      typeof tx.confidence === "number" && tx.confidence < 0.5,
    other_category: OTHER_CATEGORY_NAMES.includes(tx.category ?? ""),
    missing_fields:
      tx.amount == null ||
      tx.amount <= 0 ||
      !tx.category?.trim() ||
      !tx.date ||
      tx.date.trim() === "",
  };

  return flags;
}

function flagsToReasons(flags: ReturnType<typeof needsReview>) {
  const reasons: TransactionReviewSummary["reasons"] = {
    review_required: 0,
    low_confidence: 0,
    other_category: 0,
    missing_fields: 0,
  };

  if (flags.review_required) reasons.review_required += 1;
  if (flags.low_confidence) reasons.low_confidence += 1;
  if (flags.other_category) reasons.other_category += 1;
  if (flags.missing_fields) reasons.missing_fields += 1;

  return reasons;
}

/**
 * Get transactions that need review for the given finance context.
 * Limits to recent records to avoid loading large datasets.
 */
export async function getTransactionReviewSummary(
  context: FinanceContext,
  limit = 50,
): Promise<TransactionReviewResult> {
  await getCurrentUserId(); // ensures authenticated

  let query: any = supabase
    .from("transactions")
    .select("*")
    .order("tanggal", { ascending: false })
    .limit(limit);

  query = applyFinanceContextFilter(query, context);

  const { data, error } = await query;
  if (error) throw error;

  const all = (data ?? []).map(normalizeTransaction);
  const needsReviewList: Transaction[] = [];
  const reasons: TransactionReviewSummary["reasons"] = {
    review_required: 0,
    low_confidence: 0,
    other_category: 0,
    missing_fields: 0,
  };

  for (const tx of all) {
    const flags = needsReview(tx);
    if (Object.values(flags).some(Boolean)) {
      needsReviewList.push(tx);
      const r = flagsToReasons(flags);
      reasons.review_required += r.review_required;
      reasons.low_confidence += r.low_confidence;
      reasons.other_category += r.other_category;
      reasons.missing_fields += r.missing_fields;
    }
  }

  return {
    summary: {
      count: needsReviewList.length,
      reasons,
    },
    transactions: needsReviewList,
  };
}
