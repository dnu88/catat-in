const processEnv = (
	globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

type FeatureOverride = {
	importStatement?: boolean;
	simpleNavigation?: boolean;
	voiceNote?: boolean;
	transactionEntryV2?: boolean;
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
	get simpleNavigation() {
		return featureOverrides()?.simpleNavigation ?? flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION);
	},
	get voiceNote() {
		return featureOverrides()?.voiceNote ?? flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_VOICE_NOTE);
	},
	/**
	 * Gates the review-first transaction entry flow (editable draft review before
	 * saving). Kept independent from `simpleNavigation` so the entry UI can be
	 * rolled back on its own without reverting navigation.
	 */
	get transactionEntryV2() {
		return (
			featureOverrides()?.transactionEntryV2 ??
			flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2)
		);
	},
};
