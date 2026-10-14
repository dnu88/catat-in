import { formatCompactCurrency } from "./currency";

describe("formatCompactCurrency", () => {
	it("formats Indonesian units (rb/jt/M/T)", () => {
		expect(formatCompactCurrency(125000, "id")).toBe("Rp 125 rb");
		expect(formatCompactCurrency(1_500_000, "id")).toBe("Rp 1,5 jt");
		expect(formatCompactCurrency(1_000_000_000, "id")).toBe("Rp 1 M");
		expect(formatCompactCurrency(1_000_000_000_000, "id")).toBe("Rp 1 T");
	});

	it("formats English units (K/M/B/T)", () => {
		expect(formatCompactCurrency(125000, "en")).toBe("Rp 125 K");
		expect(formatCompactCurrency(1_500_000, "en")).toBe("Rp 1.5 M");
		expect(formatCompactCurrency(1_000_000_000, "en")).toBe("Rp 1 B");
		expect(formatCompactCurrency(1_000_000_000_000, "en")).toBe("Rp 1 T");
	});

	it("keeps the sign for negative amounts", () => {
		expect(formatCompactCurrency(-1_500_000, "id")).toBe("Rp -1,5 jt");
		expect(formatCompactCurrency(-2_000_000, "en")).toBe("Rp -2 M");
	});

	it("omits the Rp prefix when currency is false", () => {
		expect(formatCompactCurrency(10_000_000, "id", false)).toBe("10 jt");
		expect(formatCompactCurrency(10_000_000, "en", false)).toBe("10 M");
	});

	it("treats non-finite values as zero", () => {
		expect(formatCompactCurrency(NaN, "id")).toBe("Rp 0");
		expect(formatCompactCurrency(Infinity, "en")).toBe("Rp 0");
	});

	it("defaults to Indonesian when language is omitted", () => {
		expect(formatCompactCurrency(1_500_000)).toBe("Rp 1,5 jt");
	});
});
