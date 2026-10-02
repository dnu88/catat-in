import { shouldAutoSaveEntry } from "./auto-save";
import type { DraftValidationContext, TransactionDraft } from "./draft";

function draft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return {
		key: "d1",
		source: "text",
		transactionType: "expense",
		amount: 35000,
		category: "Makan & Minum",
		description: "beli kopi",
		walletId: "w1",
		targetWalletId: null,
		date: "2026-10-02",
		merchant: null,
		confidence: 0.95,
		unresolvedFields: [],
		acknowledgedFields: [],
		receiptUrl: null,
		extraction: null,
		...overrides,
	};
}

const validation: DraftValidationContext = {
	wallets: [{ id: "w1", name: "Dompet Utama" }],
	categories: [{ name: "Makan & Minum" }, { name: "Gaji" }],
	canCreate: true,
};

function decide(drafts: TransactionDraft[], extras: Partial<Parameters<typeof shouldAutoSaveEntry>[0]> = {}) {
	return shouldAutoSaveEntry({ source: "text", drafts, validation, ...extras });
}

describe("shouldAutoSaveEntry", () => {
	it("saves a single clear text entry without asking", () => {
		expect(decide([draft()])).toEqual({ auto: true, reason: null });
	});

	it("accepts income", () => {
		expect(
			decide([draft({ transactionType: "income", category: "Gaji" })]),
		).toEqual({ auto: true, reason: null });
	});

	it("accepts confidence exactly at the threshold", () => {
		expect(decide([draft({ confidence: 0.85 })])).toEqual({
			auto: true,
			reason: null,
		});
	});

	it("asks when two transactions arrive in one sentence", () => {
		expect(decide([draft(), draft({ key: "d2" })])).toEqual({
			auto: false,
			reason: "multi_transaction",
		});
	});

	it("asks when no draft could be built", () => {
		expect(decide([])).toEqual({ auto: false, reason: "no_drafts" });
	});

	it("never auto-saves a batch that came from a photo or receipt", () => {
		expect(decide([draft({ source: "image" })], { source: "image" })).toEqual({
			auto: false,
			reason: "source_not_text",
		});
	});

	it("never auto-saves a voice note batch", () => {
		expect(decide([draft({ source: "voice" })], { source: "voice" })).toEqual({
			auto: false,
			reason: "source_not_text",
		});
	});

	it("asks when the amount is zero", () => {
		expect(decide([draft({ amount: 0 })])).toEqual({
			auto: false,
			reason: "missing_amount",
		});
	});

	it("asks when the amount is missing", () => {
		expect(decide([draft({ amount: null })])).toEqual({
			auto: false,
			reason: "missing_amount",
		});
	});

	it("asks when confidence is below the threshold", () => {
		expect(decide([draft({ confidence: 0.8 })])).toEqual({
			auto: false,
			reason: "low_confidence",
		});
	});

	it("asks when confidence is unknown", () => {
		expect(decide([draft({ confidence: null })])).toEqual({
			auto: false,
			reason: "low_confidence",
		});
	});

	it("asks for the English generic category", () => {
		expect(decide([draft({ category: "Other" })])).toEqual({
			auto: false,
			reason: "generic_category",
		});
	});

	it("asks for the Indonesian generic category", () => {
		expect(decide([draft({ category: "Lainnya" })])).toEqual({
			auto: false,
			reason: "generic_category",
		});
	});

	it("asks for a transfer because it needs a target wallet", () => {
		expect(decide([draft({ transactionType: "transfer" })])).toEqual({
			auto: false,
			reason: "transfer_requires_target",
		});
	});

	it("asks when the extractor flagged the sentence as unclear", () => {
		expect(
			decide([draft()], { extractionUnclear: "Nominal tidak disebutkan" }),
		).toEqual({ auto: false, reason: "extractor_unsure" });
	});

	it("treats blank unclear text as no flag", () => {
		expect(decide([draft()], { extractionUnclear: "   " })).toEqual({
			auto: true,
			reason: null,
		});
	});

	it("asks when the extractor marked a field unresolved", () => {
		expect(decide([draft({ unresolvedFields: ["amount"] })])).toEqual({
			auto: false,
			reason: "unresolved_fields",
		});
	});

	it("asks when no wallet is attached", () => {
		expect(decide([draft({ walletId: null })])).toEqual({
			auto: false,
			reason: "invalid_draft",
		});
	});

	it("asks when the draft fails the review screen validation", () => {
		expect(decide([draft({ date: "" })])).toEqual({
			auto: false,
			reason: "invalid_draft",
		});
	});

	it("honours a caller-supplied confidence threshold", () => {
		expect(
			decide([draft({ confidence: 0.8 })], { minConfidence: 0.75 }),
		).toEqual({ auto: true, reason: null });
	});
});
