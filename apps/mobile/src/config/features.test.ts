import { Platform } from "react-native";

function withPlatformOs<T>(os: "web" | "ios" | "android", run: () => T): T {
	const original = Object.getOwnPropertyDescriptor(Platform, "OS");
	Object.defineProperty(Platform, "OS", { configurable: true, value: os });
	try {
		return run();
	} finally {
		if (original) {
			Object.defineProperty(Platform, "OS", original);
		} else {
			delete (Platform as unknown as { OS?: string }).OS;
		}
	}
}

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

	it("defaults the redesigned experience ON for web (premium is the default web surface)", () => {
		expect(
			withPlatformOs("web", () => loadFeatureFlags().simplePremiumExperience),
		).toBe(true);
	});

	it("keeps native off by default (native baseline unchanged)", () => {
		expect(
			withPlatformOs("ios", () => loadFeatureFlags().simplePremiumExperience),
		).toBe(false);
		expect(
			withPlatformOs("android", () => loadFeatureFlags().simplePremiumExperience),
		).toBe(false);
	});

	it.each(["0", "false", "no", "off"])(
		"an explicitly present env value %p overrides the web default to OFF",
		(value) => {
			process.env[premiumEnvKey] = value;

			expect(
				withPlatformOs("web", () => loadFeatureFlags().simplePremiumExperience),
			).toBe(false);
		},
	);

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

	it("stays independent from the existing rollout flags (native default)", () => {
		const flags = withPlatformOs("ios", () => loadFeatureFlags());

		expect(flags.simplePremiumExperience).toBe(false);
		expect(flags.simpleNavigation).toBe(false);
		expect(flags.transactionEntryV2).toBe(false);
		expect(flags.aiAutosaveText).toBe(false);
		expect(flags.voiceNote).toBe(false);
		expect(flags.importStatement).toBe(false);
		expect(flags.categoryAiDiscipline).toBe(false);
	});
});

describe("featureFlags — categoryAiDiscipline (AI category gate, default OFF)", () => {
	const disciplineEnvKey = "EXPO_PUBLIC_FEATURE_CATEGORY_AI_DISCIPLINE";
	let originalEnvValue: string | undefined;

	beforeEach(() => {
		originalEnvValue = process.env[disciplineEnvKey];
		delete process.env[disciplineEnvKey];
		delete (globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__;
	});

	afterEach(() => {
		if (originalEnvValue === undefined) {
			delete process.env[disciplineEnvKey];
		} else {
			process.env[disciplineEnvKey] = originalEnvValue;
		}
		delete (globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__;
	});

	it("defaults to OFF without env or override (all platforms)", () => {
		expect(withPlatformOs("ios", () => loadFeatureFlags().categoryAiDiscipline)).toBe(false);
		expect(withPlatformOs("web", () => loadFeatureFlags().categoryAiDiscipline)).toBe(false);
	});

	it("follows the env key when present", () => {
		process.env[disciplineEnvKey] = "1";
		expect(loadFeatureFlags().categoryAiDiscipline).toBe(true);
		process.env[disciplineEnvKey] = "0";
		expect(loadFeatureFlags().categoryAiDiscipline).toBe(false);
	});

	it("runtime override wins over env", () => {
		process.env[disciplineEnvKey] = "1";
		(globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__ = {
			categoryAiDiscipline: false,
		};
		expect(loadFeatureFlags().categoryAiDiscipline).toBe(false);
	});
});

describe("featureFlags — categoryAiDisciplineUsers (allowlist per user)", () => {
	const usersEnvKey = "EXPO_PUBLIC_FEATURE_CATEGORY_AI_DISCIPLINE_USERS";
	let originalEnvValue: string | undefined;

	beforeEach(() => {
		originalEnvValue = process.env[usersEnvKey];
		delete process.env[usersEnvKey];
		delete process.env["EXPO_PUBLIC_FEATURE_CATEGORY_AI_DISCIPLINE"];
		delete (globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__;
	});

	afterEach(() => {
		if (originalEnvValue === undefined) {
			delete process.env[usersEnvKey];
		} else {
			process.env[usersEnvKey] = originalEnvValue;
		}
		delete (globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__;
	});

	it("allowlist kosong + flag global OFF → semua user baseline", () => {
		const flags = loadFeatureFlags();
		expect(flags.isCategoryAiDisciplineUser("aa70df9b-ec18-423c-8f4c-caf86e5567fa")).toBe(false);
	});

	it("user di allowlist aktif walau flag global OFF", () => {
		process.env[usersEnvKey] = "AA70DF9B-EC18-423C-8F4C-CAF86E5567FA";
		const flags = loadFeatureFlags();
		expect(flags.isCategoryAiDisciplineUser("aa70df9b-ec18-423c-8f4c-caf86e5567fa")).toBe(true);
		// user lain tetap baseline.
		expect(flags.isCategoryAiDisciplineUser("11111111-1111-1111-1111-111111111111")).toBe(false);
	});

	it("allowlist menang atas flag global ON (hanya user daftar)", () => {
		process.env[usersEnvKey] = "aa70df9b";
		process.env["EXPO_PUBLIC_FEATURE_CATEGORY_AI_DISCIPLINE"] = "1";
		const flags = loadFeatureFlags();
		expect(flags.isCategoryAiDisciplineUser("aa70df9b-ec18-423c-8f4c-caf86e5567fa")).toBe(true);
		expect(flags.isCategoryAiDisciplineUser("22222222-2222-2222-2222-222222222222")).toBe(false);
	});

	it("allowlist kosong + flag global ON → semua user", () => {
		process.env["EXPO_PUBLIC_FEATURE_CATEGORY_AI_DISCIPLINE"] = "1";
		expect(loadFeatureFlags().isCategoryAiDisciplineUser("22222222-2222-2222-2222-222222222222")).toBe(true);
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
