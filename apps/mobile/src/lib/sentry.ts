import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const isRunningInExpoGo =
  Constants.expoConfig?.extra?.expoGo?.debuggerHost != null;

if (!isRunningInExpoGo) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust in production to reduce volume.
    tracesSampleRate: 1.0,
    // Capture React render errors and React Native crashes
    enableCaptureFailedRequests: true,
    enableNative: true,
  });
}

export { Sentry };
export default Sentry;
