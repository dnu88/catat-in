jest.mock("@react-native-async-storage/async-storage", () => {
	let store: Record<string, string> = {};
	return {
		__esModule: true,
		default: {
			getItem: jest.fn(async (key: string) => store[key] ?? null),
			setItem: jest.fn(async (key: string, value: string) => {
				store[key] = value;
			}),
			removeItem: jest.fn(async (key: string) => {
				delete store[key];
			}),
			__reset: () => {
				store = {};
			},
		},
	};
});

import type { AutoSaveBlockReason } from "../src/features/transaction-entry/auto-save";
import type { TransactionDraft } from "../src/features/transaction-entry/draft";
import {
	applyClosed,
	applyFieldTouched,
	applyOpened,
	emptyReviewMetrics,
	focusEligible,
	normaliseMetrics,
	readReviewMetrics,
	resetReviewMetrics,
	reviewMode,
	trackFieldTouched,
	trackReviewClosed,
	trackReviewOpened,
} from "../src/features/transaction-entry/review-metrics";

function draft(): TransactionDraft {
	return { key: "d1" } as TransactionDraft;
}

describe("review metrics routing", () => {
	it("routes a single draft blocked by extractor doubt to focus", () => {
		for (const reason of [
			"unresolved_fields",
			"extractor_unsure",
			"low_confidence",
			"generic_category",
		] satisfies AutoSaveBlockReason[]) {
			expect(focusEligible([draft()], reason)).toBe(true);
			expect(reviewMode([draft()], reason)).toBe("focus");
		}
	});

	it("never routes receipt, batch, transfer or hard failures to focus", () => {
		for (const reason of [
			"source_not_text",
			"multi_transaction",
			"transfer_requires_target",
			"missing_amount",
			"invalid_draft",
			"no_drafts",
		] satisfies AutoSaveBlockReason[]) {
			expect(focusEligible([draft()], reason)).toBe(false);
			expect(reviewMode([draft()], reason)).toBe("full");
		}
	});

	it("treats multi-draft batches as full even with a soft reason", () => {
		expect(focusEligible([draft(), { key: "d2" } as TransactionDraft], "unresolved_fields")).toBe(false);
	});

	it("falls back to full when the reason is missing", () => {
		expect(focusEligible([draft()], null)).toBe(false);
		expect(reviewMode([draft()], undefined)).toBe("full");
	});
});

describe("review metric arithmetic", () => {
	it("counts opens per mode and per mode+reason", () => {
		let m = emptyReviewMetrics();
		m = applyOpened(m, "focus", "unresolved_fields");
		m = applyOpened(m, "focus", "unresolved_fields");
		m = applyOpened(m, "full", "multi_transaction");

		expect(m.opened).toBe(3);
		expect(m.focus).toBe(2);
		expect(m.full).toBe(1);
		expect(m.byModeReason).toEqual({
			"focus:unresolved_fields": 2,
			"full:multi_transaction": 1,
		});
	});

	it("counts touched fields and close outcomes without losing prior keys", () => {
		let m = emptyReviewMetrics();
		m = applyFieldTouched(m, "category");
		m = applyFieldTouched(m, "category");
		m = applyFieldTouched(m, "amount");
		m = applyClosed(m, "saved");

		expect(m.fieldsTouched).toEqual({ amount: 1, category: 2, date: 0, wallet: 0 });
		expect(m.closed).toEqual({ saved: 1, failed: 0, abandoned: 0 });
	});

	it("repairs partial or hostile stored payloads", () => {
		expect(normaliseMetrics(null).opened).toBe(0);
		expect(normaliseMetrics("nope").focus).toBe(0);
		const repaired = normaliseMetrics({ opened: 4, closed: { saved: 2 } });
		expect(repaired.opened).toBe(4);
		expect(repaired.closed).toEqual({ saved: 2, failed: 0, abandoned: 0 });
		expect(repaired.fieldsTouched).toEqual({ amount: 0, category: 0, date: 0, wallet: 0 });
	});
});

describe("review metric persistence", () => {
	beforeEach(async () => {
		await resetReviewMetrics();
	});

	it("accumulates events across writes", async () => {
		await trackReviewOpened("focus", "low_confidence");
		await trackFieldTouched("category");
		await trackReviewClosed("saved");

		const stored = await readReviewMetrics();
		expect(stored.opened).toBe(1);
		expect(stored.focus).toBe(1);
		expect(stored.fieldsTouched.category).toBe(1);
		expect(stored.closed.saved).toBe(1);
	});

	it("returns an empty shape when the stored payload is corrupt", async () => {
		const AsyncStorage = require("@react-native-async-storage/async-storage").default;
		await AsyncStorage.setItem("kaswise:review-metrics:v1", "{not json");

		const stored = await readReviewMetrics();
		expect(stored).toEqual(emptyReviewMetrics());
	});
});
