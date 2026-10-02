import { createInitialEntryState, entryReducer } from "./state";
import type { ContextSnapshot, EntryAction } from "./state";
import type { TransactionDraft } from "./draft";

const context: ContextSnapshot = { id: "personal", label: "Pribadi", canCreate: true };

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

function reduce(actions: EntryAction[]) {
	return actions.reduce(
		(state, action) => entryReducer(state, action),
		createInitialEntryState(context),
	);
}

describe("entryReducer review-again", () => {
	it("returns an auto-saved entry to review with its drafts intact", () => {
		const saved = reduce([
			{ type: "processing-started" },
			{ type: "drafts-ready", generation: 1, source: "text", drafts: [draft()] },
			{ type: "save-started" },
			{ type: "save-succeeded", generation: 1, savedKeys: ["d1"] },
		]);
		const result = entryReducer(saved, { type: "review-again" });

		expect(result.phase).toBe("review");
		expect(result.drafts).toEqual([draft()]);
		expect(result.savedKeys).toEqual([]);
	});

	it("ignores the action outside the success phase", () => {
		const reviewing = reduce([
			{ type: "processing-started" },
			{ type: "drafts-ready", generation: 1, source: "text", drafts: [draft()] },
		]);
		expect(entryReducer(reviewing, { type: "review-again" })).toBe(reviewing);
	});
});
