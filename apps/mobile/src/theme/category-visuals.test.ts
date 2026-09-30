import { getCategoryVisualMeta, resolveCategoryVisual } from "./category-visuals";
import { getDefaultCategoryCreates } from "../services/category-taxonomy";

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
		expect(getCategoryVisualMeta("Household", "light")).toMatchObject({
			icon: "basket",
			tone: "warning",
		});
		expect(getCategoryVisualMeta("Personal Care", "light")).toMatchObject({
			icon: "basket",
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

	it("uses saved category color when localized labels differ", () => {
		expect(
			resolveCategoryVisual({
				categoryName: "Hadiah & Donasi",
				mode: "light",
				categories: [
					{
						id: "cat-gifts",
						name: "Gifts & Donations",
						icon: "gift",
						color: "#D946EF",
						visual_locked_by_user: true,
					},
				],
			}),
		).toMatchObject({
			icon: "gift",
			color: "#D946EF",
		});
	});

	it("uses the finance editorial icon vocabulary for care, education, shopping, and income", () => {
		expect(getCategoryVisualMeta("Kesehatan", "light")).toMatchObject({ icon: "firstAid" });
		expect(getCategoryVisualMeta("Olahraga", "light")).toMatchObject({ icon: "sport" });
		expect(getCategoryVisualMeta("Pendidikan", "light")).toMatchObject({ icon: "graduationCap" });
		expect(getCategoryVisualMeta("Belanja Pribadi", "light")).toMatchObject({ icon: "tag" });
		expect(getCategoryVisualMeta("Belanja Bulanan", "light")).toMatchObject({ icon: "groceries" });
		expect(getCategoryVisualMeta("Kebutuhan Rumah & Pribadi", "light")).toMatchObject({ icon: "basket" });
		expect(getCategoryVisualMeta("Gaji", "light")).toMatchObject({ icon: "bank" });
		expect(getCategoryVisualMeta("Bonus", "light")).toMatchObject({ icon: "trophy" });
		expect(getCategoryVisualMeta("Freelance", "light")).toMatchObject({ icon: "briefcase" });
	});

	it("treats the English fallback category as neutral, not as a hashed palette colour", () => {
		expect(getCategoryVisualMeta("Other expenses", "light")).toMatchObject({
			icon: "otherExpenses",
			tone: "neutral",
			color: "#6B7280",
		});
		expect(getCategoryVisualMeta("Lainnya", "light")).toMatchObject({
			icon: "otherExpenses",
			tone: "neutral",
			color: "#6B7280",
		});
	});

	it("ships matching default icons for canonical categories", () => {
		const icons = Object.fromEntries(
			getDefaultCategoryCreates().map((category) => [category.name, category.icon]),
		);
		expect(icons).toMatchObject({
			Health: "firstAid",
			Education: "graduationCap",
			"Personal Shopping": "tag",
			Groceries: "groceries",
			Sport: "sport",
			Salary: "bank",
			Bonus: "trophy",
			Freelance: "briefcase",
		});
	});

	it("never reuses one icon across two canonical categories", () => {
		const icons = getDefaultCategoryCreates().map((category) => category.icon);
		const duplicates = icons.filter((icon, index) => icons.indexOf(icon) !== index);
		expect(duplicates).toEqual([]);
	});

});
