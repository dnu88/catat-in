import type { Category } from "./categories";
import type { TransactionType } from "./transactions";
import { getCategoryCanonicalId } from "./category-taxonomy";

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
		fallbackName: "Makan & Minum",
		type: "expense",
		aliases: [
			"food",
			"food beverage",
			"food and beverage",
			"fnb",
			"f&b",
			"makanan",
			"makanan minuman",
			"makan minum",
			"makan dan minum",
			"kuliner",
		],
		keywords: [
			{ value: "siap saji", weight: 6 },
			{ value: "siap santap", weight: 6 },
			{ value: "pesan antar", weight: 5 },
			{ value: "makan siang", weight: 5 },
			{ value: "makan malam", weight: 5 },
			{ value: "sarapan", weight: 4 },
			{ value: "makan", weight: 3 },
			{ value: "minum", weight: 3 },
			{ value: "kopi", weight: 3 },
			{ value: "kopi latte", weight: 6 },
			{ value: "latte", weight: 5 },
			{ value: "cappuccino", weight: 5 },
			{ value: "americano", weight: 5 },
			{ value: "espresso", weight: 5 },
			{ value: "boba", weight: 4 },
			{ value: "jajanan", weight: 4 },
			{ value: "nasi goreng", weight: 5 },
			{ value: "mie ayam", weight: 5 },
			{ value: "ayam geprek", weight: 5 },
			{ value: "bento", weight: 4 },
			"warteg",
			"warung makan",
			"resto",
			"restaurant",
			"restoran",
			"cafe",
			"kafe",
			"coffee shop",
			"gofood",
			"grabfood",
			"shopeefood",
			"bakso",
			"sate",
			"teh",
		],
		merchants: [
			{ value: "kopi kenangan", weight: 7 },
			{ value: "fore coffee", weight: 7 },
			{ value: "fore", weight: 6 },
			{ value: "starbucks", weight: 7 },
			{ value: "janji jiwa", weight: 7 },
			{ value: "mixue", weight: 7 },
			{ value: "mcd", weight: 7 },
			{ value: "kfc", weight: 7 },
			{ value: "gofood", weight: 7 },
			{ value: "grabfood", weight: 7 },
			{ value: "shopeefood", weight: 7 },
		],
	},
	{
		id: "groceries",
		fallbackName: "Belanja Bulanan",
		type: "expense",
		aliases: [
			"groceries",
			"grocery",
			"belanja bulanan",
			"kebutuhan harian",
			"kebutuhan rumah",
			"sembako",
		],
		keywords: [
			{ value: "belanja bulanan", weight: 6 },
			{ value: "kebutuhan rumah", weight: 5 },
			{ value: "bahan pokok", weight: 5 },
			{ value: "bahan mentah", weight: 5 },
			{ value: "stok rumah", weight: 5 },
			{ value: "kopi bubuk", weight: 6 },
			{ value: "kopi saset", weight: 6 },
			{ value: "kopi sachet", weight: 6 },
			{ value: "susu kotak", weight: 5 },
			{ value: "susu uht", weight: 5 },
			{ value: "mi instan", weight: 6 },
			{ value: "mie instan", weight: 6 },
			{ value: "aqua galon", weight: 6 },
			{ value: "gas lpg", weight: 6 },
			{ value: "minyak goreng", weight: 5 },
			{ value: "daging mentah", weight: 5 },
			{ value: "belanja", weight: 2 },
			"grocery",
			"groceries",
			"supermarket",
			"minimarket",
			"pasar",
			"kelontong",
			"beras",
			"minyak",
			"telur",
			"susu",
			"sembako",
			"sabun",
			"detergen",
			"deterjen",
			"tisu",
			"shampoo",
			"sampo",
			"sayur",
			"sayuran",
			"buah",
			"daging",
			"ayam mentah",
			"galon",
		],
		merchants: [
			{ value: "indomaret", weight: 5 },
			{ value: "alfamart", weight: 5 },
			{ value: "alfamidi", weight: 5 },
			{ value: "superindo", weight: 6 },
			{ value: "hypermart", weight: 6 },
			{ value: "ranch market", weight: 6 },
			{ value: "lotte mart", weight: 6 },
			{ value: "astro", weight: 6 },
			{ value: "sayurbox", weight: 6 },
		],
	},
	{
		id: "personal_shopping",
		fallbackName: "Belanja Pribadi",
		type: "expense",
		aliases: [
			"belanja pribadi",
			"personal shopping",
			"shopping",
			"belanja",
			"marketplace",
		],
		keywords: [
			{ value: "belanja pribadi", weight: 6 },
			{ value: "belanja online", weight: 5 },
			{ value: "beli baju", weight: 6 },
			{ value: "beli sepatu", weight: 6 },
			{ value: "skincare", weight: 5 },
			{ value: "case hp", weight: 5 },
			{ value: "charger", weight: 4 },
			"baju",
			"sepatu",
			"tas",
			"parfum",
			"kosmetik",
			"aksesoris",
			"fashion",
			"gadget",
			"marketplace",
		],
		merchants: [
			{ value: "shopee", weight: 5 },
			{ value: "tokopedia", weight: 5 },
			{ value: "lazada", weight: 5 },
			{ value: "zalora", weight: 6 },
		],
	},
	{
		id: "transport",
		fallbackName: "Transportasi",
		type: "expense",
		aliases: ["transport", "transportasi", "transportation"],
		keywords: [
			{ value: "isi bensin", weight: 5 },
			{ value: "beli bensin", weight: 5 },
			{ value: "naik gojek", weight: 5 },
			{ value: "naik grab", weight: 5 },
			{ value: "top up e toll", weight: 5 },
			"gojek",
			"go ride",
			"goride",
			"gocar",
			"grab",
			"grabcar",
			"grabbike",
			"maxim",
			"taxi",
			"taksi",
			"bluebird",
			"ojek",
			"ojol",
			"bensin",
			"bbm",
			"pertalite",
			"pertamax",
			"pertamina",
			"shell",
			"parkir",
			"tol",
			"e toll",
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
			{ value: "bayar tagihan", weight: 5 },
			{ value: "token listrik", weight: 5 },
			{ value: "paket internet", weight: 5 },
			{ value: "iuran bulanan", weight: 4 },
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
			"biznet",
			"first media",
			"myrepublic",
			"pascabayar",
			"langganan",
		],
	},
	{
		id: "credit_card",
		fallbackName: "Kartu Kredit",
		type: "expense",
		aliases: ["kartu kredit", "credit card", "cc", "tagihan kartu kredit"],
		keywords: [
			{ value: "bayar kartu kredit", weight: 6 },
			{ value: "tagihan kartu kredit", weight: 6 },
			{ value: "cicilan kartu kredit", weight: 5 },
			{ value: "bayar cicilan", weight: 3 },
			{ value: "biaya kartu", weight: 5 },
			{ value: "biaya tahunan", weight: 4 },
			{ value: "billing kartu", weight: 5 },
			"kartu kredit",
			"credit card",
			"cc",
			"kartu cicilan",
			"mandiri kartu",
			"bca kartu",
			"bni kartu",
			"cimb kartu",
			"maybank kartu",
			"danamon kartu",
		],
		merchants: [
			{ value: "bca card center", weight: 7 },
			{ value: "mandiri bill", weight: 6 },
			{ value: "bni card", weight: 7 },
		],
	},
	{
		id: "health",
		fallbackName: "Kesehatan",
		type: "expense",
		aliases: ["kesehatan", "health", "medical"],
		keywords: [
			{ value: "rumah sakit", weight: 5 },
			{ value: "dokter gigi", weight: 5 },
			{ value: "medical checkup", weight: 5 },
			"obat",
			"dokter",
			"apotek",
			"apotik",
			"vitamin",
			"klinik",
			"periksa",
			"kontrol",
			"laboratorium",
			"lab",
			"halodoc",
			"alodokter",
		],
	},
	{
		id: "entertainment",
		fallbackName: "Hiburan",
		type: "expense",
		aliases: ["hiburan", "entertainment", "recreation"],
		keywords: [
			{ value: "tiket konser", weight: 5 },
			{ value: "youtube premium", weight: 5 },
			"netflix",
			"spotify",
			"bioskop",
			"cinema",
			"cgv",
			"xxi",
			"game",
			"steam",
			"playstation",
			"nintendo",
			"hiburan",
			"rekreasi",
			"disney",
			"vidio",
		],
	},
	{
		id: "education",
		fallbackName: "Pendidikan",
		type: "expense",
		aliases: ["pendidikan", "education", "school"],
		keywords: [
			{ value: "uang sekolah", weight: 5 },
			{ value: "biaya kuliah", weight: 5 },
			{ value: "buku pelajaran", weight: 5 },
			"buku",
			"kursus",
			"sekolah",
			"kuliah",
			"kelas",
			"les",
			"bootcamp",
			"training",
			"workshop",
			"udemy",
			"coursera",
		],
	},
	{
		id: "sport",
		fallbackName: "Olahraga",
		type: "expense",
		aliases: ["olahraga", "sport", "sports", "gym", "fitness"],
		keywords: [
			{ value: "membership gym", weight: 5 },
			{ value: "sewa lapangan", weight: 5 },
			"olahraga",
			"gym",
			"fitness",
			"futsal",
			"badminton",
			"renang",
			"yoga",
			"pilates",
			"raket",
			"sepatu bola",
		],
	},
	{
		id: "gifts_donations",
		fallbackName: "Hadiah & Donasi",
		type: "expense",
		aliases: [
			"hadiah",
			"donasi",
			"gift",
			"gifts",
			"donation",
			"donations",
			"kado",
			"sedekah",
			"amal",
			"charity",
		],
		keywords: [
			{ value: "kasih uang", weight: 7 },
			{ value: "ngasih uang", weight: 7 },
			{ value: "beri uang", weight: 7 },
			{ value: "memberi uang", weight: 7 },
			{ value: "uang hadiah", weight: 6 },
			{ value: "hadiah ulang tahun", weight: 6 },
			{ value: "uang duka", weight: 6 },
			{ value: "uang nikah", weight: 6 },
			"hadiah",
			"donasi",
			"donation",
			"donations",
			"gift",
			"gifts",
			"kado",
			"sedekah",
			"amal",
			"charity",
			"bantuan",
			"sumbangan",
			"zakat",
			"infak",
			"infaq",
			"angpao",
			"amplop",
		],
	},
	{
		id: "salary",
		fallbackName: "Gaji",
		type: "income",
		aliases: ["gaji", "salary", "income", "pendapatan", "penghasilan"],
		keywords: [
			"gaji",
			"salary",
			"pemasukan",
			"income",
			"pendapatan",
			"penghasilan",
			"terima",
			"masuk",
		],
	},
	{
		id: "bonus",
		fallbackName: "Bonus",
		type: "income",
		aliases: ["bonus"],
		keywords: ["bonus", "thr", "insentif", "incentive", "komisi", "reward"],
	},
	{
		id: "freelance",
		fallbackName: "Freelance",
		type: "income",
		aliases: ["freelance", "proyek", "project"],
		keywords: [
			{ value: "bayaran proyek", weight: 6 },
			{ value: "pembayaran klien", weight: 6 },
			"freelance",
			"proyek",
			"project",
			"klien",
			"client",
			"fee",
			"honor",
			"honorarium",
		],
	},
];
function todayKey(date = new Date()) {
	return date.toISOString().slice(0, 10);
}

