import type { Category } from "./categories";
import type { TransactionType } from "./transactions";

export type ClassificationCategory = Pick<Category, "id" | "name" | "type">;

export type ClassifiedTransaction = {
	transactionType: TransactionType;
	amount: number;
	categoryId: string | null;
	categoryName: string;
	merchant: string | null;
	note: string;
	date: string;
	confidence: number;
	matchedKeywords: string[];
	matchedConcept: string;
};

type KeywordRule = string | { value: string; weight: number };

type CategoryConcept = {
	id: string;
	fallbackName: string;
	type: TransactionType;
	aliases: string[];
	keywords: KeywordRule[];
	merchants?: KeywordRule[];
};

const HIGH_CONFIDENCE = 0.85;

const categoryConcepts: CategoryConcept[] = [
	{
		id: "food_beverage",
		fallbackName: "Makanan & Minuman",
		type: "expense",
		aliases: [
			"food",
			"food beverage",
			"food and beverage",
			"makanan",
			"makanan minuman",
			"makan minum",
			"makan dan minum",
			"kuliner",
		],
		keywords: [
			{ value: "makan", weight: 3 },
			{ value: "minum", weight: 3 },
			{ value: "kopi", weight: 3 },
			{ value: "sarapan", weight: 3 },
			{ value: "makan siang", weight: 4 },
			{ value: "makan malam", weight: 4 },
			"warteg",
			"warung",
			"resto",
			"restaurant",
			"restoran",
			"cafe",
			"kafe",
			"gofood",
			"grabfood",
			"shopeefood",
			"nasi",
			"ayam",
			"bakso",
			"mie",
			"boba",
			"teh",
		],
		merchants: [
			{ value: "kopi kenangan", weight: 5 },
			{ value: "fore", weight: 5 },
			{ value: "starbucks", weight: 5 },
			{ value: "janji jiwa", weight: 5 },
			{ value: "mixue", weight: 5 },
			{ value: "mcd", weight: 5 },
			{ value: "kfc", weight: 5 },
		],
	},
	{
		id: "groceries",
		fallbackName: "Groceries",
		type: "expense",
		aliases: [
			"groceries",
			"grocery",
			"belanja",
			"belanja bulanan",
			"kebutuhan harian",
			"sembako",
		],
		keywords: [
			{ value: "belanja", weight: 3 },
			{ value: "belanja bulanan", weight: 5 },
			"grocery",
			"groceries",
			"supermarket",
			"minimarket",
			"pasar",
			"sayur",
			"buah",
			"beras",
			"telur",
			"susu",
			"sembako",
			"sabun",
			"detergen",
			"shampoo",
		],
		merchants: [
			{ value: "indomaret", weight: 5 },
			{ value: "alfamart", weight: 5 },
			{ value: "alfamidi", weight: 5 },
			{ value: "superindo", weight: 5 },
			{ value: "hypermart", weight: 5 },
			{ value: "ranch market", weight: 5 },
			{ value: "lotte mart", weight: 5 },
		],
	},
	{
		id: "transport",
		fallbackName: "Transportasi",
		type: "expense",
		aliases: ["transport", "transportasi", "transportation"],
		keywords: [
			"gojek",
			"grab",
			"taxi",
			"taksi",
			"bluebird",
			"ojek",
			"bensin",
			"pertamina",
			"shell",
			"parkir",
			"tol",
			"kereta",
			"mrt",
			"lrt",
			"bus",
		],
	},
	{
		id: "bills",
		fallbackName: "Tagihan",
		type: "expense",
		aliases: ["tagihan", "bills", "bill", "utilities"],
		keywords: [
			"listrik",
			"pln",
			"air",
			"pdam",
			"internet",
			"wifi",
			"pulsa",
			"paket data",
			"tagihan",
			"bpjs",
			"telkom",
			"indihome",
		],
	},
	{
		id: "health",
		fallbackName: "Kesehatan",
		type: "expense",
		aliases: ["kesehatan", "health", "medical"],
		keywords: ["obat", "dokter", "apotek", "vitamin", "klinik", "rumah sakit"],
	},
	{
		id: "entertainment",
		fallbackName: "Hiburan",
		type: "expense",
		aliases: ["hiburan", "entertainment", "recreation"],
		keywords: ["netflix", "spotify", "bioskop", "game", "steam", "hiburan"],
	},
	{
		id: "education",
		fallbackName: "Pendidikan",
		type: "expense",
		aliases: ["pendidikan", "education", "school"],
		keywords: ["buku", "kursus", "sekolah", "kuliah", "kelas", "udemy"],
	},
	{
		id: "salary",
		fallbackName: "Gaji",
		type: "income",
		aliases: ["gaji", "salary", "income", "pendapatan"],
		keywords: ["gaji", "salary", "pemasukan", "income", "terima", "masuk"],
	},
	{
		id: "bonus",
		fallbackName: "Bonus",
		type: "income",
		aliases: ["bonus"],
		keywords: ["bonus", "thr"],
	},
	{
		id: "freelance",
		fallbackName: "Freelance",
		type: "income",
		aliases: ["freelance", "proyek", "project"],
		keywords: ["freelance", "proyek", "project", "klien", "client"],
	},
];

function todayKey(date = new Date()) {
	return date.toISOString().slice(0, 10);
}

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

function normalizeNumber(rawValue: string) {
	const normalized = rawValue.replace(/\s/g, "");
	if (normalized.includes(",") && !normalized.includes(".")) {
		return Number(normalized.replace(",", "."));
	}
	return Number(normalized.replace(/[.,]/g, ""));
}

