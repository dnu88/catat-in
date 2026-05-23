import type { ThemeMode } from "./tokens";

export const reportCategoryPalette: Record<ThemeMode, string[]> = {
	light: [
		"#65A30D",
		"#2A5DD0",
		"#B45309",
		"#DC2626",
		"#0284C7",
		"#7C3AED",
		"#DB2777",
		"#0F766E",
	],
	dark: [
		"#A3FF12",
		"#4A80F0",
		"#F59E0B",
		"#FF7B7B",
		"#38BDF8",
		"#A78BFA",
		"#F472B6",
		"#2DD4BF",
	],
};

export const reportCategoryRoleColors = {
	light: {
		success: reportCategoryPalette.light[0],
		navy: reportCategoryPalette.light[1],
		warning: reportCategoryPalette.light[2],
		danger: reportCategoryPalette.light[3],
		info: reportCategoryPalette.light[4],
		neutral: "#6B7280",
	},
	dark: {
		success: reportCategoryPalette.dark[0],
		navy: reportCategoryPalette.dark[1],
		warning: reportCategoryPalette.dark[2],
		danger: reportCategoryPalette.dark[3],
		info: reportCategoryPalette.dark[4],
		neutral: "#9CA3AF",
	},
} as const satisfies Record<ThemeMode, Record<string, string>>;

export const reportDefaultCategoryColors = {
	food: reportCategoryRoleColors.light.success,
	transport: reportCategoryRoleColors.light.navy,
	shopping: reportCategoryRoleColors.light.warning,
	bills: reportCategoryRoleColors.light.danger,
	entertainment: reportCategoryRoleColors.light.info,
	other: reportCategoryRoleColors.light.neutral,
} as const;

export const budgetEnvelopePalette: Record<ThemeMode, string[]> = {
	light: [
		"#65A30D",
		"#4A80F0",
		"#854D0E",
		"#DC2626",
		"#7C3AED",
		"#0F766E",
		"#DB2777",
		"#EA580C",
		"#475569",
	],
	dark: [
		"#A3FF12",
		"#4A80F0",
		"#F59E0B",
		"#FF7B7B",
		"#A78BFA",
		"#2DD4BF",
		"#F472B6",
		"#FDBA74",
		"#94A3B8",
	],
};

export const kaswiseLogoPalette = {
	graphiteStart: "#4B5563",
	graphiteEnd: "#1F2937",
	mistStart: "#9CA3AF",
	mistEnd: "#4B5563",
	forestStart: "#166534",
	forestEnd: "#022C22",
	emeraldStart: "#A3FF12",
	emeraldEnd: "#65A30D",
} as const;

export function getReportCategoryColor(mode: ThemeMode, index: number) {
	const palette = reportCategoryPalette[mode];
	return palette[index % palette.length];
}
