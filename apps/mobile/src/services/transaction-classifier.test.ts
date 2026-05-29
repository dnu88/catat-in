import {
	classifyTransactionText,
	parseAmountFromTransactionText,
} from "./transaction-classifier";

const categories = [
	{ id: "cat-food", name: "Food & Beverage", type: "expense" as const },
	{ id: "cat-groceries", name: "Groceries", type: "expense" as const },
	{ id: "cat-transport", name: "Transport", type: "expense" as const },
	{ id: "cat-bills", name: "Bills", type: "expense" as const },
	{ id: "cat-other", name: "Other expenses", type: "expense" as const },
	{ id: "cat-salary", name: "Salary", type: "income" as const },
];

const fixedDate = new Date("2026-05-29T08:00:00Z");

describe("transaction text classifier", () => {
	it("parses common rupiah amounts", () => {
		expect(parseAmountFromTransactionText("kopi 35rb")).toBe(35000);
		expect(parseAmountFromTransactionText("gaji Rp1.500.000")).toBe(1500000);
		expect(parseAmountFromTransactionText("bonus 1,5jt")).toBe(1500000);
	});

	it("classifies makan/minum keywords as Food & Beverage", () => {
		const result = classifyTransactionText(
			"makan siang di warteg 25rb",
			categories,
			fixedDate,
		);

		expect(result).toMatchObject({
			amount: 25000,
			categoryId: "cat-food",
			categoryName: "Food & Beverage",
			transactionType: "expense",
			date: "2026-05-29",
		});
		expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
		expect(result?.matchedKeywords).toEqual(
			expect.arrayContaining(["makan", "makan siang", "warteg"]),
		);
	});

	it("classifies belanja and minimarket merchants as Groceries", () => {
		const result = classifyTransactionText(
			"belanja bulanan di indomaret 150rb",
			categories,
			fixedDate,
		);

		expect(result).toMatchObject({
			amount: 150000,
			categoryId: "cat-groceries",
			categoryName: "Groceries",
			merchant: "indomaret",
		});
		expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
	});

	it("classifies transport and bills keywords", () => {
		expect(
			classifyTransactionText("naik gojek 18rb", categories, fixedDate)
				?.categoryName,
		).toBe("Transport");
		expect(
			classifyTransactionText("bayar listrik pln 300rb", categories, fixedDate)
				?.categoryName,
		).toBe("Bills");
	});

	it("uses official Indonesian category names when that is what exists in DB", () => {
		const result = classifyTransactionText(
			"beli kopi 35rb",
			[{ id: "cat-makan", name: "Makanan & Minuman", type: "expense" }],
			fixedDate,
		);

		expect(result?.categoryId).toBe("cat-makan");
		expect(result?.categoryName).toBe("Makanan & Minuman");
	});

	it("falls back to Other expenses with low confidence when unclear", () => {
		const result = classifyTransactionText("bayar sesuatu 50000", categories, fixedDate);

		expect(result?.categoryName).toBe("Other expenses");
		expect(result?.confidence).toBeLessThan(0.85);
	});
});
