import AsyncStorage from "@react-native-async-storage/async-storage";

import {
	firstUseGuideStorageKey,
	markFirstUseReportsVisited,
	readFirstUseGuideState,
	saveFirstUseGuideState,
} from "./first-use-guide";

describe("first-use guide persistence", () => {
	beforeEach(() => {
		jest.mocked(AsyncStorage.getItem).mockReset();
		jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
		jest.mocked(AsyncStorage.setItem).mockClear();
	});

	it("builds a user-scoped storage key", () => {
		expect(firstUseGuideStorageKey("user-1")).toBe(
			"first-use-guide:v1:user-1",
		);
	});

	it("reads invalid or missing guide state as empty", async () => {
		jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce("not-json");

		await expect(readFirstUseGuideState("user-1")).resolves.toEqual({});
	});

	it("merges and saves guide state with an update timestamp", async () => {
		jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
			JSON.stringify({ reportsVisited: true, lastStep: 2, ignored: true }),
		);

		const saved = await saveFirstUseGuideState("user-1", { dismissed: true });

		expect(saved).toMatchObject({
			dismissed: true,
			reportsVisited: true,
			lastStep: 2,
		});
		expect(saved.updatedAt).toEqual(expect.any(String));
		expect(AsyncStorage.setItem).toHaveBeenCalledWith(
			"first-use-guide:v1:user-1",
			expect.stringContaining('"dismissed":true'),
		);
	});

	it("marks reports as visited", async () => {
		await markFirstUseReportsVisited("user-1");

		expect(AsyncStorage.setItem).toHaveBeenCalledWith(
			"first-use-guide:v1:user-1",
			expect.stringContaining('"reportsVisited":true'),
		);
	});
});
