declare const __dirname: string;

// `fs`/`path` are read through jest so the file needs no @types/node, matching
// the source-assertion style already used in this package.
const fs = jest.requireActual<{
	readFileSync: (filePath: string, encoding: string) => string;
}>("fs");
const path = jest.requireActual<{
	join: (...segments: string[]) => string;
}>("path");

const { ROLLOUT_FLAG_ENV_KEYS, stripRolloutFlagsFromEnv } = jest.requireActual<{
	ROLLOUT_FLAG_ENV_KEYS: string[];
	stripRolloutFlagsFromEnv: (
		env: Record<string, string | undefined> | undefined,
	) => Record<string, string | undefined>;
}>("../scripts/rollout-flags.cjs");

const mobileRoot = path.join(__dirname, "..");
const deployScriptPath = path.join(mobileRoot, "scripts", "deploy-pwa.mjs");

const DOCUMENTED_ROLLOUT_FLAG_KEYS = [
	"EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION",
	"EXPO_PUBLIC_FEATURE_VOICE_NOTE",
	"EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT",
];

// Slice a top-level `function name(...) { ... }` body out of a source file so
// assertions can be scoped to that function instead of the whole file.
function extractFunctionBody(source: string, name: string): string {
	const startMatch = source.match(
		new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`),
	);
	if (!startMatch || startMatch.index === undefined) {
		throw new Error(`Could not find function ${name} in source`);
	}
	const start = startMatch.index + startMatch[0].length;
	const end = source.indexOf("\n}", start);
	if (end === -1) {
		throw new Error(`Could not find end of function ${name} in source`);
	}
	return source.slice(start, end);
}

describe("rollout-flags helper", () => {
	it("documents exactly the three rollout flag keys", () => {
		expect([...ROLLOUT_FLAG_ENV_KEYS].sort()).toEqual(
			[...DOCUMENTED_ROLLOUT_FLAG_KEYS].sort(),
		);
		expect(ROLLOUT_FLAG_ENV_KEYS).toHaveLength(
			DOCUMENTED_ROLLOUT_FLAG_KEYS.length,
		);
	});

	it("strips exactly the rollout keys and returns a new object", () => {
		const env = {
			EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION: "true",
			EXPO_PUBLIC_FEATURE_VOICE_NOTE: "true",
			EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT: "true",
			PATH: "/usr/bin",
		};

		const stripped = stripRolloutFlagsFromEnv(env);

		expect(stripped).not.toBe(env);
		for (const key of ROLLOUT_FLAG_ENV_KEYS) {
			expect(Object.prototype.hasOwnProperty.call(stripped, key)).toBe(false);
		}
		expect(Object.keys(stripped).sort()).toEqual(["PATH"]);
	});

	it("preserves unrelated keys", () => {
		const stripped = stripRolloutFlagsFromEnv({
			EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION: "true",
			PATH: "/usr/bin",
			NODE_ENV: "test",
			EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
		});

		expect(stripped).toEqual({
			PATH: "/usr/bin",
			NODE_ENV: "test",
			EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
		});
	});

	it("does not mutate the input object", () => {
		const env = {
			EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION: "true",
			EXPO_PUBLIC_FEATURE_VOICE_NOTE: "true",
			PATH: "/usr/bin",
		};
		const snapshot = { ...env };

		stripRolloutFlagsFromEnv(env);

		expect(env).toEqual(snapshot);
		expect(env.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION).toBe("true");
	});

	it("tolerates missing keys, undefined values and undefined env", () => {
		expect(() =>
			stripRolloutFlagsFromEnv({ PATH: "/usr/bin" }),
		).not.toThrow();
		expect(stripRolloutFlagsFromEnv({ PATH: "/usr/bin" })).toEqual({
			PATH: "/usr/bin",
		});

		const withUndefined = stripRolloutFlagsFromEnv({
			EXPO_PUBLIC_FEATURE_VOICE_NOTE: undefined,
			PATH: "/usr/bin",
		});
		expect(Object.prototype.hasOwnProperty.call(withUndefined, "EXPO_PUBLIC_FEATURE_VOICE_NOTE")).toBe(
			false,
		);
		expect(() => stripRolloutFlagsFromEnv(undefined)).not.toThrow();
		expect(stripRolloutFlagsFromEnv(undefined)).toEqual({});
	});
});

describe("deploy-pwa pre-deploy gate wiring", () => {
	const source = fs.readFileSync(deployScriptPath, "utf8");

	it("loads the rollout-flags helper", () => {
		expect(source).toContain("./rollout-flags.cjs");
	});

	it("passes a stripped env to the live quality gate", () => {
		const gateBody = extractFunctionBody(source, "runLiveQualityGate");

		expect(gateBody).toContain("stripRolloutFlagsFromEnv(process.env)");
	});

	it("still reads the raw flag for the injected runtime config", () => {
		const configBody = extractFunctionBody(source, "publicRuntimeConfigBlock");

		expect(configBody).toContain(
			"process.env.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION",
		);
	});
});
