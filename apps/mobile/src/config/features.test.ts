type FeatureFlagsGlobal = typeof globalThis & {
	__KASWISE_FEATURE_FLAGS__?: {
		simpleNavigation?: boolean;
		simplePremiumExperience?: boolean;
	};
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

describe("featureFlags — simplePremiumExperience (redesign gate, default OFF)", () => {
	const premiumEnvKey = "EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE";
	let originalPremiumEnvValue: string | undefined;
	let originalOverrides: PropertyDescriptor | undefined;

	beforeEach(() => {
		originalPremiumEnvValue = process.env[premiumEnvKey];
		originalOverrides = Object.getOwnPropertyDescriptor(
			flagsGlobal,
			"__KASWISE_FEATURE_FLAGS__",
		);
		delete process.env[premiumEnvKey];
		delete flagsGlobal.__KASWISE_FEATURE_FLAGS__;
	});

	afterEach(() => {
		if (originalPremiumEnvValue === undefined) {
			delete process.env[premiumEnvKey];
		} else {
			process.env[premiumEnvKey] = originalPremiumEnvValue;
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

	it("keeps the redesigned experience off by default", () => {
		expect(loadFeatureFlags().simplePremiumExperience).toBe(false);
	});

	it("allows tests, previews and canaries to override the redesign", () => {
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = {
			simplePremiumExperience: true,
		};

		expect(loadFeatureFlags().simplePremiumExperience).toBe(true);
	});

	it.each(["1", "true", "yes", "on", " TRUE "])(
		"enables the redesign through environment value %p",
		(value) => {
			process.env[premiumEnvKey] = value;

			expect(loadFeatureFlags().simplePremiumExperience).toBe(true);
		},
	);

	it("honors an explicit false override when the environment enables the redesign", () => {
		process.env[premiumEnvKey] = "1";
		flagsGlobal.__KASWISE_FEATURE_FLAGS__ = {
			simplePremiumExperience: false,
		};

		expect(loadFeatureFlags().simplePremiumExperience).toBe(false);
	});

	it("stays independent from the existing rollout flags", () => {
		const flags = loadFeatureFlags();

		expect(flags.simplePremiumExperience).toBe(false);
		expect(flags.simpleNavigation).toBe(false);
		expect(flags.transactionEntryV2).toBe(false);
		expect(flags.aiAutosaveText).toBe(false);
		expect(flags.voiceNote).toBe(false);
		expect(flags.importStatement).toBe(false);
	});
});

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
