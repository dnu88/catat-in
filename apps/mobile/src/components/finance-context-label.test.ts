import { financeContextLabel } from "./finance-context-label";

const id = "c6f2cc14-4d55-4397-8392-dcf88e8635f1";
const context = { type: "household", householdId: id, role: "owner" } as const;
it("resolves the matching membership name without using the household identity as display text", () => {
	expect(financeContextLabel(context, [{ household_id: "other", households: { name: "Wrong" } }, { household_id: id, households: { name: "Diendi Family" } }], "en")).toBe("Diendi Family");
});
it.each(["en", "id"] as const)("uses a safe localized fallback for missing/blank names (%s)", (language) => {
	for (const rows of [[], [{ household_id: id, households: { name: "   " } }]]) {
		expect(financeContextLabel(context, rows, language)).toBe(language === "en" ? "Family" : "Keluarga");
	}
});
it("keeps personal labels localized", () => {
	expect(financeContextLabel({ type: "personal" }, [], "id")).toBe("Pribadi");
	expect(financeContextLabel({ type: "personal" }, [], "en")).toBe("Personal");
});
