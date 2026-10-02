import { createDraft, type TransactionDraft } from "./draft";
import {
	draftFingerprint,
	receiptDraftMode,
	receiptExtractionToItemDrafts,
	receiptExtractionToSummaryDraft,
	textDraftsToDrafts,
	voiceExtractionToDraft,
} from "./adapters";
import type { ReceiptExtraction } from "../../services/receipt-intake";
import type { ClassifiedTransaction } from "../../services/transaction-classifier";
import type { VoiceExtraction } from "../../services/voice-intake";

/** Local ISO date built from local components, so it never shifts by timezone. */
function localIso(date = new Date()): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function voiceExtraction(
	fields: Partial<VoiceExtraction["fields"]> = {},
	overrides: Partial<VoiceExtraction> = {},
): VoiceExtraction {
	return {
		status: "done",
		transcript: "gaji bulanan lima juta",
		confidence: 0.9,
		review_required: false,
		fields: {
			nominal: 50000,
			type: "income",
			kategori: "Gaji",
			merchant: null,
			tanggal: "2026-03-15",
			catatan: "Gaji bulanan",
			...fields,
		},
		...overrides,
	};
}

const receiptTotal: ReceiptExtraction = {
	total_amount: 50000,
	merchant: "Indomaret",
	date: "2026-03-15",
	category: "Belanja Bulanan",
	confidence: 0.9,
	readable: true,
	items: [
		{ name: "Kopi", qty: 2, price: 15000 },
		{ name: "Roti", price: 20000 },
	],
};

const classifiedIncome: ClassifiedTransaction = {
	transactionType: "income",
	amount: 5000000,
	categoryId: null,
	categoryName: "Gaji",
	merchant: null,
	note: "Gaji bulan Maret",
	date: "2026-03-15",
	confidence: 0.96,
	matchedKeywords: ["gaji"],
	matchedConcept: "salary",
};

function baseDraft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return createDraft({
		source: "text",
		transactionType: "expense",
		amount: 10000,
		category: "Makan & Minum",
		description: "Kopi",
		date: "2026-03-15",
		walletId: "w1",
		...overrides,
	});
}

describe("date resolution", () => {
	test("keeps a parseable extraction date without flagging it", () => {
		const iso = voiceExtractionToDraft(
			voiceExtraction({ tanggal: "2026-03-15" }),
			"w1",
		);
		expect(iso?.date).toBe("2026-03-15");

		const slash = voiceExtractionToDraft(
			voiceExtraction({ tanggal: "15/03/2026" }),
			"w1",
		);
		expect(slash?.date).toBe("2026-03-15");
		expect(iso?.unresolvedFields).not.toContain("date");
	});

	test("falls back to the local calendar date when the date is missing", () => {
		const draft = voiceExtractionToDraft(
			voiceExtraction({ tanggal: null }),
			"w1",
		);
		expect(draft?.date).toBe(localIso());
		expect(draft?.unresolvedFields).toContain("date");
	});

	test("falls back to the local calendar date when the date is unusable", () => {
		const draft = voiceExtractionToDraft(
			voiceExtraction({ tanggal: "bukan tanggal" }),
			"w1",
		);
		expect(draft?.date).toBe(localIso());
		expect(draft?.unresolvedFields).toContain("date");
	});

	test("relates 'hari ini' to the local date without flagging it", () => {
		const draft = voiceExtractionToDraft(
			voiceExtraction({ tanggal: "hari ini" }),
			"w1",
		);
		expect(draft?.date).toBe(localIso());
		expect(draft?.unresolvedFields).not.toContain("date");
	});
});

