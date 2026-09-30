import type { ThemeMode } from "./tokens";

export const reportCategoryPalette: Record<ThemeMode, string[]> = {
	light: [
		"#178BD0",
		"#0C4E91",
		"#2F7FC1",
		"#285D99",
		"#42B7EB",
		"#3B7DB8",
		"#62AEE0",
		"#4D91C7",
	],
	dark: [
		"#42B7EB",
		"#85C6E8",
		"#62AEE0",
		"#4A80F0",
		"#38BDF8",
		"#6BA8D9",
		"#9CC6EA",
		"#7FB0DB",
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
		"#62AEE0",
		"#42B7EB",
		"#4D91C7",
		"#178BD0",
		"#3B7DB8",
		"#2F7FC1",
		"#285D99",
		"#0C4E91",
	],
	dark: [
		"#9CC6EA",
		"#85C6E8",
		"#7FB0DB",
		"#62AEE0",
		"#6BA8D9",
		"#42B7EB",
		"#38BDF8",
		"#4A80F0",
	],
};

export const kaswiseLogoPalette = {
	graphiteStart: "#4B5563",
	graphiteEnd: "#1F2937",
	mistStart: "#9CA3AF",
	mistEnd: "#4B5563",
	navyStart: "#0A3D78",
	navyEnd: "#071B4F",
	blueStart: "#42B7EB",
	blueEnd: "#178BD0",
} as const;

export function getReportCategoryColor(mode: ThemeMode, index: number) {
	const palette = reportCategoryPalette[mode];
	return palette[index % palette.length];
}
