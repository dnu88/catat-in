import {
	classifyTransactionText,
	classifyTransactionTextBatch,
	parseAmountFromTransactionText,
} from "./transaction-classifier";

const categories = [
	{ id: "cat-food", name: "Food & Beverage", type: "expense" as const },
	{ id: "cat-groceries", name: "Groceries", type: "expense" as const },
	{ id: "cat-transport", name: "Transport", type: "expense" as const },
	{ id: "cat-bills", name: "Bills", type: "expense" as const },
	{ id: "cat-gifts", name: "Gifts & Donations", type: "expense" as const },
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


	it("classifies gift and donation phrases as Gifts & Donations", () => {
		expect(
			classifyTransactionText("kasih uang buat adik 100rb", categories, fixedDate),
		).toMatchObject({
			amount: 100000,
			categoryId: "cat-gifts",
			categoryName: "Gifts & Donations",
			transactionType: "expense",
		});

		expect(
			classifyTransactionText("gift ulang tahun teman 250rb", categories, fixedDate),
		).toMatchObject({
			categoryId: "cat-gifts",
			categoryName: "Gifts & Donations",
		});

		expect(
			classifyTransactionText("zakat dan sedekah 500rb", categories, fixedDate),
		).toMatchObject({
			categoryId: "cat-gifts",
			categoryName: "Gifts & Donations",
		});
	});

	it("recognizes broader default category keywords", () => {
		expect(
			classifyTransactionText("top up e toll 200rb", categories, fixedDate)
				?.categoryName,
		).toBe("Transport");
		expect(
			classifyTransactionText("token listrik 100rb", categories, fixedDate)
				?.categoryName,
		).toBe("Bills");
	});

	it("uses official Indonesian category names when that is what exists in DB", () => {
		const result = classifyTransactionText(
			"beli kopi latte 35rb",
			[{ id: "cat-makan", name: "Makanan & Minuman", type: "expense" }],
			fixedDate,
		);

		expect(result?.categoryId).toBe("cat-makan");
		expect(result?.categoryName).toBe("Makanan & Minuman");
	});


	it("recognizes pendapatan, gaji, and penghasilan as income", () => {
		expect(
			classifyTransactionText("pendapatan proyek 2jt", categories, fixedDate),
		).toMatchObject({
			transactionType: "income",
			amount: 2000000,
			categoryId: "cat-salary",
			categoryName: "Salary",
		});
		expect(
			classifyTransactionText("penghasilan bulan ini 4jt", categories, fixedDate)
				?.transactionType,
		).toBe("income");
	});

	it("keeps stock groceries separate from ready-to-consume F&B", () => {
		expect(
			classifyTransactionText(
				"beli kopi bubuk dan susu UHT di indomaret 85rb",
				categories,
				fixedDate,
			),
		).toMatchObject({
			categoryName: "Groceries",
			merchant: "indomaret",
		});

		expect(
			classifyTransactionText(
				"beli kopi latte siap minum di Kopi Kenangan 35rb",
				categories,
				fixedDate,
			),
		).toMatchObject({
			categoryName: "Food & Beverage",
			merchant: "kopi kenangan",
		});
	});

	it("splits mixed grocery and F&B notes when each amount is available", () => {
		const result = classifyTransactionTextBatch(
			"belanja beras 100rb dan kopi latte siap minum 35rb",
			categories,
			fixedDate,
		);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			amount: 100000,
			categoryName: "Groceries",
		});
		expect(result[1]).toMatchObject({
			amount: 35000,
			categoryName: "Food & Beverage",
		});
	});


	it("supports localized Indonesian category names for capture", () => {
		const localizedCategories = [
			{ id: "cat-food", name: "Makan & Minum", type: "expense" as const },
			{ id: "cat-groceries", name: "Belanja Bulanan", type: "expense" as const },
			{ id: "cat-shopping", name: "Belanja Pribadi", type: "expense" as const },
			{ id: "cat-other", name: "Lainnya", type: "expense" as const },
		];

		expect(
			classifyTransactionText("belanja beras dan sabun 120rb", localizedCategories, fixedDate),
		).toMatchObject({
			categoryId: "cat-groceries",
			categoryName: "Belanja Bulanan",
		});
		expect(
			classifyTransactionText("beli skincare di shopee 180rb", localizedCategories, fixedDate),
		).toMatchObject({
			categoryId: "cat-shopping",
			categoryName: "Belanja Pribadi",
		});
	});


	it("removes parsed amount from AI text description and infers merchant after di", () => {
		expect(
			classifyTransactionText("Makan malam di warteg 25rb", categories, fixedDate),
		).toMatchObject({
			amount: 25000,
			note: "Makan malam di warteg",
			merchant: "warteg",
			categoryName: "Food & Beverage",
		});

		expect(
			classifyTransactionText("belanja sabun di Alfamart 20rb", categories, fixedDate),
		).toMatchObject({
			amount: 20000,
			note: "belanja sabun di Alfamart",
			merchant: "alfamart",
		});

		expect(
			classifyTransactionText("ngopi di Warkop Teteh 18rb", categories, fixedDate),
		).toMatchObject({
			amount: 18000,
			note: "ngopi di Warkop Teteh",
			merchant: "Warkop Teteh",
		});
	});

	it("falls back to Other expenses with low confidence when unclear", () => {
		const result = classifyTransactionText("bayar sesuatu 50000", categories, fixedDate);

		expect(result?.categoryName).toBe("Other expenses");
		expect(result?.confidence).toBeLessThan(0.85);
	});
});
