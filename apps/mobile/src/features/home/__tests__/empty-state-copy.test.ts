import { recentEmptyStateCopy } from "../empty-state-copy";

describe("recentEmptyStateCopy (finding #1)", () => {
	it("keeps the legacy copy when the redesign is off", () => {
		expect(recentEmptyStateCopy({ isEn: false, premium: false })).toBe(
			"Gunakan tombol + untuk mencatat transaksi pertama.",
		);
		expect(recentEmptyStateCopy({ isEn: true, premium: false })).toBe(
			"Use the + button to record the first one.",
		);
	});

	it("points at the premium CTA when the redesign is on", () => {
		const id = recentEmptyStateCopy({ isEn: false, premium: true });
		const en = recentEmptyStateCopy({ isEn: true, premium: true });

		expect(id).toContain("Catat transaksi");
		expect(id).not.toContain("tombol +");
		expect(en).toContain("Record a transaction");
		expect(en).not.toContain("+ button");
	});

	it("never returns an empty string", () => {
		for (const premium of [true, false]) {
			for (const isEn of [true, false]) {
				expect(recentEmptyStateCopy({ isEn, premium }).length).toBeGreaterThan(10);
			}
		}
	});
});
