import {
	getCategoryDefinitionByName,
	getLocalizedCategoryName,
	type AppLanguage,
	type CategoryCanonicalId,
} from "./category-taxonomy";

type CategorizeReceiptItemInput = {
	itemName?: string | null;
	itemCategory?: string | null;
	merchant?: string | null;
	fallbackCategory?: string | null;
	language?: AppLanguage;
};

type Rule = {
	id: CategoryCanonicalId;
	keywords: string[];
};

const itemRules: Rule[] = [
	{
		id: "health",
		keywords: [
			"obat", "vitamin", "paracetamol", "panadol", "bodrex", "decolgen", "obh", "komix",
			"insto", "hansaplast", "betadine", "alkohol swab", "masker medis", "antangin",
		],
	},
	{
		id: "bills",
		keywords: [
			"pulsa", "token listrik", "token pln", "pln", "paket data", "voucher data", "top up e toll",
			"e toll", "emoney", "e money",
		],
	},
	{
		id: "household_personal_care",
		keywords: [
			"sabun", "shampoo", "sampo", "conditioner", "odol", "pasta gigi", "sikat gigi",
			"deterjen", "detergen", "rinso", "daia", "soklin", "so klin", "molto", "pewangi",
			"sunlight", "mama lemon", "bayclin", "wipol", "karbol", "tisu", "tissue", "kapas",
			"pembalut", "softex", "laurier", "popok", "pampers", "diapers", "lifebuoy", "lux",
			"pepsodent", "pantene", "clear", "sunsilk", "garnier", "nivea", "deodorant",
		],
	},
	{
		id: "food_beverage",
		keywords: [
			"aqua", "le minerale", "cleo", "ades", "teh pucuk", "teh botol", "teh kotak", "fruit tea",
			"pocari", "mizone", "sprite", "coca cola", "fanta", "susu", "ultramilk", "ultra milk",
			"indomilk", "frisian", "yakult", "yogurt", "kopi", "good day", "kapal api", "nescafe",
			"roti", "sari roti", "aoka", "biskuit", "oreo", "wafer", "nabati", "beng beng", "chocolatos",
			"silverqueen", "snack", "chitato", "taro", "lays", "qtela", "ciki", "kacang", "permen",
			"indomie", "mie", "mi instan", "mie instan", "pop mie", "energen", "es krim", "ice cream",
			"sosis", "nugget", "bakso", "nasi", "ayam", "dimsum",
		],
	},
	{
		id: "groceries",
		keywords: [
			"beras", "minyak goreng", "gula", "garam", "tepung", "telur", "sayur", "sayuran",
			"buah", "daging mentah", "ayam mentah", "ikan", "bawang", "cabe", "cabai", "santan",
			"kecap", "saus", "saos", "bumbu", "terigu", "gandum", "gula pasir",
		],
	},
	{
		id: "personal_shopping",
		keywords: [
			"charger", "kabel data", "earphone", "headset", "payung", "sandal", "kaos kaki", "baterai",
		],
	},
];

function normalize(value: string | null | undefined) {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function hasKeyword(source: string, keyword: string) {
	const normalizedKeyword = normalize(keyword);
	return Boolean(normalizedKeyword) && new RegExp(`(^|\\s)${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s)`).test(source);
}

function categoryLabel(id: CategoryCanonicalId, language: AppLanguage) {
	return getLocalizedCategoryName(id, language);
}

function knownCategoryLabel(value: string | null | undefined, language: AppLanguage) {
	const definition = getCategoryDefinitionByName(value);
	return definition ? definition.labels[language] : null;
}

function isMinimarketMerchant(value: string | null | undefined) {
	const normalized = normalize(value);
	return /(^|\s)(indomaret|alfamart|alfamidi|circle k|family mart|lawson)($|\s)/.test(normalized);
}

export function categorizeReceiptItem({
	itemName,
	itemCategory,
	merchant,
	fallbackCategory,
	language = "id",
}: CategorizeReceiptItemInput) {
	const source = normalize(itemName);
	for (const rule of itemRules) {
		if (rule.keywords.some((keyword) => hasKeyword(source, keyword))) {
			return {
				category: categoryLabel(rule.id, language),
				canonicalId: rule.id,
				matchedBy: "item_keyword" as const,
			};
		}
	}

	const aiCategory = knownCategoryLabel(itemCategory, language);
	if (aiCategory) {
		return {
			category: aiCategory,
			canonicalId: getCategoryDefinitionByName(itemCategory)?.id ?? "other_expenses",
			matchedBy: "ai_category" as const,
		};
	}

	const fallback = knownCategoryLabel(fallbackCategory, language);
	if (fallback) {
		return {
			category: fallback,
			canonicalId: getCategoryDefinitionByName(fallbackCategory)?.id ?? "other_expenses",
			matchedBy: "fallback_category" as const,
		};
	}

	if (isMinimarketMerchant(merchant)) {
		return {
			category: categoryLabel("groceries", language),
			canonicalId: "groceries" as const,
			matchedBy: "merchant_fallback" as const,
		};
	}

	return {
		category: categoryLabel("other_expenses", language),
		canonicalId: "other_expenses" as const,
		matchedBy: "default" as const,
	};
}