const MONTH_ALIASES: Record<string, number> = {
	januari: 1,
	jan: 1,
	februari: 2,
	feb: 2,
	maret: 3,
	mar: 3,
	april: 4,
	apr: 4,
	mei: 5,
	may: 5,
	juni: 6,
	jun: 6,
	juli: 7,
	jul: 7,
	agustus: 8,
	agu: 8,
	aug: 8,
	september: 9,
	sep: 9,
	oktober: 10,
	okt: 10,
	oct: 10,
	november: 11,
	nov: 11,
	desember: 12,
	des: 12,
	dec: 12,
};

function toIsoDate(year: number, month: number, day: number) {
	const date = new Date(year, month - 1, day);
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}
	return `${year.toString().padStart(4, "0")}-${month
		.toString()
		.padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseTwoDigitYear(value: string, fallbackYear: number) {
	if (value.length === 2) return 2000 + Number(value);
	if (value.length === 4) return Number(value);
	return fallbackYear;
}

function findDateMention(value: string, fallbackDate = new Date()) {
	const fallbackYear = fallbackDate.getFullYear();
	const monthNames = Object.keys(MONTH_ALIASES).join("|");
	const namedPattern = new RegExp(
		`\\b(?:tanggal|tgl|pada)?\\s*(\\d{1,2})\\s+(${monthNames})\\s*(\\d{2,4})?\\b`,
		"i",
	);
	const namedMatch = namedPattern.exec(value);
	if (namedMatch?.index != null) {
		const day = Number(namedMatch[1]);
		const month = MONTH_ALIASES[namedMatch[2].toLowerCase()];
		const year = namedMatch[3]
			? parseTwoDigitYear(namedMatch[3], fallbackYear)
			: fallbackYear;
		const iso = toIsoDate(year, month, day);
		if (iso) {
			return {
				iso,
				index: namedMatch.index,
				end: namedMatch.index + namedMatch[0].length,
			};
		}
	}

	const numericFullMatch = /\b(?:tanggal|tgl|pada)?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/i.exec(value);
	const numericShortMatch = /\b(?:tanggal|tgl|pada)\s*(\d{1,2})[/-](\d{1,2})\b/i.exec(value);
	const numericMatch = numericFullMatch ?? numericShortMatch;
	if (numericMatch?.index != null) {
		const day = Number(numericMatch[1]);
		const month = Number(numericMatch[2]);
		const year = numericMatch[3]
			? parseTwoDigitYear(numericMatch[3], fallbackYear)
			: fallbackYear;
		const iso = toIsoDate(year, month, day);
		if (iso) {
			return {
				iso,
				index: numericMatch.index,
				end: numericMatch.index + numericMatch[0].length,
			};
		}
	}

	return null;
}

function dateMentionSpans(value: string, fallbackDate = new Date()) {
	const spans: Array<{ index: number; end: number }> = [];
	let offset = 0;
	let remaining = value;
	while (remaining) {
		const mention = findDateMention(remaining, fallbackDate);
		if (!mention) break;
		spans.push({ index: offset + mention.index, end: offset + mention.end });
		offset += mention.end;
		remaining = remaining.slice(mention.end);
	}
	return spans;
}

function stripDateMention(value: string, fallbackDate = new Date()) {
	const mention = findDateMention(value, fallbackDate);
	if (!mention) return value;
	return `${value.slice(0, mention.index)} ${value.slice(mention.end)}`
		.replace(/\s+/g, " ")
		.replace(/\s+([.,;:])/g, "$1")
		.replace(/[\s,;:-]+$/g, "")
		.trim();
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

function findAmountMentions(value: string) {
	const pattern =
		/(?:rp\s*)?\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)\b|rp\s*[\d.,]+|\b\d[\d.]{3,}\b|\b\d{4,}\b/gi;
	const dateSpans = dateMentionSpans(value);
	return Array.from(value.matchAll(pattern))
		.map((match) => ({
			text: match[0],
			index: match.index ?? 0,
			end: (match.index ?? 0) + match[0].length,
		}))
		.filter((mention) => !dateSpans.some((span) => mention.index < span.end && mention.end > span.index));
}


function stripAmountMentions(value: string) {
	let next = value;
	for (const mention of findAmountMentions(value).sort((a, b) => b.index - a.index)) {
		next = `${next.slice(0, mention.index)} ${next.slice(mention.end)}`;
	}
	return next
		.replace(/\s+/g, " ")
		.replace(/\s+([.,;:])/g, "$1")
		.replace(/[\s,;:-]+$/g, "")
		.trim();
}

function segmentTextAroundAmounts(value: string) {
	const mentions = findAmountMentions(value);
	if (mentions.length < 2) return [];

	return mentions
		.map((mention, index) => {
			const start = index === 0 ? 0 : mentions[index - 1].end;
			const end = index === mentions.length - 1 ? value.length : mention.end;
			return value
				.slice(start, end)
				.replace(/^\s*(dan|lalu|terus|,|;|\+)\s*/i, "")
				.trim();
		})
		.filter(Boolean);
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
	return /\b(gaji|bonus|freelance|dibayar|bayaran|pemasukan|pendapatan|penghasilan|income|terima|masuk|thr)\b/i.test(
		source,
	)
		? "income"
		: "expense";
}

function inferMerchant(value: string, matchedMerchants: string[]) {
	const matchedMerchant = matchedMerchants
		.sort((a, b) => b.length - a.length)[0];
	if (matchedMerchant) return matchedMerchant;

	const match = value.match(/\b(?:di|ke|dari)\s+([a-z0-9&.' -]{2,64})/i);
	if (!match) return null;

	const amountMention = findAmountMentions(match[1])[0];
	const merchantSource = amountMention
		? match[1].slice(0, amountMention.index)
		: match[1];
	const merchant = merchantSource
		.split(/\b(?:pakai|dengan|via|untuk|sebesar|tanggal|tgl|rp|harga|bayar|dibayar)\b/i)[0]
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
		const conceptId = getCategoryCanonicalId(concept.fallbackName);
		const canonical = compatibleCategories.find(
			(category) => getCategoryCanonicalId(category.name) === conceptId,
		);
		if (canonical) return { id: canonical.id, name: canonical.name };

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

	const fallback = compatibleCategories.find(
		(category) => getCategoryCanonicalId(category.name) === "other_expenses",
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
	const rawNote = input.trim();
	if (!rawNote) return null;
	const note = stripAmountMentions(stripDateMention(rawNote, date)) || rawNote;

	const amount = parseAmountFromTransactionText(rawNote);
	if (!Number.isFinite(amount) || amount <= 0) return null;

	const transactionType = inferTransactionType(rawNote);
	const source = normalize(rawNote);
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
		merchant: inferMerchant(rawNote, matchedMerchants),
		note,
		date: findDateMention(rawNote, date)?.iso ?? todayKey(date),
		confidence,
		matchedKeywords,
		matchedConcept: matchedConcept?.id ?? "unknown",
	};
}

export function classifyTransactionTextBatch(
  input: string,
  categories: ClassificationCategory[] = [],
  date = new Date(),
): ClassifiedTransaction[] {
  const fullDraft = classifyTransactionText(input, categories, date);
  if (!fullDraft) return [];

  const segments = segmentTextAroundAmounts(input);
  if (segments.length < 2) return [fullDraft];

  const segmentDrafts = segments
    .map((segment) => classifyTransactionText(segment, categories, date))
    .filter((draft): draft is ClassifiedTransaction => Boolean(draft));

  // If we only got one valid segment, return the full draft as fallback
  if (segmentDrafts.length < 2) return [fullDraft];

  // Return multiple segments if they differ in category (not all same)
  const concepts = new Set(segmentDrafts.map((draft) => draft.matchedConcept));
  const hasVariety = concepts.size >= 2;

  return hasVariety ? segmentDrafts : [fullDraft];
}

export { HIGH_CONFIDENCE as CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD };
