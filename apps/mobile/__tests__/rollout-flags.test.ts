declare const __dirname: string;

// `fs`/`path` are read through jest so the file needs no @types/node, matching
// the source-assertion style already used in this package.
const fs = jest.requireActual<{
	readFileSync: (filePath: string, encoding: string) => string;
	writeFileSync: (filePath: string, data: string) => void;
	mkdtempSync: (prefix: string) => string;
	rmSync: (
		filePath: string,
		options?: { recursive?: boolean; force?: boolean },
	) => void;
}>("fs");
const path = jest.requireActual<{
	join: (...segments: string[]) => string;
}>("path");
const os = jest.requireActual<{
	tmpdir: () => string;
}>("os");

type RolloutSourceValue = string | boolean | undefined | null;
type ResolveRolloutFlagOptions = {
	envKey?: string;
	configKey?: string;
	env?: Record<string, RolloutSourceValue>;
	envFile?: Record<string, RolloutSourceValue>;
	config?: Record<string, RolloutSourceValue>;
};

const {
	ROLLOUT_FLAG_ENV_KEYS,
	ROLLOUT_CONFIG_PATH,
	stripRolloutFlagsFromEnv,
	readRolloutConfig,
	resolveRolloutFlagValue,
} = jest.requireActual<{
	ROLLOUT_FLAG_ENV_KEYS: string[];
	ROLLOUT_CONFIG_PATH: string;
	stripRolloutFlagsFromEnv: (
		env: Record<string, string | undefined> | undefined,
	) => Record<string, string | undefined>;
	readRolloutConfig: (
		filePath?: string,
	) => Record<string, RolloutSourceValue>;
	resolveRolloutFlagValue: (
		flagOrOptions: string | ResolveRolloutFlagOptions,
		overrides?: ResolveRolloutFlagOptions,
	) => string;
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

	it("resolves every rollout flag through the shared resolver", () => {
		const configBody = extractFunctionBody(source, "publicRuntimeConfigBlock");

		expect(configBody).toContain("resolveRolloutFlagValue");

		for (const key of DOCUMENTED_ROLLOUT_FLAG_KEYS) {
			expect(configBody).toContain(key);
		}
	});

	it("reads the committed rollout config once per deploy run", () => {
		const configBody = extractFunctionBody(source, "publicRuntimeConfigBlock");

		expect(configBody).toContain("readRolloutConfig(");
	});
});

const RESOLVE_ENV_KEY = "EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION";
const RESOLVE_CONFIG_KEY = "simpleNavigation";

describe("resolveRolloutFlagValue precedence", () => {
	it("resolves process.env over .env over rollout config over ''", () => {
		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				env: { [RESOLVE_ENV_KEY]: "from-env" },
				envFile: { [RESOLVE_ENV_KEY]: "from-env-file" },
				config: { [RESOLVE_CONFIG_KEY]: "from-config" },
			}),
		).toBe("from-env");

		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				env: {},
				envFile: { [RESOLVE_ENV_KEY]: "from-env-file" },
				config: { [RESOLVE_CONFIG_KEY]: "from-config" },
			}),
		).toBe("from-env-file");

		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				env: {},
				envFile: {},
				config: { [RESOLVE_CONFIG_KEY]: "from-config" },
			}),
		).toBe("from-config");

		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				env: {},
				envFile: {},
				config: {},
			}),
		).toBe("");
	});

	it("keeps looking down the chain when a higher source is empty", () => {
		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				env: { [RESOLVE_ENV_KEY]: "" },
				envFile: { [RESOLVE_ENV_KEY]: "from-env-file" },
				config: { [RESOLVE_CONFIG_KEY]: "from-config" },
			}),
		).toBe("from-env-file");
	});

	it("accepts the camelCase flag name and derives the env key", () => {
		expect(
			resolveRolloutFlagValue("simpleNavigation", {
				config: { simpleNavigation: true },
			}),
		).toBe("true");
	});
});

describe("resolveRolloutFlagValue coercion", () => {
	it("coerces boolean rollout-config values to 'true'/'false' strings", () => {
		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				config: { [RESOLVE_CONFIG_KEY]: true },
			}),
		).toBe("true");
		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				config: { [RESOLVE_CONFIG_KEY]: false },
			}),
		).toBe("false");
	});

	it("returns '' for undefined/null and never 'undefined'/'null'", () => {
		const fromUndefined = resolveRolloutFlagValue({
			envKey: RESOLVE_ENV_KEY,
			configKey: RESOLVE_CONFIG_KEY,
			config: { [RESOLVE_CONFIG_KEY]: undefined },
		});
		const fromNull = resolveRolloutFlagValue({
			envKey: RESOLVE_ENV_KEY,
			configKey: RESOLVE_CONFIG_KEY,
			config: { [RESOLVE_CONFIG_KEY]: null },
		});

		expect(fromUndefined).toBe("");
		expect(fromNull).toBe("");
		expect(fromUndefined).not.toBe("undefined");
		expect(fromNull).not.toBe("null");
	});

	it("coerces boolean env values to strings as well", () => {
		expect(
			resolveRolloutFlagValue({
				envKey: RESOLVE_ENV_KEY,
				configKey: RESOLVE_CONFIG_KEY,
				env: { [RESOLVE_ENV_KEY]: true },
			}),
		).toBe("true");
	});
});

describe("readRolloutConfig", () => {
	it("points at the committed apps/mobile rollout config", () => {
		expect(ROLLOUT_CONFIG_PATH.replace(/\\/g, "/")).toMatch(
			/apps\/mobile\/rollout-flags\.json$/,
		);
	});

	it("returns {} when the config file is missing", () => {
		const missing = path.join(os.tmpdir(), "kaswise-missing-rollout-flags.json");

		expect(readRolloutConfig(missing)).toEqual({});
	});

	it("returns {} for invalid JSON and never throws", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kaswise-rollout-"));
		const file = path.join(dir, "rollout-flags.json");
		fs.writeFileSync(file, "{ not: valid json");

		expect(() => readRolloutConfig(file)).not.toThrow();
		expect(readRolloutConfig(file)).toEqual({});

		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("parses a valid config file into a plain object", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kaswise-rollout-"));
		const file = path.join(dir, "rollout-flags.json");
		fs.writeFileSync(file, '{"simpleNavigation": true}');

		expect(readRolloutConfig(file)).toEqual({ simpleNavigation: true });

		fs.rmSync(dir, { recursive: true, force: true });
	});
});
