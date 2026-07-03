import Constants from "expo-constants";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { categorizeReceiptItem } from "./receipt-item-categorizer";

export type ReceiptImageAsset = {
	uri: string;
	fileName?: string | null;
	mimeType?: string | null;
};

export type ReceiptItemExtraction = {
	name?: string | null;
	qty?: number | string | null;
	quantity?: number | string | null;
	price?: number | string | null;
	unit_price?: number | string | null;
	total_price?: number | string | null;
	line_total?: number | string | null;
	category?: string | null;
};

export type ReceiptExtraction = {
	total_amount?: number | null;
	merchant?: string | null;
	date?: string | null;
	category?: string | null;
	items?: ReceiptItemExtraction[];
	confidence?: number | null;
	readable?: boolean;
};

export type ReceiptTransactionDraft = {
	amount: number;
	transactionType: "expense";
	category: string;
	description: string;
	merchant?: string;
	date: string;
	confidence: number;
	reviewRequired: boolean;
	itemName?: string;
	quantity?: number;
};

const processEnv = (
	globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const expoExtra = Constants.expoConfig?.extra as
	| Record<string, string | undefined>
	| undefined;

const MAX_RECEIPT_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
]);

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getReceiptAuthSession(
	supabase: SupabaseClient,
): Promise<Session | null> {
	const initial = await supabase.auth.getSession();
	if (initial.data.session?.access_token) return initial.data.session;

	const refreshed = await supabase.auth.refreshSession().catch(() => null);
	if (refreshed?.data.session?.access_token) return refreshed.data.session;

	await wait(350);
	const retried = await supabase.auth.getSession();
	return retried.data.session?.access_token ? retried.data.session : null;
}

function readConfigValue(...values: Array<string | undefined>) {
	return values.find((value) => value?.trim())?.trim();
}

export function getApiBaseUrl() {
	return (
		readConfigValue(
			processEnv?.EXPO_PUBLIC_API_URL,
			processEnv?.API_URL,
			expoExtra?.apiUrl,
			expoExtra?.EXPO_PUBLIC_API_URL,
		) ?? "https://api.kaswise.com"
	).replace(/\/$/, "");
}

function normalizeMimeType(mimeType?: string | null) {
	const normalized = mimeType?.trim().toLowerCase();
	if (normalized === "image/jpg") return "image/jpeg";
	return normalized || "image/jpeg";
}

const RECEIPT_MONTH_ALIASES: Record<string, number> = {
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
	oct: 10,
	november: 11,
	nov: 11,
	desember: 12,
	des: 12,
	dec: 12,
};

function formatLocalIsoDate(date: Date) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function safeIsoDate(year: number, month: number, day: number) {
	const candidate = new Date(year, month - 1, day);
	return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day
		? formatLocalIsoDate(candidate)
		: null;
}

function parseReceiptYear(value: string | undefined, fallbackYear: number) {
	if (!value) return fallbackYear;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallbackYear;
	return value.length === 2 ? 2000 + parsed : parsed;
}

export function normalizeReceiptDate(value: unknown, fallbackDate = new Date()) {
	const fallback = formatLocalIsoDate(fallbackDate);
	if (typeof value !== "string") return fallback;
	const text = value.trim().toLowerCase();
	if (!text) return fallback;
	if (text === "today" || text === "hari ini") return fallback;
	if (text === "yesterday" || text === "kemarin") {
		const yesterday = new Date(fallbackDate);
		yesterday.setDate(yesterday.getDate() - 1);
		return formatLocalIsoDate(yesterday);
	}

	const normalized = text.replace(/^(?:tanggal|tgl|pada)\s+/, "");
	const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (isoMatch) {
		return safeIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])) ?? fallback;
	}

	const slashIsoMatch = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
	if (slashIsoMatch) {
		return safeIsoDate(Number(slashIsoMatch[1]), Number(slashIsoMatch[2]), Number(slashIsoMatch[3])) ?? fallback;
	}

	const numericMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
	if (numericMatch) {
		return safeIsoDate(
			parseReceiptYear(numericMatch[3], fallbackDate.getFullYear()),
			Number(numericMatch[2]),
			Number(numericMatch[1]),
		) ?? fallback;
	}

	const monthNames = Object.keys(RECEIPT_MONTH_ALIASES).join("|");
	const namedDayFirst = normalized.match(
		new RegExp(`^(\d{1,2})\s+(${monthNames})(?:\s+(\d{2,4}))?$`, "i"),
	);
	if (namedDayFirst) {
		return safeIsoDate(
			parseReceiptYear(namedDayFirst[3], fallbackDate.getFullYear()),
			RECEIPT_MONTH_ALIASES[namedDayFirst[2].toLowerCase()],
			Number(namedDayFirst[1]),
		) ?? fallback;
	}

	const namedMonthFirst = normalized.match(
		new RegExp(`^(${monthNames})\s+(\d{1,2})(?:\s+(\d{2,4}))?$`, "i"),
	);
	if (namedMonthFirst) {
		return safeIsoDate(
			parseReceiptYear(namedMonthFirst[3], fallbackDate.getFullYear()),
			RECEIPT_MONTH_ALIASES[namedMonthFirst[1].toLowerCase()],
			Number(namedMonthFirst[2]),
		) ?? fallback;
	}

	return fallback;
}

