import { featureFlags } from "./features";

describe("featureFlags", () => {
	afterEach(() => {
		delete (globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__;
	});

	it("keeps simple navigation off by default", () => {
		expect(featureFlags.simpleNavigation).toBe(false);
	});

	it("allows tests and canaries to override simple navigation", () => {
		(globalThis as { __KASWISE_FEATURE_FLAGS__?: { simpleNavigation?: boolean } }).__KASWISE_FEATURE_FLAGS__ = {
			simpleNavigation: true,
		};

		expect(featureFlags.simpleNavigation).toBe(true);
	});
});
