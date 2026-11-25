import { Platform } from "react-native";

import { isPwaPolish, pwaHeroCaption, pwaMinTouch } from "./pwa-polish";

type FlagGlobal = { __KASWISE_FEATURE_FLAGS__?: { simplePremiumExperience?: boolean } };

function setPremium(value: boolean | undefined) {
	(globalThis as FlagGlobal).__KASWISE_FEATURE_FLAGS__ =
		value === undefined ? undefined : { simplePremiumExperience: value };
}

describe("isPwaPolish", () => {
	afterEach(() => {
		setPremium(undefined);
		jest.restoreAllMocks();
	});

	it("is ON only for premium on web", () => {
		jest.replaceProperty(Platform, "OS", "web");
		setPremium(true);
		expect(isPwaPolish()).toBe(true);
	});

	it("stays OFF on web when the premium flag is OFF", () => {
		jest.replaceProperty(Platform, "OS", "web");
		setPremium(false);
		expect(isPwaPolish()).toBe(false);
	});

	it.each(["ios", "android"] as const)("stays OFF on native (%s) even with premium ON", (os) => {
		jest.replaceProperty(Platform, "OS", os);
		setPremium(true);
		expect(isPwaPolish()).toBe(false);
	});

	it("reads the flag at call time, not at import time", () => {
		jest.replaceProperty(Platform, "OS", "web");
		setPremium(false);
		expect(isPwaPolish()).toBe(false);
		setPremium(true);
		expect(isPwaPolish()).toBe(true);
	});
});

describe("PWA polish tokens", () => {
	it("uses the same hero caption alpha Beranda ships with", () => {
		expect(pwaHeroCaption).toBe("#FFFFFFE6");
	});

	it("keeps the shared 44px touch minimum", () => {
		expect(pwaMinTouch).toBe(44);
	});
});
