import { getCategoryVisualMeta, resolveCategoryVisual } from "./category-visuals";

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

	it("uses category color and icon before fallback visuals", () => {
		expect(
			resolveCategoryVisual({
				categoryName: "Food & Beverage",
				mode: "light",
				categories: [
					{
						id: "cat-food",
						name: "Food & Beverage",
						icon: "food",
						color: "#4A80F0",
						visual_locked_by_user: true,
					},
				],
			}),
		).toMatchObject({
			icon: "food",
			color: "#4A80F0",
		});
	});
});
