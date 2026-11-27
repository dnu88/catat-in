import type { SupabaseClient } from "@supabase/supabase-js";
import { areCategoryNamesEquivalent } from "./category-taxonomy";

/**
 * Aturan merchant → kategori yang dipelajari dari koreksi user (prinsip 3,
 * discipline mode). Setiap kali user mengubah kategori sebuah draf yang punya
 * merchant, satu aturan ditulis; catatan berikutnya dengan merchant yang sama
 * memakai kategori itu SEBELUM tebakan AI dipakai.
 *
 * Tabel: `merchant_category_rules` (RLS per user/household — lihat migrasi
 * 202611280001_category_discipline.sql).
 */

export type MerchantRule = {
	id: string;
	merchant_norm: string;
	category_name: string;
	category_id: string | null;
	source: string;
	hits: number;
};

type RuleRow = {
	id: string;
	merchant_norm: string;
	category_id: string | null;
	source: string;
	hits: number;
	categories?: { name: string | null } | null;
};

function normalizeMerchant(merchant: string): string {
	return merchant.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function listMerchantRules(
	supabase: SupabaseClient,
	userKey: string,
	householdId: string | null,
): Promise<MerchantRule[]> {
	let query = supabase
		.from("merchant_category_rules")
		.select("id, merchant_norm, category_id, source, hits, categories(name)")
		.eq("user_id", userKey)
		.order("hits", { ascending: false })
		.limit(100);
	query = householdId
		? query.eq("household_id", householdId)
		: query.is("household_id", null);

	const { data, error } = await query;
	if (error) throw error;
	return ((data ?? []) as unknown as RuleRow[]).map((row) => ({
		id: row.id,
		merchant_norm: row.merchant_norm,
		category_name: row.categories?.name ?? "",
		category_id: row.category_id,
		source: row.source,
		hits: row.hits ?? 0,
	}));
}

export async function upsertMerchantRule(
	supabase: SupabaseClient,
	userKey: string,
	householdId: string | null,
	merchant: string,
	categoryName: string,
	categoryId: string | null,
): Promise<void> {
	const merchantNorm = normalizeMerchant(merchant);
	if (!merchantNorm) return;

	const { data: existing, error: selectError } = await supabase
		.from("merchant_category_rules")
		.select("id, hits")
		.eq("user_id", userKey)
		.eq("merchant_norm", merchantNorm)
		.is("household_id", householdId)
		.limit(1);

	if (selectError) throw selectError;

	const prev = (existing ?? [])[0] as { id: string; hits: number } | undefined;
	if (prev) {
		await supabase
			.from("merchant_category_rules")
			.update({
				category_name: categoryName,
				category_id: categoryId,
				hits: (prev.hits ?? 0) + 1,
				updated_at: new Date().toISOString(),
			})
			.eq("id", prev.id);
		return;
	}

	await supabase.from("merchant_category_rules").insert({
		user_id: userKey,
		household_id: householdId,
		merchant_norm: merchantNorm,
		category_name: categoryName,
		category_id: categoryId,
		source: "user_correction",
		hits: 1,
	});
}

/**
 * Terapkan aturan ke draf: kategori dari aturan menang atas tebakan AI untuk
 * merchant yang sama (hanya bila kategori aturan benar-benar berbeda dari
 * tebakan dan masih cocok tipe transaksi).
 */
export function applyMerchantRulesToDrafts(
	drafts: Array<{ merchant: string | null; categoryName?: string; category?: string; suggestedCategory?: string | null }>,
	rules: MerchantRule[],
): number {
	if (rules.length === 0) return 0;
	let applied = 0;
	for (const draft of drafts) {
		if (!draft.merchant?.trim()) continue;
		const norm = normalizeMerchant(draft.merchant);
		const rule = rules.find((item) => item.merchant_norm === norm);
		if (!rule?.category_name) continue;
		const current = draft.categoryName ?? draft.category ?? "";
		if (!current || !areCategoryNamesEquivalent(current, rule.category_name)) {
			if (draft.categoryName != null) draft.categoryName = rule.category_name;
			else if (draft.category != null) draft.category = rule.category_name;
			// Aturan menang — saran AI untuk merchant ini tidak lagi relevan.
			draft.suggestedCategory = null;
			applied++;
		}
	}
	return applied;
}
