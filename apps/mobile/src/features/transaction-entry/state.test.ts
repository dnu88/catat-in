import { createDraft, type TransactionDraft } from "./draft";
import {
	canRetrySafely,
	createInitialEntryState,
	createSubmitLock,
	entryReducer,
	hasUnsavedWork,
	withSubmitLock,
	type EntryState,
	type ContextSnapshot,
} from "./state";

const personal: ContextSnapshot = { id: "personal", label: "Pribadi", canCreate: true };
const family: ContextSnapshot = { id: "hh-1", label: "Keluarga Danu", canCreate: true };

function draft(key: string, overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return createDraft({ source: "text", key, amount: 35000, category: "Makan & Minum", ...overrides });
}

/** Drive the reducer to the review phase and return the resulting state. */
function readyForReview(drafts: TransactionDraft[], context = personal): EntryState {
	let state = createInitialEntryState(context);
	state = entryReducer(state, { type: "processing-started" });
	state = entryReducer(state, {
		type: "drafts-ready",
		generation: state.generation,
		source: "text",
		drafts,
	});
	return state;
}

describe("stale request guards", () => {
	test("a new request invalidates the previous generation", () => {
		let state = createInitialEntryState(personal);
		state = entryReducer(state, { type: "processing-started" });
		const firstGeneration = state.generation;
		state = entryReducer(state, { type: "processing-started" });
		expect(state.generation).toBe(firstGeneration + 1);

		// The slow first request finally resolves — it must not populate review.
		const stale = entryReducer(state, {
			type: "drafts-ready",
			generation: firstGeneration,
			source: "text",
			drafts: [draft("a")],
		});
		expect(stale.phase).toBe("processing");
		expect(stale.drafts).toEqual([]);
	});

	test("switching context drops an in-flight result from the old context", () => {
		let state = createInitialEntryState(personal);
		state = entryReducer(state, { type: "processing-started" });
		const generation = state.generation;

		state = entryReducer(state, { type: "context-changed", context: family });
		expect(state.phase).toBe("idle");
		expect(state.generation).toBe(generation + 1);

		const late = entryReducer(state, {
			type: "drafts-ready",
			generation,
			source: "text",
			drafts: [draft("a")],
		});
		expect(late.drafts).toEqual([]);
		expect(late.phase).toBe("idle");
	});

	test("a save result from a superseded request is ignored", () => {
		const state = readyForReview([draft("a")]);
		const generation = state.generation;
		const saving = entryReducer(state, { type: "save-started" });

		const staleSuccess = entryReducer(saving, {
			type: "save-succeeded",
			generation: generation - 1,
			savedKeys: ["a"],
		});
		expect(staleSuccess.phase).toBe("saving");

		const freshSuccess = entryReducer(saving, {
			type: "save-succeeded",
			generation,
			savedKeys: ["a"],
		});
		expect(freshSuccess.phase).toBe("success");
		expect(freshSuccess.savedKeys).toEqual(["a"]);
	});
});

describe("draft editing", () => {
	test("editing one draft leaves the others untouched", () => {
		const state = readyForReview([draft("a"), draft("b", { amount: 12000 })]);
		const next = entryReducer(state, {
			type: "draft-updated",
			key: "b",
			patch: { amount: 15000, category: "Transportasi" },
		});

		expect(next.drafts[0].amount).toBe(35000);
		expect(next.drafts[1].amount).toBe(15000);
		expect(next.drafts[1].category).toBe("Transportasi");
	});

	test("acknowledging a warning records it on the right draft", () => {
		const state = readyForReview([draft("a", { unresolvedFields: ["amount"] })]);
		const next = entryReducer(state, { type: "draft-acknowledged", key: "a", field: "amount" });
		expect(next.drafts[0].acknowledgedFields).toEqual(["amount"]);
	});
});

