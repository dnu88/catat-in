import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	applyAutoSaveOutcome,
	autoSaveUndoRate,
	EMPTY_AUTO_SAVE_METRICS,
	readAutoSaveMetrics,
	recordAutoSaveOutcome,
} from "./auto-save-metrics";

jest.mock("@react-native-async-storage/async-storage", () => ({
	__esModule: true,
	default: {
		getItem: jest.fn(),
		setItem: jest.fn(),
	},
}));

const mockedStorage = AsyncStorage as unknown as {
	getItem: jest.Mock;
	setItem: jest.Mock;
};

beforeEach(() => {
	jest.clearAllMocks();
	mockedStorage.getItem.mockResolvedValue(null);
	mockedStorage.setItem.mockResolvedValue(undefined);
});

describe("auto-save metrics", () => {
	it("counts each outcome without mutating the input", () => {
		const first = applyAutoSaveOutcome(EMPTY_AUTO_SAVE_METRICS, "saved");
		const second = applyAutoSaveOutcome(first, "undone");
		expect(first).toEqual({ saved: 1, undone: 0, edited: 0 });
		expect(second).toEqual({ saved: 1, undone: 1, edited: 0 });
		expect(EMPTY_AUTO_SAVE_METRICS).toEqual({ saved: 0, undone: 0, edited: 0 });
	});

	it("starts from zero when nothing was stored", async () => {
		await expect(readAutoSaveMetrics()).resolves.toEqual({
			saved: 0,
			undone: 0,
			edited: 0,
		});
	});

	it("reads back what it wrote", async () => {
		await recordAutoSaveOutcome("saved");
		const [, written] = mockedStorage.setItem.mock.calls[0];
		mockedStorage.getItem.mockResolvedValue(written);
		await expect(readAutoSaveMetrics()).resolves.toEqual({
			saved: 1,
			undone: 0,
			edited: 0,
		});
	});

	it("accumulates across outcomes", async () => {
		await recordAutoSaveOutcome("saved");
		const first = mockedStorage.setItem.mock.calls[0][1];
		mockedStorage.getItem.mockResolvedValue(first);
		await recordAutoSaveOutcome("edited");
		const second = mockedStorage.setItem.mock.calls[1][1];
		mockedStorage.getItem.mockResolvedValue(second);
		await expect(readAutoSaveMetrics()).resolves.toEqual({
			saved: 1,
			undone: 0,
			edited: 1,
		});
	});

	it("survives corrupt storage instead of throwing", async () => {
		mockedStorage.getItem.mockResolvedValue("{not json");
		await expect(readAutoSaveMetrics()).resolves.toEqual({
			saved: 0,
			undone: 0,
			edited: 0,
		});
	});

	it("never throws when storage write fails", async () => {
		mockedStorage.setItem.mockRejectedValue(new Error("disk full"));
		await expect(recordAutoSaveOutcome("saved")).resolves.toEqual({
			saved: 1,
			undone: 0,
			edited: 0,
		});
	});

	it("computes the undo rate used to tune the threshold", () => {
		expect(autoSaveUndoRate({ saved: 0, undone: 0, edited: 0 })).toBe(0);
		expect(autoSaveUndoRate({ saved: 10, undone: 1, edited: 0 })).toBe(0.1);
		expect(autoSaveUndoRate({ saved: 4, undone: 1, edited: 1 })).toBe(0.5);
	});
});