export function parseAmountFromTransactionText(value: string) {
	const unitMatch = value.match(
		/(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(juta|jt|ribu|rb|k)\b/i,
	);
	if (unitMatch) {
		const amount = Number(unitMatch[1].replace(",", "."));
		const unit = unitMatch[2].toLowerCase();
		if (unit === "juta" || unit === "jt") return Math.round(amount * 1_000_000);
		return Math.round(amount * 1_000);
	}

	const rupiahMatch = value.match(/rp\s*([\d.,]+)/i);
	if (rupiahMatch) return normalizeNumber(rupiahMatch[1]);

	const plainMatch = value.match(/\b(\d[\d.]{3,}|\d{4,})\b/);
	return plainMatch ? normalizeNumber(plainMatch[1]) : 0;
}

function hasPhrase(source: string, phrase: string) {
	const normalizedPhrase = normalize(phrase);
	if (!normalizedPhrase) return false;
	return new RegExp(`(^|\\s)${escapeRegExp(normalizedPhrase)}($|\\s)`).test(
		source,
	);
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ruleParts(rule: KeywordRule) {
	return typeof rule === "string"
		? { value: rule, weight: 2 }
		: { value: rule.value, weight: rule.weight };
}

function scoreConcept(source: string, concept: CategoryConcept) {
	let score = 0;
	const matchedKeywords = new Set<string>();
	const matchedMerchants = new Set<string>();

	for (const rule of concept.keywords) {
		const { value, weight } = ruleParts(rule);
		if (hasPhrase(source, value)) {
			score += weight;
			matchedKeywords.add(value);
		}
	}

	for (const rule of concept.merchants ?? []) {
		const { value, weight } = ruleParts(rule);
		if (hasPhrase(source, value)) {
			score += weight;
			matchedKeywords.add(value);
			matchedMerchants.add(value);
		}
	}

	return {
		score,
		matchedKeywords: Array.from(matchedKeywords),
		matchedMerchants: Array.from(matchedMerchants),
	};
}

function inferTransactionType(source: string): TransactionType {
	return /\b(gaji|bonus|freelance|dibayar|bayaran|pemasukan|income|terima|masuk|thr)\b/i.test(
		source,
	)
		? "income"
		: "expense";
}

function inferMerchant(value: string, matchedMerchants: string[]) {
	const matchedMerchant = matchedMerchants
		.sort((a, b) => b.length - a.length)[0];
	if (matchedMerchant) return matchedMerchant;

	const match = value.match(/\b(?:di|ke|dari)\s+([a-z0-9&.' -]{2,48})/i);
	if (!match) return null;
	const merchant = match[1]
		.split(/\b(?:pakai|dengan|via|untuk|sebesar|tanggal|tgl|rp|harga)\b/i)[0]
		.trim()
		.replace(/[.,;:]+$/, "");
	return merchant || null;
}

function resolveCategory(
	concept: CategoryConcept | null,
	categories: ClassificationCategory[],
	transactionType: TransactionType,
) {
	const compatibleCategories = categories.filter(
		(category) => !category.type || category.type === transactionType,
	);

	if (concept) {
		const aliasSet = new Set([
			normalize(concept.fallbackName),
			...concept.aliases.map(normalize),
		]);
		const exact = compatibleCategories.find((category) =>
			aliasSet.has(normalize(category.name)),
		);
		if (exact) return { id: exact.id, name: exact.name };

		const partial = compatibleCategories.find((category) => {
			const categoryName = normalize(category.name);
			return Array.from(aliasSet).some(
				(alias) => alias && (categoryName.includes(alias) || alias.includes(categoryName)),
			);
		});
		if (partial) return { id: partial.id, name: partial.name };

		return { id: null, name: concept.fallbackName };
	}

	const fallback = compatibleCategories.find((category) =>
		["lainnya", "other", "other expenses", "uncategorized"].includes(
			normalize(category.name),
		),
	);
	return { id: fallback?.id ?? null, name: fallback?.name ?? "Lainnya" };
}

function confidenceFromScore(score: number, hasCategory: boolean) {
	if (!hasCategory) return 0.42;
	if (score >= 5) return 0.96;
	if (score >= 3) return 0.9;
	if (score >= 2) return 0.82;
	return 0.62;
}

export function classifyTransactionText(
	input: string,
	categories: ClassificationCategory[] = [],
	date = new Date(),
): ClassifiedTransaction | null {
	const note = input.trim();
	if (!note) return null;

	const amount = parseAmountFromTransactionText(note);
	if (!Number.isFinite(amount) || amount <= 0) return null;

	const transactionType = inferTransactionType(note);
	const source = normalize(note);
	const compatibleConcepts = categoryConcepts.filter(
		(concept) => concept.type === transactionType,
	);
	const scoredConcepts = compatibleConcepts
		.map((concept) => ({ concept, ...scoreConcept(source, concept) }))
		.sort((a, b) => b.score - a.score);
	const best = scoredConcepts[0];
	const matchedConcept = best?.score > 0 ? best.concept : null;
	const matchedKeywords = best?.score > 0 ? best.matchedKeywords : [];
	const matchedMerchants = best?.score > 0 ? best.matchedMerchants : [];
	const category = resolveCategory(matchedConcept, categories, transactionType);
	const confidence = confidenceFromScore(best?.score ?? 0, Boolean(matchedConcept));

	return {
		transactionType,
		amount,
		categoryId: category.id,
		categoryName: category.name,
		merchant: inferMerchant(note, matchedMerchants),
		note,
		date: todayKey(date),
		confidence,
		matchedKeywords,
		matchedConcept: matchedConcept?.id ?? "unknown",
	};
}

export { HIGH_CONFIDENCE as CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD };
