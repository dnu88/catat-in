import { getCategoryVisualMeta } from "./category-visuals";

describe("category visuals", () => {
	it("matches the Reports icon vocabulary for transaction rows", () => {
		expect(getCategoryVisualMeta("Makan & Minum", "light")).toMatchObject({
			icon: "food",
			tone: "success",
		});
		expect(getCategoryVisualMeta("Groceries", "light")).toMatchObject({
			icon: "groceries",
			tone: "warning",
		});
		expect(getCategoryVisualMeta("Transportasi", "dark")).toMatchObject({
			icon: "transport",
			tone: "navy",
		});
		expect(getCategoryVisualMeta("Tagihan", "dark")).toMatchObject({
			icon: "bills",
			tone: "danger",
		});
	});
});