describe("unresolved fields", () => {
	test("marks amount when it is not a valid rupiah amount", () => {
		const missing = voiceExtractionToDraft(
			voiceExtraction({ nominal: null }),
			"w1",
		);
		expect(missing?.amount).toBeNull();
		expect(missing?.unresolvedFields).toContain("amount");

		const zero = voiceExtractionToDraft(
			voiceExtraction({ nominal: 0 }),
			"w1",
		);
		expect(zero?.unresolvedFields).toContain("amount");
	});

	test("marks category when confidence is below 0.8", () => {
		const draft = voiceExtractionToDraft(
			voiceExtraction({}, { confidence: 0.5 }),
			"w1",
		);
		expect(draft?.unresolvedFields).toContain("category");
		expect(draft?.unresolvedFields).not.toContain("amount");
		expect(draft?.unresolvedFields).not.toContain("wallet");
	});

	test("marks category when it resolved to the generic fallback", () => {
		const draft = voiceExtractionToDraft(
			voiceExtraction({ kategori: "Lainnya" }),
			"w1",
		);
		expect(draft?.category).toBe("Lainnya");
		expect(draft?.unresolvedFields).toContain("category");
	});

	test("marks wallet when walletId is null", () => {
		const withoutWallet = voiceExtractionToDraft(voiceExtraction(), null);
		expect(withoutWallet?.unresolvedFields).toContain("wallet");

		const withWallet = voiceExtractionToDraft(voiceExtraction(), "w1");
		expect(withWallet?.unresolvedFields).not.toContain("wallet");
	});

	test("a complete high-confidence extraction yields no unresolved fields", () => {
		const draft = voiceExtractionToDraft(voiceExtraction(), "w1");
		expect(draft?.unresolvedFields).toEqual([]);

		const summary = receiptExtractionToSummaryDraft(receiptTotal, "w1");
		expect(summary?.unresolvedFields).toEqual([]);
	});
});

describe("confidence metadata", () => {
	test("is carried from the extraction and never raised", () => {
		const low = voiceExtractionToDraft(
			voiceExtraction({}, { confidence: 0.42 }),
			"w1",
		);
		expect(low?.confidence).toBe(0.42);

		const high = voiceExtractionToDraft(
			voiceExtraction({}, { confidence: 0.99 }),
			"w1",
		);
		expect(high?.confidence).toBe(0.99);
	});
});

describe("text drafts", () => {
	test("mirrors the classifier result into drafts", () => {
		const [draft] = textDraftsToDrafts({
			classified: [classifiedIncome],
			fallbackInput: "gaji masuk",
		});
		expect(draft.source).toBe("text");
		expect(draft.transactionType).toBe("income");
		expect(draft.amount).toBe(5000000);
		expect(draft.category).toBe("Gaji");
		expect(draft.description).toBe("Gaji bulan Maret");
		expect(draft.date).toBe("2026-03-15");
		expect(draft.walletId).toBeNull();
		expect(draft.unresolvedFields).toEqual(["wallet"]);
	});

	test("uses fallbackInput for the description when the note is empty", () => {
		const [draft] = textDraftsToDrafts({
			classified: [{ ...classifiedIncome, note: "  " }],
			fallbackInput: "gaji masuk",
		});
		expect(draft.description).toBe("gaji masuk");
	});

	test("marks amount when the classifier amount is unusable", () => {
		const [draft] = textDraftsToDrafts({
			classified: [{ ...classifiedIncome, amount: 0 }],
			fallbackInput: "gaji masuk",
		});
		expect(draft.amount).toBeNull();
		expect(draft.unresolvedFields).toContain("amount");
	});

	test("marks category for a generic fallback category and low confidence", () => {
		const [draft] = textDraftsToDrafts({
			classified: [
				{ ...classifiedIncome, categoryName: "Lainnya", confidence: 0.42 },
			],
			fallbackInput: "gaji masuk",
		});
		expect(draft.unresolvedFields).toEqual(
			expect.arrayContaining(["category", "wallet"]),
		);
	});
});

describe("voice drafts", () => {
	test("keeps the income type from the extraction", () => {
		expect(
			voiceExtractionToDraft(voiceExtraction({ type: "income" }), "w1")
				?.transactionType,
		).toBe("income");
		expect(
			voiceExtractionToDraft(voiceExtraction({ type: "expense" }), "w1")
				?.transactionType,
		).toBe("expense");
		expect(
			voiceExtractionToDraft(voiceExtraction({ type: null }), "w1")
				?.transactionType,
		).toBe("expense");
	});

	test("uses the note, then the transcript, for the description", () => {
		expect(voiceExtractionToDraft(voiceExtraction(), "w1")?.description).toBe(
			"Gaji bulanan",
		);
		expect(
			voiceExtractionToDraft(voiceExtraction({ catatan: null }), "w1")
				?.description,
		).toBe("gaji bulanan lima juta");
	});

	test("returns null when the recording failed", () => {
		expect(
			voiceExtractionToDraft(voiceExtraction({}, { status: "error" }), "w1"),
		).toBeNull();
	});
});

