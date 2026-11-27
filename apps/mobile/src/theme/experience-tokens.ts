import { financeEditorial as fe } from "./finance-editorial";

/**
 * Experience tokens for the "simple premium" presentation layer.
 *
 * These describe SPACING, RADIUS, TYPE hierarchy, ELEVATION and target sizes
 * only. They deliberately contain no colors of their own — every color is a
 * reference into `finance-editorial`, so the financial palette keeps a single
 * source of truth and semantic income/expense/transfer colors can never drift.
 */

/** 4pt rhythm. Index === number of base steps. */
export const experienceSpacing = [
	0, 4, 8, 12, 16, 20, 24, 32, 40, 48,
] as const;

export const experienceRadius = [0, 8, 12, 16, 20, 24, 999] as const;

export type ExperienceSpaceStep = (typeof experienceSpacing)[number];
export type ExperienceRadiusStep = (typeof experienceRadius)[number];

/**
 * Clamp an arbitrary index into the spacing scale so callers can do
 * `scaleStep(n)` without bounds-checking.
 */
export function scaleStep(index: number): ExperienceSpaceStep {
	if (!Number.isFinite(index) || index <= 0) {
		return experienceSpacing[0];
	}
	if (index >= experienceSpacing.length - 1) {
		return experienceSpacing[experienceSpacing.length - 1];
	}
	return experienceSpacing[Math.floor(index)];
}

/**
 * Type hierarchy: ascending weights and sizes, readable on 360px width.
 * This is the ONLY numeric size scale — named roles below reference it.
 */
export const experienceType = {
	caption: 10,
	sectionLabel: 11,
	helper: 11.5,
	meta: 12,
	body: 13,
	row: 14,
	metric: 15,
	cardTitle: 16,
	title: 19,
	sectionHeading: 20,
	amount: 22,
	screenTitle: 28,
	hero: 38,
} as const;

/**
 * Tabular (monospaced) digits. Every financial figure uses them so columns of
 * numbers line up between rows instead of jittering with proportional digits.
 */
export const experienceTabularNumerals = ["tabular-nums"] as const;

type ExperienceTextSpec = {
	fontSize: number;
	fontWeight?: "400" | "500" | "600" | "700" | "800";
	letterSpacing?: number;
	/** Amount roles opt into tabular digits; prose roles stay proportional. */
	tabular?: boolean;
};

/**
 * Named type roles for the presentation layer. Amount roles (heroAmount,
 * statAmount, rowAmount) always carry tabular digits.
 */
export const experienceTypeRole = {
	screenTitle: {
		fontSize: experienceType.screenTitle,
		fontWeight: "600",
		letterSpacing: -0.6,
	},
	heroAmount: {
		fontSize: experienceType.screenTitle,
		fontWeight: "700",
		letterSpacing: -0.4,
		tabular: true,
	},
	statAmount: {
		fontSize: experienceType.amount,
		fontWeight: "700",
		letterSpacing: -0.2,
		tabular: true,
	},
	rowAmount: {
		fontSize: experienceType.row,
		fontWeight: "700",
		tabular: true,
	},
	rowTitle: { fontSize: experienceType.row, fontWeight: "600" },
	rowMeta: { fontSize: experienceType.meta },
	rowHelper: { fontSize: experienceType.helper },
	sectionLabel: {
		fontSize: experienceType.sectionLabel,
		fontWeight: "700",
		letterSpacing: 0.4,
	},
	sectionTitle: {
		fontSize: experienceType.sectionHeading,
		fontWeight: "600",
		letterSpacing: -0.35,
	},
	/** Home hero balance — the largest figure in the app. */
	heroBalance: {
		fontSize: experienceType.hero,
		fontWeight: "600",
		letterSpacing: -1.1,
		tabular: true,
	},
	/** Summary metric inside the hero (income/expense/remaining). */
	metricAmount: {
		fontSize: experienceType.metric,
		fontWeight: "600",
		tabular: true,
	},
	/** Small figure in a recent-transaction row. */
	recentAmount: {
		fontSize: experienceType.body,
		fontWeight: "600",
		tabular: true,
	},
	/** Total across wallets (Wallets hero). */
	walletTotal: {
		fontSize: experienceType.screenTitle,
		fontWeight: "800",
		letterSpacing: -0.5,
		tabular: true,
	},
	/** Title inside a card/row group (settings rows, wallet cards). */
	cardTitle: {
		fontSize: experienceType.cardTitle,
		fontWeight: "600",
	},
	body: { fontSize: experienceType.body },
	caption: { fontSize: experienceType.caption },
} satisfies Record<string, ExperienceTextSpec>;

