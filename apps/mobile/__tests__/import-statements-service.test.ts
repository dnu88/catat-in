import {
	confirmImportStatement,
	previewImportStatement,
	type ImportPreviewTransaction,
} from "../src/services/import-statements";
import { getReceiptAuthSession } from "../src/services/receipt-intake";

jest.mock("../src/services/receipt-intake", () => ({
	getApiBaseUrl: () => "https://api.kaswise.test",
	getReceiptAuthSession: jest.fn(),
}));

const mockFetch = jest.fn();

describe("import statement service", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		(globalThis as any).fetch = mockFetch;
		jest.mocked(getReceiptAuthSession).mockReset();
		jest.mocked(getReceiptAuthSession).mockResolvedValue({ access_token: "token-1" } as any);
	});

	it("previews a bank statement with the current auth session", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: jest.fn(async () => ({
				transactions: [],
				duplicates: [],
				errors: [],
				total_rows: 0,
				imported: 0,
				skipped_months: 0,
				bank_name: "BCA",
			})),
		});

		const result = await previewImportStatement({} as any, {
			blob: new Blob(["Tanggal,Keterangan"], { type: "text/csv" }),
			filename: "bca.csv",
			mimeType: "text/csv",
			bankName: "bca",
		});

		expect(result.bank_name).toBe("BCA");
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.kaswise.test/api/v1/imports/preview",
			expect.objectContaining({
				method: "POST",
				headers: { Authorization: "Bearer token-1" },
				body: expect.any(FormData),
			}),
		);
	});

	it("confirms previewed transactions with finance context", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: jest.fn(async () => ({
				success: true,
				imported: 1,
				skipped_duplicates: 0,
				message: "Berhasil mengimpor 1 transaksi.",
			})),
		});
		const tx: ImportPreviewTransaction = {
			date: "2026-07-01",
			description: "Transfer Gaji",
			type: "income",
			amount: 1000000,
			category: "other",
			hash: "0123456789abcdef0123456789abcdef",
			is_duplicate: false,
			row_number: 1,
		};

		await confirmImportStatement({} as any, {
			wallet_id: "wallet-1",
			transactions: [tx],
			context_type: "household",
			household_id: "household-1",
		});

		const [, options] = mockFetch.mock.calls[0];
		expect(mockFetch.mock.calls[0][0]).toBe("https://api.kaswise.test/api/v1/imports/confirm");
		expect(options.headers).toEqual({
			"Content-Type": "application/json",
			Authorization: "Bearer token-1",
		});
		expect(JSON.parse(options.body)).toEqual({
			wallet_id: "wallet-1",
			transactions: [tx],
			skip_duplicates: true,
			context_type: "household",
			household_id: "household-1",
		});
	});

	it("throws friendly backend detail errors", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			json: jest.fn(async () => ({ detail: "Format file tidak sesuai untuk bank BCA." })),
		});

		await expect(
			previewImportStatement({} as any, {
				blob: new Blob(["bad"], { type: "text/csv" }),
				filename: "bad.csv",
				mimeType: "text/csv",
				bankName: "bca",
			}),
		).rejects.toThrow("Format file tidak sesuai untuk bank BCA.");
	});

	it("requires a login session", async () => {
		jest.mocked(getReceiptAuthSession).mockResolvedValue(null);

		await expect(
			confirmImportStatement({} as any, {
				wallet_id: "wallet-1",
				transactions: [],
				context_type: "personal",
			}),
		).rejects.toThrow("Sesi login tidak ditemukan");
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
