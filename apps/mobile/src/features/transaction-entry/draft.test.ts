import {
	acknowledgeField,
	allDraftsValid,
	canSaveDraft,
	createDraft,
	isDraftValid,
	isValidLocalIsoDate,
	isValidRupiahAmount,
	localToday,
	summariseDrafts,
	unacknowledgedWarnings,
	validateDraft,
	validateDrafts,
	type DraftValidationContext,
	type TransactionDraft,
} from "./draft";

const wallets = [
	{ id: "w1", name: "Seabank" },
	{ id: "w2", name: "Dompet Keluarga" },
	{ id: "w3", name: "Dompet Lama", is_active: false },
];

const categories = [
	{ name: "Makan & Minum" },
	{ name: "Transportasi" },
];

const ctx: DraftValidationContext = {
	wallets,
	categories,
	canCreate: true,
};

function draft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return createDraft(
		{
			source: "text",
			transactionType: "expense",
			amount: 35000,
			category: "Makan & Minum",
			walletId: "w1",
			...overrides,
		},
		new Date(2026, 9, 2, 10, 0, 0),
	);
}

describe("local dates", () => {
	test("localToday uses local calendar fields, not UTC", () => {
		// Late-evening local time would roll to the next UTC day for some zones;
		// local components must win so "Hari ini" never shifts.
		expect(localToday(new Date(2026, 5, 15, 23, 0, 0))).toBe("2026-06-15");
		expect(localToday(new Date(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01");
	});

	test("isValidLocalIsoDate accepts real dates and rejects the rest", () => {
		expect(isValidLocalIsoDate("2026-02-28")).toBe(true);
		expect(isValidLocalIsoDate("2024-02-29")).toBe(true);
		expect(isValidLocalIsoDate("2026-02-29")).toBe(false);
		expect(isValidLocalIsoDate("2026-02-30")).toBe(false);
		expect(isValidLocalIsoDate("2026-13-01")).toBe(false);
		expect(isValidLocalIsoDate("2026-1-1")).toBe(false);
		expect(isValidLocalIsoDate("abc")).toBe(false);
		expect(isValidLocalIsoDate("")).toBe(false);
		expect(isValidLocalIsoDate(null)).toBe(false);
		expect(isValidLocalIsoDate(20260101)).toBe(false);
	});
});

describe("rupiah amounts", () => {
	test("whole positive numbers only", () => {
		expect(isValidRupiahAmount(35000)).toBe(true);
		expect(isValidRupiahAmount(1)).toBe(true);
		expect(isValidRupiahAmount(0)).toBe(false);
		expect(isValidRupiahAmount(-1)).toBe(false);
		expect(isValidRupiahAmount(3.5)).toBe(false);
		expect(isValidRupiahAmount(Number.NaN)).toBe(false);
		expect(isValidRupiahAmount(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isValidRupiahAmount("35000")).toBe(false);
		expect(isValidRupiahAmount(null)).toBe(false);
	});
});

describe("validateDraft", () => {
	test("accepts a complete expense draft", () => {
		expect(validateDraft(draft(), ctx)).toEqual({});
		expect(isDraftValid(draft(), ctx)).toBe(true);
	});

	test("requires a positive whole amount", () => {
		expect(validateDraft(draft({ amount: null }), ctx).amount).toBe("INVALID_AMOUNT");
		expect(validateDraft(draft({ amount: 0 }), ctx).amount).toBe("INVALID_AMOUNT");
		expect(validateDraft(draft({ amount: 1000.5 }), ctx).amount).toBe("INVALID_AMOUNT");
	});

	test("requires a real local date", () => {
		expect(validateDraft(draft({ date: "2026-02-30" }), ctx).date).toBe("INVALID_DATE");
		expect(validateDraft(draft({ date: "" }), ctx).date).toBe("INVALID_DATE");
	});

	test("blocks viewers without write access", () => {
		const errors = validateDraft(draft(), { ...ctx, canCreate: false });
		expect(errors.permission).toBe("Akses lihat saja");
	});

	test("does not silently accept a missing wallet in the interactive flow", () => {
		const errors = validateDraft(draft({ walletId: null }), ctx);
		expect(errors.walletId).toBe("MISSING_WALLET");
	});

	test("allows a missing wallet only when the caller opts into legacy behaviour", () => {
		const errors = validateDraft(draft({ walletId: null }), {
			...ctx,
			allowMissingWallet: true,
		});
		expect(errors.walletId).toBeUndefined();
	});

	test("rejects a wallet from another context or an inactive wallet", () => {
		expect(validateDraft(draft({ walletId: "foreign" }), ctx).walletId).toBe(
			"WALLET_NOT_IN_CONTEXT",
		);
		expect(validateDraft(draft({ walletId: "w3" }), ctx).walletId).toBe(
			"WALLET_NOT_IN_CONTEXT",
		);
	});

	test("requires a known category for expense and income", () => {
		expect(validateDraft(draft({ category: "" }), ctx).category).toBe("MISSING_CATEGORY");
		expect(validateDraft(draft({ category: "Kategori Ngawur" }), ctx).category).toBe(
			"UNKNOWN_CATEGORY",
		);
	});

	// Production shape: the draft carries the label in the active language
	// (e.g. "Makan & Minum") while the stored category row is English
	// ("Food & Beverage"). A literal match rejected every localised draft and
	// silently disabled auto-save for Indonesian users.
	test("accepts a localised label for a category stored under its English name", () => {
		const stored: DraftValidationContext = {
			...ctx,
			categories: [{ name: "Food & Beverage" }, { name: "Transport" }],
		};

		expect(validateDraft(draft({ category: "Makan & Minum" }), stored)).toEqual({});
		expect(validateDraft(draft({ category: "Transportasi" }), stored)).toEqual({});
		expect(validateDraft(draft({ category: "food & beverage" }), stored)).toEqual(
			{},
		);
		expect(validateDraft(draft({ category: "Kategori Ngawur" }), stored).category).toBe(
			"UNKNOWN_CATEGORY",
		);
	});

	test("allows any category when the context has no category options yet", () => {
		expect(
			validateDraft(draft({ category: "Kategori Baru" }), { ...ctx, categories: [] }),
		).toEqual({});
	});

	test("transfer validates both wallets and ignores category", () => {
		const base = draft({
			transactionType: "transfer",
			walletId: "w1",
			targetWalletId: "w2",
			category: "",
		});
		expect(validateDraft(base, ctx)).toEqual({});

		expect(validateDraft({ ...base, targetWalletId: null }, ctx).targetWalletId).toBe(
			"MISSING_TARGET_WALLET",
		);
		expect(validateDraft({ ...base, targetWalletId: "w1" }, ctx).targetWalletId).toBe(
			"SAME_WALLET",
		);
		expect(validateDraft({ ...base, targetWalletId: "foreign" }, ctx).targetWalletId).toBe(
			"MISSING_TARGET_WALLET",
		);
	});
});

describe("review acknowledgement", () => {
	test("unresolved extraction warnings block saving until accepted", () => {
		const doubtful = draft({ unresolvedFields: ["amount", "category"] });

		expect(unacknowledgedWarnings(doubtful)).toEqual(["amount", "category"]);
		expect(canSaveDraft(doubtful, ctx)).toBe(false);

		const partial = acknowledgeField(doubtful, "amount");
		expect(unacknowledgedWarnings(partial)).toEqual(["category"]);
		expect(canSaveDraft(partial, ctx)).toBe(false);

		const accepted = acknowledgeField(partial, "category");
		expect(unacknowledgedWarnings(accepted)).toEqual([]);
		expect(canSaveDraft(accepted, ctx)).toBe(true);
	});

	test("acknowledging the same field twice is idempotent", () => {
		const once = acknowledgeField(draft({ unresolvedFields: ["amount"] }), "amount");
		const twice = acknowledgeField(once, "amount");
		expect(twice.acknowledgedFields).toEqual(["amount"]);
	});

	test("a valid draft with no warnings saves without acknowledgement", () => {
		expect(canSaveDraft(draft(), ctx)).toBe(true);
	});
});

describe("batch helpers", () => {
	test("summariseDrafts counts drafts and totals valid amounts", () => {
		const summary = summariseDrafts([
			draft({ amount: 35000 }),
			draft({ amount: 12500 }),
			draft({ amount: null }),
		]);
		expect(summary).toEqual({ count: 3, total: 47500 });
	});

	test("validateDrafts maps errors per draft and allDraftsValid gates the batch", () => {
		const good = draft();
		const bad = draft({ amount: null });

		expect(validateDrafts([good, bad], ctx)).toEqual([{}, { amount: "INVALID_AMOUNT" }]);
		expect(allDraftsValid([good], ctx)).toBe(true);
		expect(allDraftsValid([good, bad], ctx)).toBe(false);
		expect(allDraftsValid([], ctx)).toBe(false);
	});
});
