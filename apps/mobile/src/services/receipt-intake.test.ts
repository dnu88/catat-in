import {
	analyzeReceiptImage,
	getApiBaseUrl,
	getReceiptAuthSession,
	receiptExtractionToDraft,
	receiptExtractionToDrafts,
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

	it("refreshes the auth session before receipt analysis when the cached session is empty", async () => {
		const refreshedSession = { access_token: "fresh-token" };
		const getSession = jest.fn(async () => ({ data: { session: null } }));
		const refreshSession = jest.fn(async () => ({ data: { session: refreshedSession } }));

		await expect(
			getReceiptAuthSession({ auth: { getSession, refreshSession } } as never),
		).resolves.toBe(refreshedSession);
		expect(refreshSession).toHaveBeenCalledTimes(1);
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


	it("creates one draft per receipt item and adjusts total to match receipt", () => {
		const drafts = receiptExtractionToDrafts({
			total_amount: "120.000" as never,
			merchant: "Supermarket A",
			date: "2026-06-01",
			category: "Belanja",
			confidence: 0.91,
			items: [
				{ name: "Susu", qty: 2, price: "25.000", category: "Belanja" },
				{ name: "Roti", qty: 1, price: "30,000", category: "Makan & Minum" },
				{ name: "Sabun", qty: 1, price: 39000, category: "Kebutuhan Rumah" },
			],
		});

		expect(drafts).toHaveLength(3);
		expect(drafts.map((draft) => draft.description)).toEqual(["Susu", "Roti", "Sabun"]);
		expect(drafts.map((draft) => draft.category)).toEqual([
			"Belanja",
			"Makan & Minum",
			"Kebutuhan Rumah",
		]);
		expect(drafts.reduce((sum, draft) => sum + draft.amount, 0)).toBe(120000);
		expect(drafts[0]).toMatchObject({ amount: 51000, quantity: 2 });
	});

});
