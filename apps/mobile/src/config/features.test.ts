type FeatureFlagsGlobal = typeof globalThis & {
	__KASWISE_FEATURE_FLAGS__?: { simpleNavigation?: boolean };
};

const flagsGlobal = globalThis as FeatureFlagsGlobal;
const envKey = "EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION";

function loadFeatureFlags() {
	let featureFlags!: typeof import("./features").featureFlags;

	// features captures the environment object at import time.
	jest.isolateModules(() => {
		featureFlags = require("./features").featureFlags;
	});

	return featureFlags;
}

describe("featureFlags", () => {
	let originalEnvValue: string | undefined;
	let originalOverrides: PropertyDescriptor | undefined;

	beforeEach(() => {
		originalEnvValue = process.env[envKey];
		originalOverrides = Object.getOwnPropertyDescriptor(
			flagsGlobal,
			"__KASWISE_FEATURE_FLAGS__",
		);
		delete process.env[envKey];
		delete flagsGlobal.__KASWISE_FEATURE_FLAGS__;
	});

	afterEach(() => {
		if (originalEnvValue === undefined) {
			delete process.env[envKey];
		} else {
			process.env[envKey] = originalEnvValue;
		}

		if (originalOverrides) {
			Object.defineProperty(
				flagsGlobal,
				"__KASWISE_FEATURE_FLAGS__",
				originalOverrides,
			);
		} else {
			delete flagsGlobal.__KASWISE_FEATURE_FLAGS__;
		}
	});

	it("keeps simple navigation off by default", () => {
		expect(loadFeatureFlags().simpleNavigation).toBe(false);
	});

	it("allows tests and canaries to override simple navigation", () => {
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { simpleNavigation: true };

		expect(loadFeatureFlags().simpleNavigation).toBe(true);
	});

	it.each(["1", "true", "yes", "on", " TRUE "])(
		"enables simple navigation through environment value %p",
		(value) => {
			process.env[envKey] = value;

			expect(loadFeatureFlags().simpleNavigation).toBe(true);
		},
	);

	it("honors an explicit false override when the environment enables simple navigation", () => {
		process.env[envKey] = "1";
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { simpleNavigation: false };

		expect(loadFeatureFlags().simpleNavigation).toBe(false);
	});
});