describe("receipt drafts", () => {
	test("defaults to a single total draft that keeps the raw items", () => {
		expect(receiptDraftMode(receiptTotal)).toBe("total");

		const summary = receiptExtractionToSummaryDraft(receiptTotal, "w1");
		expect(summary).not.toBeNull();
		expect(summary?.source).toBe("image");
		expect(summary?.transactionType).toBe("expense");
		expect(summary?.amount).toBe(50000);
		expect(summary?.merchant).toBe("Indomaret");
		expect(summary?.date).toBe("2026-03-15");
		expect(summary?.extraction?.items).toHaveLength(2);
	});

	test("maps each item to its own draft with per-item amounts", () => {
		const items = receiptExtractionToItemDrafts(receiptTotal, "w1");
		expect(items).toHaveLength(2);
		expect(items.map((draft) => draft.amount)).toEqual([30000, 20000]);
		expect(items.map((draft) => draft.source)).toEqual(["image", "image"]);
		expect(items[0].extraction).toMatchObject({
			itemName: "Kopi",
			quantity: 2,
		});
		expect(items[1].extraction).toMatchObject({ itemName: "Roti" });
	});

	test("prefers item mode when only line items are usable", () => {
		const itemsOnly: ReceiptExtraction = {
			total_amount: null,
			merchant: "Kopi Kenangan",
			date: "2026-03-15",
			confidence: 0.9,
			items: [{ name: "Kopi", qty: 1, price: 15000 }],
		};
		expect(receiptDraftMode(itemsOnly)).toBe("items");
		expect(receiptExtractionToSummaryDraft(itemsOnly, "w1")).toBeNull();
		expect(receiptExtractionToItemDrafts(itemsOnly, "w1")).toHaveLength(1);
	});

	test("reports an unreadable receipt when nothing usable exists", () => {
		const unreadable: ReceiptExtraction = {
			total_amount: null,
			readable: false,
			items: [],
		};
		expect(receiptDraftMode(unreadable)).toBe("unreadable");
		expect(receiptExtractionToSummaryDraft(unreadable, "w1")).toBeNull();
		expect(receiptExtractionToItemDrafts(unreadable, "w1")).toEqual([]);
	});
});

describe("draft fingerprint", () => {
	test("is stable for identical payloads regardless of key", () => {
		const first = baseDraft({ key: "draft-a" });
		const second = baseDraft({ key: "draft-b" });
		expect(first.key).not.toBe(second.key);
		expect(draftFingerprint([first])).toBe(draftFingerprint([second]));
		expect(draftFingerprint([])).toBe("");
	});

	test("changes when any fingerprinted field changes", () => {
		const base = baseDraft();
		const fingerprint = draftFingerprint([base]);

		expect(draftFingerprint([baseDraft({ transactionType: "income" })])).not.toBe(
			fingerprint,
		);
		expect(draftFingerprint([baseDraft({ amount: 20000 })])).not.toBe(fingerprint);
		expect(draftFingerprint([baseDraft({ category: "Transportasi" })])).not.toBe(
			fingerprint,
		);
		expect(draftFingerprint([baseDraft({ date: "2026-03-16" })])).not.toBe(
			fingerprint,
		);
		expect(draftFingerprint([baseDraft({ walletId: "w2" })])).not.toBe(fingerprint);
		expect(draftFingerprint([baseDraft({ description: "Teh" })])).not.toBe(
			fingerprint,
		);
		expect(draftFingerprint([baseDraft({ merchant: "Toko" })])).not.toBe(
			fingerprint,
		);
		expect(draftFingerprint([baseDraft({ targetWalletId: "w3" })])).not.toBe(
			fingerprint,
		);
	});

	test("preserves draft order", () => {
		const first = baseDraft({ amount: 10000 });
		const second = baseDraft({ amount: 20000 });
		expect(draftFingerprint([first, second])).not.toBe(
			draftFingerprint([second, first]),
		);
	});
});
