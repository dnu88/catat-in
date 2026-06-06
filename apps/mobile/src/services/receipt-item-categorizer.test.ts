import { categorizeReceiptItem } from "./receipt-item-categorizer";

describe("receipt item categorizer", () => {
	it("categorizes minimarket receipt items by product name before merchant fallback", () => {
		expect(categorizeReceiptItem({ itemName: "AQUA 600ML", merchant: "Indomaret" })).toMatchObject({
			category: "Makan & Minum",
			canonicalId: "food_beverage",
			matchedBy: "item_keyword",
		});
		expect(categorizeReceiptItem({ itemName: "SABUN LIFEBUOY", merchant: "Indomaret" })).toMatchObject({
			category: "Rumah & Perawatan",
			canonicalId: "household_personal_care",
			matchedBy: "item_keyword",
		});
		expect(categorizeReceiptItem({ itemName: "OBH COMBI", merchant: "Indomaret" })).toMatchObject({
			category: "Kesehatan",
			canonicalId: "health",
		});
	});

	it("uses minimarket groceries only as fallback for unclear items", () => {
		expect(categorizeReceiptItem({ itemName: "ITEM PROMO", merchant: "Indomaret" })).toMatchObject({
			category: "Belanja Bulanan",
			canonicalId: "groceries",
			matchedBy: "merchant_fallback",
		});
	});
});
