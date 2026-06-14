import { getStoreReleaseConfig } from "../src/config/store-release";

describe("getStoreReleaseConfig", () => {
  it("disables native premium purchase for ios store candidates in Track A", () => {
    expect(getStoreReleaseConfig("ios").allowNativePremiumPurchase).toBe(false);
    expect(getStoreReleaseConfig("ios").isNativeStoreBuildCandidate).toBe(true);
  });

  it("disables native premium purchase for android store candidates in Track A", () => {
    expect(getStoreReleaseConfig("android").allowNativePremiumPurchase).toBe(false);
    expect(getStoreReleaseConfig("android").isNativeStoreBuildCandidate).toBe(true);
  });

  it("keeps premium purchase enabled on web for existing Midtrans flow", () => {
    expect(getStoreReleaseConfig("web").allowNativePremiumPurchase).toBe(true);
    expect(getStoreReleaseConfig("web").isNativeStoreBuildCandidate).toBe(false);
  });
});
