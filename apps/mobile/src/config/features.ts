const processEnv = (
	globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

type FeatureOverride = {
	importStatement?: boolean;
	voiceNote?: boolean;
};

function featureOverrides() {
	return (globalThis as { __KASWISE_FEATURE_FLAGS__?: FeatureOverride })
		.__KASWISE_FEATURE_FLAGS__;
}

export function flagEnabled(value: string | undefined) {
	return ["1", "true", "yes", "on"].includes(
		(value ?? "").trim().toLowerCase(),
	);
}

export const featureFlags = {
	get importStatement() {
		return featureOverrides()?.importStatement ?? flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT);
	},
	get voiceNote() {
		return featureOverrides()?.voiceNote ?? flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_VOICE_NOTE);
	},
};
