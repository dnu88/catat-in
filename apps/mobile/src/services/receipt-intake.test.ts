import {
	analyzeReceiptImage,
	getApiBaseUrl,
	receiptExtractionToDraft,
	uploadReceiptImage,
} from "./receipt-intake";

describe("receipt intake helpers", () => {
	it("defaults API base URL to the production API", () => {
		expect(getApiBaseUrl()).toBe("https://api.kaswise.com");
	});

	it("normalizes a readable receipt extraction into an expense draft", () => {
		expect(
			receiptExtractionToDraft({
				total_amount: 125000,
				merchant: "RM Sederhana",
				date: "2026-06-01",
				category: "Makan & Minum",
				confidence: 0.91,
			}),
		).toEqual({
			amount: 125000,
			transactionType: "expense",
			category: "Makan & Minum",
			description: "Struk RM Sederhana",
			merchant: "RM Sederhana",
			date: "2026-06-01",
			confidence: 0.91,
			reviewRequired: false,
		});
	});

	it("returns null when receipt extraction has no valid amount", () => {
		expect(receiptExtractionToDraft({ total_amount: null })).toBeNull();
	});

	it("rejects unsupported receipt upload MIME types before storage upload", async () => {
		const upload = jest.fn();
		const originalFetch = global.fetch;
		global.fetch = jest.fn(async () => ({
			ok: true,
			blob: async () => new Blob(["not an image"], { type: "text/plain" }),
		})) as unknown as typeof fetch;

		await expect(
			uploadReceiptImage(
				{ storage: { from: () => ({ upload }) } } as never,
				"user-1",
				{ uri: "file:///bad.txt", fileName: "bad.txt", mimeType: "text/plain" },
			),
		).rejects.toThrow(/Format struk/);
		expect(upload).not.toHaveBeenCalled();
		global.fetch = originalFetch;
	});
	it("sends receipt analysis as a typed multipart file and keeps backend details", async () => {
		const originalFetch = global.fetch;
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				blob: async () => new Blob(["image"], { type: "" }),
			})
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ detail: "Format file tidak didukung." }),
			}) as unknown as typeof fetch;

		await expect(
			analyzeReceiptImage(
				{ auth: { getSession: async () => ({ data: { session: { access_token: "token" } } }) } } as never,
				{ uri: "file:///receipt", fileName: "receipt.png", mimeType: "image/png" },
			),
		).rejects.toThrow("Format file tidak didukung.");

		const apiRequest = (global.fetch as jest.Mock).mock.calls[1][1];
		const file = (apiRequest.body as FormData).get("file") as File;
		expect(file.type).toBe("image/png");
		expect(file.name).toBe("receipt.png");
		global.fetch = originalFetch;
	});

});
