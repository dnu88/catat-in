import Constants from "expo-constants";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReceiptImageAsset = {
	uri: string;
	fileName?: string | null;
	mimeType?: string | null;
};

export type ReceiptExtraction = {
	total_amount?: number | null;
	merchant?: string | null;
	date?: string | null;
	category?: string | null;
	items?: unknown[];
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

export async function analyzeReceiptImage(
	supabase: SupabaseClient,
	asset: ReceiptImageAsset,
): Promise<ReceiptExtraction> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session?.access_token) {
		throw new Error("Sesi login tidak ditemukan.");
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

export function receiptExtractionToDraft(
	extraction: ReceiptExtraction,
): ReceiptTransactionDraft | null {
	const amount = Number(extraction.total_amount ?? 0);
	if (!Number.isFinite(amount) || amount <= 0) return null;

	const merchant = extraction.merchant?.trim() || undefined;
	const date = extraction.date?.trim() || new Date().toISOString().slice(0, 10);
	const category = extraction.category?.trim() || "Belanja";
	const confidence = Math.max(0, Math.min(1, Number(extraction.confidence ?? 0)));
	const description = merchant
		? `Struk ${merchant}`
		: "Transaksi dari struk";

	return {
		amount,
		transactionType: "expense",
		category,
		description,
		merchant,
		date,
		confidence,
		reviewRequired: confidence < 0.8,
	};
}
