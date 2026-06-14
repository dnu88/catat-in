import { Platform } from "react-native";

export type StoreReleaseTrack = "track-a-native-free-only";

export type StoreReleaseConfig = {
  track: StoreReleaseTrack;
  isNativeStoreBuildCandidate: boolean;
  allowNativePremiumPurchase: boolean;
};

export function getStoreReleaseConfig(platformOS: string = Platform.OS): StoreReleaseConfig {
  const isNativeStoreBuildCandidate = platformOS === "ios" || platformOS === "android";

  return {
    track: "track-a-native-free-only",
    isNativeStoreBuildCandidate,
    allowNativePremiumPurchase: !isNativeStoreBuildCandidate,
  };
}
