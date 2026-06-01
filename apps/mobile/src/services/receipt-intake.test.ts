import {
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
});