export type ExperienceTextRole = keyof typeof experienceTypeRole;

/**
 * Resolve a named role into a React Native TextStyle. Colors are NEVER set here
 * (semantic colors come from `resolveFinancialAmountColor`).
 */
export function resolveExperienceTextStyle(
	role: ExperienceTextRole,
): import("react-native").TextStyle {
	const spec: ExperienceTextSpec = experienceTypeRole[role];
	const style: import("react-native").TextStyle = { fontSize: spec.fontSize };
	if (spec.fontWeight) {
		style.fontWeight = spec.fontWeight;
	}
	if (spec.letterSpacing !== undefined) {
		style.letterSpacing = spec.letterSpacing;
	}
	if (spec.tabular) {
		style.fontVariant = [...experienceTabularNumerals];
	}
	return style;
}

/**
 * Surface hierarchy. Levels ascend in visual weight: `flat` (inset, border
 * only) → `card` → `raised` → `floating`. Shadow colors reference the
 * finance-editorial navy; no component should invent its own shadow.
 */
export const experienceElevation = {
	flat: {
		borderWidth: 1,
		borderColor: fe.line,
		shadowOpacity: 0,
		elevation: 0,
	},
	card: {
		borderWidth: 1,
		borderColor: fe.line,
		shadowColor: fe.navy,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 2,
		elevation: 1,
	},
	raised: {
		borderWidth: 0,
		shadowColor: fe.navy,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.07,
		shadowRadius: 12,
		elevation: 3,
	},
	floating: {
		borderWidth: 0,
		shadowColor: fe.navy,
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.12,
		shadowRadius: 28,
		elevation: 8,
	},
} as const;

export type ExperienceElevationLevel = keyof typeof experienceElevation;

/** Ascending order — useful for tests and for documenting the hierarchy. */
export const experienceElevationOrder: ExperienceElevationLevel[] = [
	"flat",
	"card",
	"raised",
	"floating",
];

/** Icon tiles: one tile size per role, glyph stays a fixed ratio of the tile. */
export const experienceIcon = {
	tile: {
		row: 44,
		section: 36,
		hero: 48,
	},
	/** Glyph occupies half the tile so stroke weight looks constant. */
	glyphRatio: 0.5,
} as const;

export const experienceTokens = {
	spacing: experienceSpacing,
	radius: experienceRadius,
	type: experienceType,
	typeRole: experienceTypeRole,
	elevation: experienceElevation,
	icon: experienceIcon,
	/**
	 * References (never copies) into the Finance Editorial palette. Renaming or
	 * re-tuning a brand color happens in `finance-editorial` only.
	 */
	palette: {
		brandPrimary: fe.blueBright,
		brandDeep: fe.navySurface,
		ink: fe.ink,
		paper: fe.paper,
		surface: fe.white,
		line: fe.line,
		textSecondary: fe.textSecondary,
		textMuted: fe.textMuted,
		/** Amount anchor color for a plain expense row. */
		amount: fe.financialExpense,
		/** One dominant CTA per surface. */
		primaryAction: fe.navy,
		primaryActionText: fe.white,
		disabledAction: fe.decorativeMuted,
		success: fe.successText,
		warning: fe.warning,
		danger: fe.danger,
	},
	target: {
		/** Minimum interactive box on web, measured, not just hitSlop. */
		minTouch: 44,
		ctaHeight: 48,
		rowMinHeight: 56,
		chipMinHeight: 44,
	},
	motion: {
		/** Short, functional durations only — no staggering that delays input. */
		quick: 120,
		base: 180,
		calm: 240,
	},
} as const;

export type ExperienceTokens = typeof experienceTokens;
