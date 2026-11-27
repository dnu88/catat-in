import {
	applyMerchantRulesToDrafts,
	type MerchantRule,
} from "./merchant-rules";

const rules: MerchantRule[] = [
	{
		id: "rule-1",
		merchant_norm: "indomaret",
		category_name: "Groceries",
		category_id: "cat-groceries",
		source: "user_correction",
		hits: 3,
	},
];

describe("applyMerchantRulesToDrafts", () => {
	it("override kategori draf saat merchant match dan kategori berbeda", () => {
		const drafts = [
			{ merchant: "Indomaret", categoryName: "Other expenses", suggestedCategory: "Belanja Pribadi" as string | null },
		];
		const applied = applyMerchantRulesToDrafts(drafts, rules);

		expect(applied).toBe(1);
		expect(drafts[0].categoryName).toBe("Groceries");
		// Aturan menang — saran AI untuk merchant yang sama dibersihkan.
		expect(drafts[0].suggestedCategory).toBeNull();
	});

	it("tidak mengubah apa pun saat kategori sudah ekuivalen (id vs en)", () => {
		const drafts = [
			{ merchant: "indomaret", categoryName: "Belanja Bulanan" },
		];
		const applied = applyMerchantRulesToDrafts(drafts, rules);

		expect(applied).toBe(0);
		expect(drafts[0].categoryName).toBe("Belanja Bulanan");
	});

	it("draf tanpa merchant atau merchant tak dikenal dibiarkan", () => {
		const drafts = [
			{ merchant: null, categoryName: "Other expenses" },
			{ merchant: "kopken", categoryName: "Food & Beverage" },
		];
		expect(applyMerchantRulesToDrafts(drafts, rules)).toBe(0);
		expect(drafts[0].categoryName).toBe("Other expenses");
		expect(drafts[1].categoryName).toBe("Food & Beverage");
	});

	it("draf gaya draft contract (field `category`) ikut dioverride", () => {
		const drafts = [
			{ merchant: "indomaret", category: "Other expenses", suggestedCategory: null as string | null },
		];
		const applied = applyMerchantRulesToDrafts(drafts, rules);

		expect(applied).toBe(1);
		expect(drafts[0].category).toBe("Groceries");
	});
});
