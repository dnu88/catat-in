// This package type-checks without @types/node, so `fs`/`path` are read through
// jest — same pattern as the other source-assertion suites in this package.
const fs = jest.requireActual<{
	readFileSync: (filePath: string, encoding: string) => string;
}>("fs");
const path = jest.requireActual<{
	join: (...segments: string[]) => string;
}>("path");

import {
	financeEditorial as fe,
	resolveFinancialAmountColor,
} from "./finance-editorial";
import {
	experienceElevation,
	experienceElevationOrder,
	experienceIcon,
	experienceRadius,
	experienceSpacing,
	experienceTokens,
	experienceType,
	experienceTypeRole,
	resolveExperienceTextStyle,
	scaleStep,
} from "./experience-tokens";

describe("experience tokens", () => {
	it("exposes an ascending spacing scale starting from zero", () => {
		expect(experienceSpacing[0]).toBe(0);
		for (let index = 1; index < experienceSpacing.length; index += 1) {
			expect(experienceSpacing[index]).toBeGreaterThan(
				experienceSpacing[index - 1],
			);
		}
	});

	it("exposes ascending radius steps that end on a pill value", () => {
		for (let index = 1; index < experienceRadius.length; index += 1) {
			expect(experienceRadius[index]).toBeGreaterThan(
				experienceRadius[index - 1],
			);
		}
		expect(experienceRadius[experienceRadius.length - 1]).toBeGreaterThanOrEqual(
			999,
		);
	});

	it("keeps type sizes ordered and readable", () => {
		const sizes = [
			experienceType.caption,
			experienceType.sectionLabel,
			experienceType.helper,
			experienceType.meta,
			experienceType.body,
			experienceType.row,
			experienceType.metric,
			experienceType.cardTitle,
			experienceType.title,
			experienceType.sectionHeading,
			experienceType.amount,
			experienceType.screenTitle,
			experienceType.hero,
		];

		for (let index = 1; index < sizes.length; index += 1) {
			expect(sizes[index]).toBeGreaterThanOrEqual(sizes[index - 1]);
		}
		expect(experienceType.helper).toBeGreaterThanOrEqual(11);
		expect(experienceType.body).toBeGreaterThanOrEqual(13);
	});

	it("never duplicates the palette — colors stay in finance-editorial", () => {
		// Assert on the SOURCE, not the resolved values: the token module must
		// not declare its own hex/rgba literals, only reference them.
		const source = fs.readFileSync(
			path.join(__dirname, "experience-tokens.ts"),
			"utf8",
		);

		expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(source).not.toMatch(/rgba?\(/);
	});

	it("reuses the exact finance-editorial references it needs", () => {
		expect(experienceTokens.palette.brandPrimary).toBe(fe.blueBright);
		expect(experienceTokens.palette.ink).toBe(fe.ink);
		expect(experienceTokens.palette.paper).toBe(fe.paper);
		expect(experienceTokens.palette.surface).toBe(fe.white);
		expect(experienceTokens.palette.line).toBe(fe.line);
		expect(experienceTokens.palette.textSecondary).toBe(fe.textSecondary);
	});

	it("leaves semantic financial colors unchanged", () => {
		expect(resolveFinancialAmountColor("income")).toBe(fe.financialIncome);
		expect(resolveFinancialAmountColor("expense")).toBe(fe.financialExpense);
		expect(resolveFinancialAmountColor("transfer")).toBe(fe.financialTransfer);
		expect(resolveFinancialAmountColor("adverse")).toBe(
			fe.financialExpenseAlert,
		);
		expect(resolveFinancialAmountColor("total")).toBe(fe.financialTotal);

		expect(experienceTokens.palette.amount).toBe(fe.financialExpense);
	});

	it("keeps interactive targets at or above the 44px touch minimum", () => {
		expect(experienceTokens.target.minTouch).toBeGreaterThanOrEqual(44);
		expect(experienceTokens.target.ctaHeight).toBeGreaterThanOrEqual(44);
		expect(experienceTokens.target.chipMinHeight).toBeGreaterThanOrEqual(44);
	});

	it("clamps scaleStep to the available range", () => {
		expect(scaleStep(0)).toBe(experienceSpacing[0]);
		expect(scaleStep(999)).toBe(experienceSpacing[experienceSpacing.length - 1]);
		expect(scaleStep(-4)).toBe(experienceSpacing[0]);
	});
});

describe("experience type roles (B1 — G03)", () => {
	it("gives every amount role tabular digits so figures align column-to-column", () => {
		for (const role of [
			"heroAmount",
			"statAmount",
			"rowAmount",
			"heroBalance",
			"metricAmount",
			"recentAmount",
			"walletTotal",
		] as const) {
			expect(resolveExperienceTextStyle(role).fontVariant).toEqual([
				"tabular-nums",
			]);
		}
	});

	it("keeps prose roles proportional (tabular digits are for figures only)", () => {
		for (const role of [
			"screenTitle",
			"sectionTitle",
			"rowTitle",
			"rowMeta",
			"rowHelper",
			"sectionLabel",
			"body",
			"caption",
		] as const) {
			expect(resolveExperienceTextStyle(role).fontVariant).toBeUndefined();
		}
	});

	it("keeps amount roles visually dominant over body copy", () => {
		expect(experienceType.amount).toBeGreaterThan(experienceType.body);
		expect(experienceTypeRole.rowAmount.fontSize).toBeGreaterThanOrEqual(
			experienceType.body,
		);
	});

	it("never sets a color — semantic colors stay in finance-editorial", () => {
		for (const role of Object.keys(experienceTypeRole)) {
			const style = resolveExperienceTextStyle(role as never) as Record<
				string,
				unknown
			>;
			expect(style.color).toBeUndefined();
		}
	});

	it("keeps every replacement role at its legacy size — B1 aligns digits, it does not resize", () => {
		// Each role below was swapped in for a literal that already shipped. If a
		// future edit changes these numbers it is a visual redesign, not a token
		// cleanup, and it must be captured as before/after (caught once already:
		// the wallets hero total was 28px, not the 32px the ramp first assumed).
		expect(experienceTypeRole.heroBalance.fontSize).toBe(38); // Home saldo
		expect(experienceTypeRole.walletTotal.fontSize).toBe(28); // Dompet hero total
		expect(experienceTypeRole.metricAmount.fontSize).toBe(15); // Home hero metric
		expect(experienceTypeRole.recentAmount.fontSize).toBe(13); // Home recent row
		expect(experienceTypeRole.statAmount.fontSize).toBe(22); // Transaksi stat card
		expect(experienceTypeRole.rowAmount.fontSize).toBe(14); // Transaksi row
	});

	it("returns a fresh fontVariant array so callers cannot mutate the token", () => {
		const first = resolveExperienceTextStyle("rowAmount").fontVariant;
		const second = resolveExperienceTextStyle("rowAmount").fontVariant;
		expect(first).not.toBe(second);
		expect(first).toEqual(second);
	});
});

describe("experience elevation (B1 — G05)", () => {
	it("orders levels by rising visual weight", () => {
		const levels = experienceElevationOrder.map(
			(level) => experienceElevation[level],
		);

		for (let index = 1; index < levels.length; index += 1) {
			expect(levels[index].elevation).toBeGreaterThan(
				levels[index - 1].elevation,
			);
			expect(levels[index].shadowOpacity).toBeGreaterThan(
				levels[index - 1].shadowOpacity,
			);
		}
	});

	it("anchors every shadow on the finance-editorial navy reference", () => {
		expect(experienceElevation.card.shadowColor).toBe(fe.navy);
		expect(experienceElevation.raised.shadowColor).toBe(fe.navy);
		expect(experienceElevation.floating.shadowColor).toBe(fe.navy);
		expect(experienceElevation.flat.elevation).toBe(0);
		expect(experienceElevation.flat.shadowOpacity).toBe(0);
	});

	it("keeps bordered levels on the shared divider token", () => {
		expect(experienceElevation.flat.borderColor).toBe(fe.line);
		expect(experienceElevation.card.borderColor).toBe(fe.line);
	});
});

describe("experience icon tiles (B1 — G07)", () => {
	it("keeps the row tile at or above the 44px touch minimum", () => {
		expect(experienceIcon.tile.row).toBeGreaterThanOrEqual(
			experienceTokens.target.minTouch,
		);
	});

	it("keeps a glyph ratio that leaves the tile padding visible", () => {
		expect(experienceIcon.glyphRatio).toBeGreaterThan(0);
		expect(experienceIcon.glyphRatio).toBeLessThan(1);
		expect(
			experienceIcon.tile.row * experienceIcon.glyphRatio,
		).toBeLessThanOrEqual(experienceIcon.tile.row);
	});
});