function validateReceiptBlob(blob: Blob, mimeType: string) {
	if (!ALLOWED_RECEIPT_MIME_TYPES.has(mimeType)) {
		throw new Error("Format struk belum didukung. Gunakan JPG, PNG, atau WEBP.");
	}
	if (blob.size > MAX_RECEIPT_UPLOAD_BYTES) {
		throw new Error("Ukuran struk terlalu besar. Maksimal 10MB.");
	}
}

function extensionForMime(mimeType: string) {
	if (mimeType.includes("png")) return "png";
	if (mimeType.includes("webp")) return "webp";
	return "jpg";
}

function safeFileName(asset: ReceiptImageAsset, fallbackExtension: string) {
	const rawName = asset.fileName?.trim() || `receipt.${fallbackExtension}`;
	return rawName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
}

export async function blobFromAsset(asset: ReceiptImageAsset) {
	const response = await fetch(asset.uri);
	if (!response.ok) {
		throw new Error("Gagal membaca file struk.");
	}
	return response.blob();
}

function withReceiptMimeType(blob: Blob, mimeType: string) {
	if (blob.type === mimeType) return blob;
	if (typeof blob.slice === "function") {
		return blob.slice(0, blob.size, mimeType);
	}
	return new Blob([blob], { type: mimeType });
}

function appendReceiptFile(formData: FormData, blob: Blob, filename: string, mimeType: string) {
	const typedBlob = withReceiptMimeType(blob, mimeType);
	const FileCtor = (globalThis as { File?: typeof File }).File;
	if (typeof FileCtor === "function") {
		formData.append("file", new FileCtor([typedBlob], filename, { type: mimeType }));
		return;
	}
	formData.append("file", typedBlob, filename);
}

async function readErrorDetail(response: Response) {
	try {
		const payload = await response.json();
		const detail = (payload as { detail?: unknown }).detail;
		if (typeof detail === "string" && detail.trim()) return detail.trim();
		if (detail && typeof detail === "object") {
			const typed = detail as { reason?: unknown; feature?: unknown; limit?: unknown; used?: unknown };
			if (typed.reason === "premium_only") return "Fitur ini hanya tersedia untuk pengguna Premium.";
			if (typed.reason === "quota_exhausted") return "Kuota AI bulan ini sudah habis. Upgrade Premium untuk melanjutkan.";
			if (typed.reason === "fair_use") return "Batas pemakaian wajar AI bulan ini sudah tercapai.";
		}
	} catch {}
	return null;
}

export async function uploadReceiptImage(
	supabase: SupabaseClient,
	userId: string,
	asset: ReceiptImageAsset,
) {
	const blob = await blobFromAsset(asset);
	const mimeType = normalizeMimeType(asset.mimeType || blob.type);
	validateReceiptBlob(blob, mimeType);
	const extension = extensionForMime(mimeType);
	const objectPath = `${userId}/${Date.now()}-${safeFileName(asset, extension)}`;
	const { data, error } = await supabase.storage
		.from("receipts")
		.upload(objectPath, withReceiptMimeType(blob, mimeType), {
			contentType: mimeType,
			upsert: false,
		});

	if (error) throw error;
	return data.path;
}

export type TextAiExtraction = {
	transactions?: unknown[];
};

