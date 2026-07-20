import type { SupabaseClient } from "@supabase/supabase-js";

import { getApiBaseUrl, getReceiptAuthSession } from "./receipt-intake";

export type BankName = "bca" | "mandiri" | "bni" | "bri" | "gopay" | "ovo";

export const BANK_OPTIONS: Array<{ id: BankName; label: string }> = [
	{ id: "bca", label: "BCA" },
	{ id: "mandiri", label: "Mandiri" },
	{ id: "bni", label: "BNI" },
	{ id: "bri", label: "BRI" },
	{ id: "gopay", label: "GoPay" },
	{ id: "ovo", label: "OVO" },
];

export type ImportPreviewTransaction = {
	date: string;
	description: string;
	type: "income" | "expense";
	amount: number | string;
	category: string;
	hash: string;
	is_duplicate: boolean;
	row_number: number;
};

export type ImportRowError = {
	row: number;
	reason: string;
};

export type ImportPreviewResponse = {
	transactions: ImportPreviewTransaction[];
	duplicates: ImportPreviewTransaction[];
	errors: ImportRowError[];
	total_rows: number;
	imported: number;
	skipped_months: number;
	bank_name: string;
};

export type ConfirmImportResponse = {
	success: boolean;
	imported: number;
	skipped_duplicates: number;
	message: string;
};

export type ImportStatementFile = {
	blob: Blob;
	filename: string;
	mimeType?: string | null;
};

async function readImportErrorDetail(response: Response) {
	try {
		const payload = await response.json();
		const detail = (payload as { detail?: unknown }).detail;
		if (typeof detail === "string" && detail.trim()) return detail.trim();
		if (detail && typeof detail === "object") {
			const typed = detail as { reason?: unknown };
			if (typed.reason === "premium_only") return "Fitur ini hanya tersedia untuk pengguna Premium.";
			if (typed.reason === "quota_exhausted") return "Kuota bulan ini sudah habis. Upgrade Premium untuk melanjutkan.";
			if (typed.reason === "fair_use") return "Batas pemakaian wajar bulan ini sudah tercapai.";
		}
	} catch {}
	return null;
}

function appendImportFile(formData: FormData, file: ImportStatementFile) {
	const mimeType = file.mimeType?.trim() || "text/csv";
	const typedBlob = file.blob.type === mimeType
		? file.blob
		: typeof file.blob.slice === "function"
			? file.blob.slice(0, file.blob.size, mimeType)
			: new Blob([file.blob], { type: mimeType });
	const FileCtor = (globalThis as { File?: typeof File }).File;
	if (typeof FileCtor === "function") {
		formData.append("file", new FileCtor([typedBlob], file.filename, { type: mimeType }));
		return;
	}
	formData.append("file", typedBlob, file.filename);
}

async function requireImportSession(supabase: SupabaseClient) {
	const session = await getReceiptAuthSession(supabase);
	if (!session?.access_token) {
		throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
	}
	return session;
}

export async function previewImportStatement(
	supabase: SupabaseClient,
	params: ImportStatementFile & { bankName: BankName },
): Promise<ImportPreviewResponse> {
	const session = await requireImportSession(supabase);
	const formData = new FormData();
	appendImportFile(formData, params);
	formData.append("bank_name", params.bankName);

	const response = await fetch(`${getApiBaseUrl()}/api/v1/imports/preview`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${session.access_token}`,
		},
		body: formData,
	});

	if (!response.ok) {
		const detail = await readImportErrorDetail(response);
		throw new Error(detail ?? "File rekening koran belum bisa diproses. Coba lagi.");
	}

	return response.json();
}

export async function confirmImportStatement(
	supabase: SupabaseClient,
	body: {
		wallet_id: string;
		transactions: ImportPreviewTransaction[];
		skip_duplicates?: boolean;
		context_type: "personal" | "household";
		household_id?: string | null;
	},
): Promise<ConfirmImportResponse> {
	const session = await requireImportSession(supabase);
	const response = await fetch(`${getApiBaseUrl()}/api/v1/imports/confirm`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${session.access_token}`,
		},
		body: JSON.stringify({
			wallet_id: body.wallet_id,
			transactions: body.transactions,
			skip_duplicates: body.skip_duplicates ?? true,
			context_type: body.context_type,
			household_id: body.context_type === "household" ? body.household_id : null,
		}),
	});

	if (!response.ok) {
		const detail = await readImportErrorDetail(response);
		throw new Error(detail ?? "Transaksi belum bisa diimpor. Coba lagi.");
	}

	return response.json();
}
