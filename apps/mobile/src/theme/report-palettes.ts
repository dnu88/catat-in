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

export function getReportCategoryColor(mode: ThemeMode, index: number) {
	const palette = reportCategoryPalette[mode];
	return palette[index % palette.length];
}