export async function analyzeTransactionText(
	supabase: SupabaseClient,
	text: string,
): Promise<TextAiExtraction> {
	const session = await getReceiptAuthSession(supabase);
	if (!session?.access_token) {
		throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
	}

	const response = await fetch(`${getApiBaseUrl()}/api/v1/ai/chat`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${session.access_token}`,
		},
		body: JSON.stringify({ text }),
	});

	if (!response.ok) {
		const detail = await readErrorDetail(response);
		throw new Error(detail ?? "Transaksi belum berhasil diproses. Coba lagi sebentar.");
	}

	return response.json();
}

export async function analyzeReceiptImage(
	supabase: SupabaseClient,
	asset: ReceiptImageAsset,
): Promise<ReceiptExtraction> {
	const session = await getReceiptAuthSession(supabase);
	if (!session?.access_token) {
		throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
	}

	const blob = await blobFromAsset(asset);
	const mimeType = normalizeMimeType(asset.mimeType || blob.type);
	validateReceiptBlob(blob, mimeType);
	const formData = new FormData();
	appendReceiptFile(
		formData,
		blob,
		safeFileName(asset, extensionForMime(mimeType)),
		mimeType,
	);

	const response = await fetch(`${getApiBaseUrl()}/api/v1/ai/receipt`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${session.access_token}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const detail = await readErrorDetail(response);
		throw new Error(detail ?? "Struk belum bisa diproses. Coba foto yang lebih jelas.");
	}

	return response.json();
}

function numericValue(value: unknown) {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value === "string") {
		const cleaned = value.replace(/[^\d.,-]/g, "");
		const lastComma = cleaned.lastIndexOf(",");
		const lastDot = cleaned.lastIndexOf(".");
		let normalized = cleaned;
		if (lastComma >= 0 && lastDot >= 0) {
			normalized = lastComma > lastDot
				? cleaned.replace(/\./g, "").replace(/,/g, ".")
				: cleaned.replace(/,/g, "");
		} else if (lastComma >= 0) {
			normalized = /,\d{3}$/.test(cleaned)
				? cleaned.replace(/,/g, "")
				: cleaned.replace(/,/g, ".");
		} else if (lastDot >= 0 && /\.\d{3}$/.test(cleaned)) {
			normalized = cleaned.replace(/\./g, "");
		}
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function itemLineAmount(item: ReceiptItemExtraction, useQuantityMultiplier: boolean) {
	const qty = Math.max(1, numericValue(item.qty ?? item.quantity) || 1);
	const explicitTotal = numericValue(item.total_price ?? item.line_total);
	if (explicitTotal > 0) return { amount: explicitTotal, qty };
	const price = numericValue(item.price ?? item.unit_price);
	return { amount: useQuantityMultiplier ? price * qty : price, qty };
}

function normalizeReceiptItems(extraction: ReceiptExtraction) {
	const items = (extraction.items ?? []).filter(
		(item) => item?.name?.trim() && numericValue(item.price ?? item.unit_price ?? item.total_price ?? item.line_total) > 0,
	);
	if (items.length === 0) return [];

	const targetTotal = numericValue(extraction.total_amount);
	const sumAsLineTotals = items.reduce(
		(sum, item) => sum + itemLineAmount(item, false).amount,
		0,
	);
	const sumAsUnitPrices = items.reduce(
		(sum, item) => sum + itemLineAmount(item, true).amount,
		0,
	);
	const useQuantityMultiplier =
		targetTotal > 0 && Math.abs(sumAsUnitPrices - targetTotal) < Math.abs(sumAsLineTotals - targetTotal);

	const normalized = items.map((item) => ({
		item,
		...itemLineAmount(item, useQuantityMultiplier),
	}));
	const sum = normalized.reduce((total, item) => total + item.amount, 0);
	const diff = targetTotal > 0 ? Math.round(targetTotal - sum) : 0;
	if (diff !== 0 && normalized.length > 0) {
		const largest = normalized.reduce(
			(bestIndex, item, index) => item.amount > normalized[bestIndex].amount ? index : bestIndex,
			0,
		);
		normalized[largest] = {
			...normalized[largest],
			amount: Math.max(0, normalized[largest].amount + diff),
		};
	}

	return normalized.filter((item) => item.amount > 0);
}

export function receiptExtractionToDrafts(
	extraction: ReceiptExtraction,
): ReceiptTransactionDraft[] {
	const targetTotal = numericValue(extraction.total_amount);
	const merchant = extraction.merchant?.trim() || undefined;
	const date = normalizeReceiptDate(extraction.date);
	const confidence = Math.max(0, Math.min(1, Number(extraction.confidence ?? 0)));
	const reviewRequired = confidence < 0.8;
	const normalizedItems = normalizeReceiptItems(extraction);

	if (normalizedItems.length > 0) {
		return normalizedItems.map(({ item, amount, qty }) => {
			const itemName = item.name?.trim() || "Item struk";
			const category = categorizeReceiptItem({
				itemName,
				itemCategory: item.category,
				merchant,
				fallbackCategory: extraction.category,
			}).category;
			return {
				amount,
				transactionType: "expense",
				category,
				description: itemName,
				merchant,
				date,
				confidence,
				reviewRequired,
				itemName,
				quantity: qty,
			};
		});
	}

	if (!Number.isFinite(targetTotal) || targetTotal <= 0) return [];
	return [
		{
			amount: targetTotal,
			transactionType: "expense",
			category: categorizeReceiptItem({
				itemName: merchant ? `Struk ${merchant}` : "Transaksi dari struk",
				merchant,
				fallbackCategory: extraction.category,
			}).category,
			description: merchant ? `Struk ${merchant}` : "Transaksi dari struk",
			merchant,
			date,
			confidence,
			reviewRequired,
		},
	];
}

export function receiptExtractionToDraft(
	extraction: ReceiptExtraction,
): ReceiptTransactionDraft | null {
	return receiptExtractionToDrafts(extraction)[0] ?? null;
}
