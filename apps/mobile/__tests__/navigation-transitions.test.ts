import {
	PAGE_TRANSITION_DURATION_MS,
	createKaswiseStackScreenOptions,
	kaswisePageTransition,
} from "../src/navigation/transitions";

describe("Kaswise page transitions", () => {
	it("uses a fast slide-from-right stack transition", () => {
		expect(PAGE_TRANSITION_DURATION_MS).toBeGreaterThanOrEqual(250);
		expect(PAGE_TRANSITION_DURATION_MS).toBeLessThanOrEqual(300);
		expect(kaswisePageTransition.animation).toBe("slide_from_right");
		expect(kaswisePageTransition.animationDuration).toBe(
			PAGE_TRANSITION_DURATION_MS,
		);
		expect(kaswisePageTransition.gestureEnabled).toBe(true);
	});

	it("shares transition options with themed root and auth stacks", () => {
		expect(createKaswiseStackScreenOptions("#FAFAFA")).toEqual({
			headerShown: false,
			contentStyle: { backgroundColor: "#FAFAFA" },
			...kaswisePageTransition,
		});
	});
});
