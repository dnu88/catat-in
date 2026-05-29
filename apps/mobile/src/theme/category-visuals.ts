import type { KaswiseIconName } from "../components/icons/kaswise-icons";
import type { ThemeMode } from "./tokens";
import { reportCategoryPalette, reportCategoryRoleColors } from "./report-palettes";

export type CategoryTone =
	| "success"
	| "warning"
	| "danger"
	| "info"
	| "navy"
	| "neutral";

export type CategoryVisualMeta = {
	color: string;
	icon: KaswiseIconName;
	tone: CategoryTone;
};

function normalizeCategoryName(value: string | null | undefined) {
	return (value ?? "").trim().toLowerCase() || "other";
}

function stableCategoryIndex(categoryName: string, paletteLength: number) {
	const normalized = normalizeCategoryName(categoryName);
	let hash = 0;
	for (let index = 0; index < normalized.length; index += 1) {
		hash = (hash * 31 + normalized.charCodeAt(index)) % paletteLength;
	}
	return hash;
}

export function getCategoryVisualMeta(
	categoryName: string | null | undefined,
	mode: ThemeMode,
): CategoryVisualMeta {
	const roleColors = reportCategoryRoleColors[mode];
	const neutralCategoryColor = roleColors.neutral;
	const categoryColorByName: Record<string, CategoryVisualMeta> = {
		food: { color: roleColors.success, icon: "food", tone: "success" },
		"food & beverage": {
			color: roleColors.success,
			icon: "food",
			tone: "success",
		},
		"makanan & minuman": {
			color: roleColors.success,
			icon: "food",
			tone: "success",
		},
		makan: { color: roleColors.success, icon: "food", tone: "success" },
		"makan & minum": {
			color: roleColors.success,
			icon: "food",
			tone: "success",
		},
		transport: { color: roleColors.navy, icon: "transport", tone: "navy" },
		transportasi: { color: roleColors.navy, icon: "transport", tone: "navy" },
		shopping: { color: roleColors.warning, icon: "groceries", tone: "warning" },
		groceries: { color: roleColors.warning, icon: "groceries", tone: "warning" },
		belanja: { color: roleColors.warning, icon: "groceries", tone: "warning" },
		bills: { color: roleColors.danger, icon: "bills", tone: "danger" },
		tagihan: { color: roleColors.danger, icon: "bills", tone: "danger" },
		health: { color: roleColors.info, icon: "sport", tone: "info" },
		kesehatan: { color: roleColors.info, icon: "sport", tone: "info" },
		entertainment: {
			color: roleColors.info,
			icon: "recreation",
			tone: "info",
		},
		hiburan: { color: roleColors.info, icon: "recreation", tone: "info" },
		other: {
			color: neutralCategoryColor,
			icon: "otherExpenses",
			tone: "neutral",
		},
		lainnya: {
			color: neutralCategoryColor,
			icon: "otherExpenses",
			tone: "neutral",
		},
	};
	const key = normalizeCategoryName(categoryName);
	const known = categoryColorByName[key];
	if (known) return known;

	const palette = reportCategoryPalette[mode];
	return {
		color: palette[stableCategoryIndex(key, palette.length)],
		icon: "otherExpenses",
		tone: "neutral",
	};
}
