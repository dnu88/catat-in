import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local counters for the auto-save experiment. Purely diagnostic: they exist to
 * measure how often an automatic save is undone or edited, which is the signal
 * used to tune the confidence threshold. Nothing here may block the entry flow.
 */
export type AutoSaveOutcome = "saved" | "undone" | "edited";

export type AutoSaveMetrics = {
	saved: number;
	undone: number;
	edited: number;
};

const STORAGE_KEY = "kaswise:auto-save-metrics";

export const EMPTY_AUTO_SAVE_METRICS: AutoSaveMetrics = {
	saved: 0,
	undone: 0,
	edited: 0,
};

/** Pure part, unit-testable without storage. */
export function applyAutoSaveOutcome(
	metrics: AutoSaveMetrics,
	outcome: AutoSaveOutcome,
): AutoSaveMetrics {
	return { ...metrics, [outcome]: metrics[outcome] + 1 };
}

/** Undo rate over automatic saves; 0 when nothing was saved automatically. */
export function autoSaveUndoRate(metrics: AutoSaveMetrics): number {
	if (metrics.saved <= 0) return 0;
	return (metrics.undone + metrics.edited) / metrics.saved;
}

export async function readAutoSaveMetrics(): Promise<AutoSaveMetrics> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...EMPTY_AUTO_SAVE_METRICS };
		const parsed = JSON.parse(raw) as Partial<AutoSaveMetrics>;
		return {
			saved: Number(parsed.saved ?? 0),
			undone: Number(parsed.undone ?? 0),
			edited: Number(parsed.edited ?? 0),
		};
	} catch {
		return { ...EMPTY_AUTO_SAVE_METRICS };
	}
}

export async function recordAutoSaveOutcome(
	outcome: AutoSaveOutcome,
): Promise<AutoSaveMetrics> {
	const next = applyAutoSaveOutcome(await readAutoSaveMetrics(), outcome);
	try {
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Diagnostics only: never surface a storage failure to the user.
	}
	return next;
}
