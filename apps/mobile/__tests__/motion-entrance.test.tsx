import { useEffect } from "react";
import { render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";

import {
	ENTRANCE_DURATION_MS,
	ENTRANCE_STAGGER_MS,
	ENTRANCE_TRANSLATE_Y,
	PAGE_ENTRANCE_DIRECTION,
	PAGE_ENTRANCE_TRANSLATE_X,
	PageEntrance,
	StaggeredEntrance,
	StaggeredStack,
	getEntranceDelay,
	getEntranceInitialStyle,
	getEntranceTimingConfig,
	getPageEntranceInitialStyle,
	getPageEntranceTimingConfig,
} from "../src/components/motion";

describe("staggered entrance motion config", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("uses lightweight fade and slide-up timing with native driver", () => {
		expect(ENTRANCE_DURATION_MS).toBeGreaterThanOrEqual(250);
		expect(ENTRANCE_DURATION_MS).toBeLessThanOrEqual(300);
		expect(ENTRANCE_STAGGER_MS).toBe(50);
		expect(ENTRANCE_TRANSLATE_Y).toBe(15);

		const config = getEntranceTimingConfig(3);
		expect(config.duration).toBe(ENTRANCE_DURATION_MS);
		expect(config.delay).toBe(150);
		expect(config.toValue).toBe(1);
		expect(config.useNativeDriver).toBe(true);
		expect(typeof config.easing).toBe("function");
	});

	it("provides reduced-motion styles that skip movement", () => {
		expect(getEntranceDelay(-1)).toBe(0);

		const animatedStyle = StyleSheet.flatten(getEntranceInitialStyle(false));
		const reducedStyle = StyleSheet.flatten(getEntranceInitialStyle(true));

		expect(animatedStyle.opacity).toBe(0);
		expect(animatedStyle.transform).toEqual([{ translateY: 15 }]);
		expect(reducedStyle.opacity).toBe(1);
		expect(reducedStyle.transform).toEqual([{ translateY: 0 }]);
	});

	it("does not start staggered timing while reduced-motion preference is pending", () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockReturnValue(new Promise<boolean>(() => {}));
		jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({
			remove: jest.fn(),
		} as never);
		const timingSpy = jest.spyOn(Animated, "timing");

		render(
			<StaggeredEntrance index={0}>
				<Text>Pending</Text>
			</StaggeredEntrance>,
		);

		expect(timingSpy).not.toHaveBeenCalled();
	});


	it("throws for signatureless stack children so routes must provide stable section keys", () => {
		expect(() =>
			render(
				<StaggeredStack testIDPrefix="strict-stack" reduceMotionOverride>
					<View style={{ padding: 1 }} />
				</StaggeredStack>,
			),
		).toThrow(/needs a stable key/);
	});

	it("keeps stable children mounted when a conditional item is inserted", () => {
		const mountCounts: Record<string, number> = { stable: 0, after: 0, inserted: 0 };
		function Probe({ id, testID }: { id: string; testID: string }) {
			useEffect(() => {
				mountCounts[id] += 1;
			}, [id]);

			return <Text testID={testID}>{id}</Text>;
		}

		const screen = render(
			<StaggeredStack testIDPrefix="stable-stack" reduceMotionOverride>
				<Probe id="stable" testID="stable-section" />
				<Probe id="after" testID="after-section" />
			</StaggeredStack>,
		);

		screen.rerender(
			<StaggeredStack testIDPrefix="stable-stack" reduceMotionOverride>
				<Probe id="inserted" testID="inserted-section" />
				<Probe id="stable" testID="stable-section" />
				<Probe id="after" testID="after-section" />
			</StaggeredStack>,
		);

		expect(mountCounts.inserted).toBe(1);
		expect(mountCounts.stable).toBe(1);
		expect(mountCounts.after).toBe(1);
	});


	it("does not replay stable child timing when a conditional item changes indices", () => {
		function Probe({ id, testID }: { id: string; testID: string }) {
			return <Text testID={testID}>{id}</Text>;
		}
		const timingSpy = jest.spyOn(Animated, "timing").mockReturnValue({
			start: jest.fn(),
			stop: jest.fn(),
			reset: jest.fn(),
		} as never);

		const screen = render(
			<StaggeredStack testIDPrefix="stable-timing" reduceMotionOverride={false}>
				<Probe id="stable" testID="stable-timing-section" />
				<Probe id="after" testID="after-timing-section" />
			</StaggeredStack>,
		);

		expect(timingSpy).toHaveBeenCalledTimes(2);

		screen.rerender(
			<StaggeredStack testIDPrefix="stable-timing" reduceMotionOverride={false}>
				<Probe id="inserted" testID="inserted-timing-section" />
				<Probe id="stable" testID="stable-timing-section" />
				<Probe id="after" testID="after-timing-section" />
			</StaggeredStack>,
		);

		expect(timingSpy).toHaveBeenCalledTimes(3);
	});

	it("does not start timing when reduced motion resolves true", async () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockResolvedValue(true);
		jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({
			remove: jest.fn(),
		} as never);
		const timingSpy = jest.spyOn(Animated, "timing");

		render(
			<StaggeredEntrance index={1}>
				<Text>Reduced</Text>
			</StaggeredEntrance>,
		);

		await waitFor(() =>
			expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled(),
		);
		expect(timingSpy).not.toHaveBeenCalled();
	});
});

describe("page entrance motion config", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("uses a fast slide-from-right page entrance with native driver", () => {
		expect(PAGE_ENTRANCE_DIRECTION).toBe("slide_from_right");
		expect(PAGE_ENTRANCE_TRANSLATE_X).toBeGreaterThan(0);
		expect(ENTRANCE_DURATION_MS).toBeGreaterThanOrEqual(250);
		expect(ENTRANCE_DURATION_MS).toBeLessThanOrEqual(300);

		const config = getPageEntranceTimingConfig();
		expect(config.duration).toBe(ENTRANCE_DURATION_MS);
		expect(config.delay).toBe(0);
		expect(config.toValue).toBe(1);
		expect(config.useNativeDriver).toBe(true);

		const animatedStyle = StyleSheet.flatten(getPageEntranceInitialStyle(false));
		const reducedStyle = StyleSheet.flatten(getPageEntranceInitialStyle(true));
		expect(animatedStyle.transform).toEqual([{ translateX: 24 }]);
		expect(reducedStyle.transform).toEqual([{ translateX: 0 }]);
	});

	it("does not start page timing while reduced-motion preference is pending", () => {
		jest
			.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockReturnValue(new Promise<boolean>(() => {}));
		jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({
			remove: jest.fn(),
		} as never);
		const timingSpy = jest.spyOn(Animated, "timing");

		render(
			<PageEntrance>
				<Text>Page</Text>
			</PageEntrance>,
		);

		expect(timingSpy).not.toHaveBeenCalled();
	});
});
