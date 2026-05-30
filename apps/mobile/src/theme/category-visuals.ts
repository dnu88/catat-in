import {
	kaswiseIconNames,
	type KaswiseIconName,
} from "../components/icons/kaswise-icons";
import { getCategoryDefinitionByName } from "../services/category-taxonomy";
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

export type CategoryVisualSource = {
	id?: string | null;
	name?: string | null;
	icon?: string | null;
	color?: string | null;
	visual_locked_by_user?: boolean | null;
};

export type ResolveCategoryVisualInput = {
	categoryId?: string | null;
	categoryName?: string | null;
	categories?: CategoryVisualSource[];
	mode: ThemeMode;
	fallbackIcon?: string | null;
	fallbackColor?: string | null;
};

export function normalizeCategoryVisualName(value: string | null | undefined) {
	return (value ?? "").trim().toLowerCase() || "other";
}

function isHexColor(value: string | null | undefined) {
	return /^#[0-9a-f]{6}$/i.test(value ?? "");
}

function isKaswiseIconName(value: string | null | undefined): value is KaswiseIconName {
	return kaswiseIconNames.includes(value as KaswiseIconName);
}

function findCategoryVisualSource(
	categories: CategoryVisualSource[],
	categoryId: string | null | undefined,
	categoryName: string | null | undefined,
) {
	if (categoryId) {
		const byId = categories.find((category) => category.id === categoryId);
		if (byId) return byId;
	}

	const key = normalizeCategoryVisualName(categoryName);
	return categories.find(
		(category) => normalizeCategoryVisualName(category.name) === key,
	);
}

function stableCategoryIndex(categoryName: string, paletteLength: number) {
	const normalized = normalizeCategoryVisualName(categoryName);
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
		"belanja bulanan": { color: roleColors.warning, icon: "groceries", tone: "warning" },
		"belanja pribadi": { color: roleColors.warning, icon: "groceries", tone: "warning" },
		"personal shopping": { color: roleColors.warning, icon: "groceries", tone: "warning" },
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
		olahraga: { color: roleColors.info, icon: "sport", tone: "info" },
		sport: { color: roleColors.info, icon: "sport", tone: "info" },
		"hadiah & donasi": { color: roleColors.danger, icon: "gift", tone: "danger" },
		"gifts & donations": { color: roleColors.danger, icon: "gift", tone: "danger" },
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
	const definition = getCategoryDefinitionByName(categoryName);
	const key = normalizeCategoryVisualName(definition?.labels.en ?? categoryName);
	const localizedKey = normalizeCategoryVisualName(categoryName);
	const known = categoryColorByName[localizedKey] ?? categoryColorByName[key];
	if (known) return known;

	const palette = reportCategoryPalette[mode];
	return {
		color: palette[stableCategoryIndex(key, palette.length)],
		icon: "otherExpenses",
		tone: "neutral",
	};
}


export function resolveCategoryVisual({
	categoryId,
	categoryName,
	categories = [],
	mode,
	fallbackIcon,
	fallbackColor,
}: ResolveCategoryVisualInput): CategoryVisualMeta {
	const source = findCategoryVisualSource(categories, categoryId, categoryName);
	const defaultVisual = getCategoryVisualMeta(
		source?.name ?? categoryName,
		mode,
	);
	const resolvedIcon = isKaswiseIconName(source?.icon)
		? source.icon
		: isKaswiseIconName(fallbackIcon)
			? fallbackIcon
			: defaultVisual.icon;
	const resolvedColor = isHexColor(source?.color)
		? (source?.color as string)
		: isHexColor(fallbackColor)
			? (fallbackColor as string)
			: defaultVisual.color;

	return {
		...defaultVisual,
		icon: resolvedIcon,
		color: resolvedColor,
	};
}