describe("save failure handling", () => {
	test("a known failure keeps the user's input and allows an in-place retry", () => {
		const state = readyForReview([draft("a"), draft("b")]);
		const generation = state.generation;
		const saving = entryReducer(state, { type: "save-started" });

		const failed = entryReducer(saving, {
			type: "save-failed",
			generation,
			kind: "known",
			message: "Gagal menyimpan",
		});

		expect(failed.phase).toBe("error");
		expect(failed.drafts).toHaveLength(2);
		expect(failed.outcomeUnknown).toBe(false);
		expect(canRetrySafely(failed)).toBe(true);

		const retried = entryReducer(failed, { type: "retry" });
		expect(retried.phase).toBe("review");
		expect(retried.drafts).toHaveLength(2);
		expect(retried.error).toBeNull();
	});

	test("an unknown outcome blocks a blind retry until reconciled", () => {
		const state = readyForReview([draft("a")]);
		const generation = state.generation;
		const saving = entryReducer(state, { type: "save-started" });

		const failed = entryReducer(saving, {
			type: "save-failed",
			generation,
			kind: "unknown",
			message: "Waktu habis",
		});

		expect(failed.outcomeUnknown).toBe(true);
		expect(canRetrySafely(failed)).toBe(false);
		// Retry is refused, so a timeout cannot duplicate a committed transaction.
		expect(entryReducer(failed, { type: "retry" })).toBe(failed);
		// The payload that may already exist is still visible for reconciliation.
		expect(failed.frozenDrafts).toHaveLength(1);
	});

	test("failure restores the payload that was actually sent", () => {
		const state = readyForReview([draft("a", { amount: 35000 })]);
		const generation = state.generation;
		const saving = entryReducer(state, { type: "save-started" });
		// A late edit that never reached the server must not overwrite the frozen copy.
		const edited = entryReducer(saving, { type: "draft-updated", key: "a", patch: { amount: 99000 } });
		const failed = entryReducer(edited, {
			type: "save-failed",
			generation,
			kind: "known",
			message: "Gagal",
		});
		expect(failed.drafts[0].amount).toBe(35000);
	});
});

describe("reset and dirty detection", () => {
	test("reset after success clears the session", () => {
		let state = readyForReview([draft("a")]);
		const generation = state.generation;
		state = entryReducer(state, { type: "save-started" });
		state = entryReducer(state, { type: "save-succeeded", generation, savedKeys: ["a"] });
		expect(state.phase).toBe("success");

		const reset = entryReducer(state, { type: "reset" });
		expect(reset.phase).toBe("idle");
		expect(reset.drafts).toEqual([]);
		expect(reset.savedKeys).toEqual([]);
		expect(reset.generation).toBe(generation + 1);
	});

	test("hasUnsavedWork is true while a draft or request exists", () => {
		const idle = createInitialEntryState(personal);
		expect(hasUnsavedWork(idle)).toBe(false);

		expect(hasUnsavedWork(readyForReview([draft("a")]))).toBe(true);
		expect(
			hasUnsavedWork(entryReducer(idle, { type: "processing-started" })),
		).toBe(true);
		expect(
			hasUnsavedWork(entryReducer(idle, { type: "recording-started" })),
		).toBe(true);
	});

	test("selecting a mode cannot discard an existing draft", () => {
		const state = readyForReview([draft("a")]);
		const next = entryReducer(state, { type: "source-selected", source: "image" });
		expect(next).toBe(state);
	});

	test("cancelling processing clears the session", () => {
		let state = createInitialEntryState(personal);
		state = entryReducer(state, { type: "processing-started" });
		state = entryReducer(state, { type: "processing-cancelled" });
		expect(state.phase).toBe("idle");
	});
});

describe("submit lock", () => {
	test("only one holder at a time", () => {
		const lock = createSubmitLock();
		expect(lock.isLocked()).toBe(false);
		expect(lock.tryAcquire()).toBe(true);
		expect(lock.tryAcquire()).toBe(false);
		expect(lock.isLocked()).toBe(true);
		lock.release();
		expect(lock.tryAcquire()).toBe(true);
	});

	test("withSubmitLock drops a concurrent second call instead of running it twice", async () => {
		const lock = createSubmitLock();
		let runs = 0;
		let resolveFirst: () => void = () => {};
		const first = withSubmitLock(lock, async () => {
			runs += 1;
			await new Promise<void>((resolve) => {
				resolveFirst = resolve;
			});
			return "first";
		});
		const second = withSubmitLock(lock, async () => {
			runs += 1;
			return "second";
		});

		expect(await second).toBeUndefined();
		resolveFirst();
		expect(await first).toBe("first");
		expect(runs).toBe(1);
	});

	test("the lock is released after a thrown error so retry stays possible", async () => {
		const lock = createSubmitLock();
		await expect(
			withSubmitLock(lock, async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect(lock.isLocked()).toBe(false);
	});
});
