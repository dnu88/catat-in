import type { EntrySource, ReviewField, TransactionDraft } from "./draft";
import { acknowledgeField } from "./draft";

/**
 * Capture entry lifecycle.
 *
 * The reducer is pure so the risky parts — dropping stale async results and
 * refusing to lose a user's draft — are unit-testable without a renderer.
 * Generation counting is the guard: every new request (or context switch)
 * increments it, and any async result carrying an older generation is ignored.
 */

export type EntryPhase =
	| "idle"
	| "recording"
	| "processing"
	| "review"
	| "saving"
	| "success"
	| "error";

export type ContextSnapshot = {
	/** Stable identity of the active finance context (personal or household id). */
	id: string;
	/** Human label shown next to the destination picker. */
	label: string;
	canCreate: boolean;
};

export type SaveFailureKind = "known" | "unknown";

export type EntryState = {
	phase: EntryPhase;
	/** Bumped on new request, context switch and reset. */
	generation: number;
	context: ContextSnapshot;
	source: EntrySource | null;
	drafts: TransactionDraft[];
	/** Drafts frozen at save time, so a failure can restore exactly what was sent. */
	frozenDrafts: TransactionDraft[];
	savedKeys: string[];
	error: string | null;
	previousPhase: EntryPhase | null;
	/** True when a save may have committed but the client never saw the result. */
	outcomeUnknown: boolean;
};

export type EntryAction =
	| { type: "source-selected"; source: EntrySource }
	| { type: "recording-started" }
	| { type: "recording-cancelled" }
	| { type: "processing-started" }
	| { type: "processing-cancelled" }
	| { type: "drafts-ready"; generation: number; source: EntrySource; drafts: TransactionDraft[] }
	| { type: "draft-updated"; key: string; patch: Partial<TransactionDraft> }
	| { type: "draft-acknowledged"; key: string; field: ReviewField }
	| { type: "save-started" }
	| { type: "save-succeeded"; generation: number; savedKeys: string[] }
	| { type: "save-failed"; generation: number; kind: SaveFailureKind; message: string }
	| { type: "retry" }
	| { type: "context-changed"; context: ContextSnapshot }
	| { type: "review-again" }
	| { type: "reset" };

export function createInitialEntryState(context: ContextSnapshot): EntryState {
	return {
		phase: "idle",
		generation: 0,
		context,
		source: null,
		drafts: [],
		frozenDrafts: [],
		savedKeys: [],
		error: null,
		previousPhase: null,
		outcomeUnknown: false,
	};
}

/** A draft exists or a request is in flight: switching modes would discard work. */
export function hasUnsavedWork(state: EntryState): boolean {
	if (state.phase === "saving") return true;
	return state.drafts.length > 0 || state.phase === "processing" || state.phase === "recording";
}

/** A blind retry is only safe when the previous attempt is known to have failed. */
export function canRetrySafely(state: EntryState): boolean {
	return state.phase === "error" && !state.outcomeUnknown;
}

function withDraft(
	state: EntryState,
	key: string,
	update: (draft: TransactionDraft) => TransactionDraft,
): EntryState {
	const index = state.drafts.findIndex((draft) => draft.key === key);
	if (index === -1) return state;
	const next = [...state.drafts];
	next[index] = update(next[index]);
	return { ...state, drafts: next };
}

function clearWork(state: EntryState, generation: number): EntryState {
	return {
		...state,
		generation,
		phase: "idle",
		source: null,
		drafts: [],
		frozenDrafts: [],
		savedKeys: [],
		error: null,
		previousPhase: null,
		outcomeUnknown: false,
	};
}

export function entryReducer(state: EntryState, action: EntryAction): EntryState {
	switch (action.type) {
		case "source-selected":
			// Selecting a mode on an idle screen must not throw away a draft; the
			// screen asks for confirmation first when hasUnsavedWork() is true.
			if (hasUnsavedWork(state) && state.phase !== "error") return state;
			return { ...state, source: action.source, error: null };

		case "recording-started":
			if (state.phase !== "idle" && state.phase !== "recording") return state;
			return { ...state, phase: "recording", source: "voice", error: null };

		case "recording-cancelled":
			if (state.phase !== "recording") return state;
			return { ...state, phase: "idle" };

		case "review-again":
			// Tapping an auto-saved notice hands the very same drafts back to the
			// review screen, so correcting them never means retyping the sentence.
			if (state.phase !== "success") return state;
			return { ...state, phase: "review", savedKeys: [], error: null };

		case "processing-started":
			// A new request invalidates any in-flight result from the previous one.
			return {
				...state,
				phase: "processing",
				generation: state.generation + 1,
				error: null,
				outcomeUnknown: false,
				previousPhase: null,
			};

		case "processing-cancelled":
			if (state.phase !== "processing") return state;
			return clearWork(state, state.generation + 1);

		case "drafts-ready":
			// Drop results from a superseded request or a context that moved on.
			if (action.generation !== state.generation) return state;
			if (state.phase !== "processing") return state;
			return {
				...state,
				phase: "review",
				source: action.source,
				drafts: action.drafts,
				frozenDrafts: [],
				error: null,
			};

		case "draft-updated":
			return withDraft(state, action.key, (draft) => ({ ...draft, ...action.patch }));

		case "draft-acknowledged":
			return withDraft(state, action.key, (draft) => acknowledgeField(draft, action.field));

		case "save-started":
			if (state.phase !== "review") return state;
			return {
				...state,
				phase: "saving",
				frozenDrafts: state.drafts,
				previousPhase: "review",
				error: null,
				outcomeUnknown: false,
			};

		case "save-succeeded":
			if (action.generation !== state.generation) return state;
			if (state.phase !== "saving") return state;
			return {
				...state,
				phase: "success",
				savedKeys: action.savedKeys,
				error: null,
			};

		case "save-failed": {
			if (action.generation !== state.generation) return state;
			if (state.phase !== "saving") return state;
			// Keep the user's input either way; the difference is whether retrying
			// the same payload is safe or must be reconciled against the server.
			return {
				...state,
				phase: "error",
				// Freezing again from the drafts that were actually sent.
				drafts: state.frozenDrafts.length > 0 ? state.frozenDrafts : state.drafts,
				error: action.message,
				outcomeUnknown: action.kind === "unknown",
			};
		}

		case "retry":
			if (state.phase !== "error") return state;
			if (state.outcomeUnknown) return state;
			return {
				...state,
				phase: state.previousPhase ?? "review",
				error: null,
			};

		case "context-changed":
			return clearWork(
				{ ...state, context: action.context },
				state.generation + 1,
			);

		case "reset":
			return clearWork(state, state.generation + 1);

		default:
			return state;
	}
}

/**
 * Synchronous single-flight guard.
 *
 * React state updates are asynchronous, so two taps in the same tick can both
 * observe `submitting === false`. This lock is flipped synchronously before any
 * await, which is what actually prevents a double submission.
 */
export type SubmitLock = {
	tryAcquire(): boolean;
	release(): void;
	isLocked(): boolean;
};

export function createSubmitLock(): SubmitLock {
	let locked = false;
	return {
		tryAcquire() {
			if (locked) return false;
			locked = true;
			return true;
		},
		release() {
			locked = false;
		},
		isLocked() {
			return locked;
		},
	};
}

/**
 * Runs `task` under the lock; returns undefined when the lock is already held so
 * callers can bail out without duplicating work.
 */
export async function withSubmitLock<T>(
	lock: SubmitLock,
	task: () => Promise<T>,
): Promise<T | undefined> {
	if (!lock.tryAcquire()) return undefined;
	try {
		return await task();
	} finally {
		lock.release();
	}
}
