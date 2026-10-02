declare const __dirname: string;
// This package type-checks without @types/node, so Node globals are declared
// locally — same pattern as the other suites that touch `process`.
declare const process: {
	env: Record<string, string | undefined>;
	execPath: string;
};

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
const { execFileSync } = jest.requireActual<{
	execFileSync: (
		file: string,
		args: string[],
		options: {
			cwd: string;
			encoding: "utf8";
			env: Record<string, string | undefined>;
			timeout: number;
		},
	) => string;
}>("node:child_process");

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
const rolloutConfigPath = path.join(mobileRoot, "rollout-flags.json");

const INJECTED_EXPO_CONFIG = {
	name: "Kaswise",
	slug: "kaswise",
	version: "1.0.0",
	orientation: "portrait",
	extra: {},
};

// Hermetic Supabase inputs, so the emitted block never depends on the
// developer's real apps/mobile/.env.
const INJECTED_ENV_FILE = {
	EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
	EXPO_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
};

type ProbeResult = {
	imported: boolean;
	deployStarted: boolean;
	block?: string;
};

// scripts/deploy-pwa.mjs is ESM while this package runs Jest in CommonJS mode,
// so the block builder is exercised through a real child Node process. Importing
// the module there doubles as the import-safety check: it must not fire the
// deploy sequence.
function probeDeployModule(extraProgram: string): ProbeResult {
	const program = [
		`const mod = await import(${JSON.stringify("./scripts/deploy-pwa.mjs")});`,
		"const out = { imported: true, deployStarted: mod.isDeployStarted() };",
		extraProgram,
		"console.log(JSON.stringify(out));",
	].join("\n");

	const stdout = execFileSync(
		process.execPath,
		["--input-type=module", "-e", program],
		{
			cwd: mobileRoot,
			encoding: "utf8",
			// Blank every deploy escape hatch: a broken guard must fail loudly here
			// instead of running the live gate against a real target.
			env: {
				...process.env,
				KASWISE_DEPLOY_PWA_TEST: "1",
				KASWISE_PWA_TARGET: path.join(os.tmpdir(), "kaswise-probe-target"),
				ALLOW_NON_PROD_BRANCH: "",
				SKIP_LIVE_QUALITY: "",
				SKIP_LIVE_URL_VERIFY: "",
			},
			timeout: 120000,
		},
	);

	const lines = stdout.trim().split("\n");
	return JSON.parse(lines[lines.length - 1]) as ProbeResult;
}

// Emit the runtime config block for an injected {env, envFile, config} triple, so
// assertions can inspect the RESOLVED values instead of grepping the source.
function emitRuntimeConfigBlock(injected: Record<string, unknown>): string {
	const probe = probeDeployModule(
		`out.block = mod.publicRuntimeConfigBlock(${JSON.stringify({
			expoConfig: INJECTED_EXPO_CONFIG,
			envFile: INJECTED_ENV_FILE,
			...injected,
		})});`,
	);

	if (typeof probe.block !== "string") {
		throw new Error("publicRuntimeConfigBlock did not return a string");
	}
	return probe.block;
}

function rolloutEnvLine(key: string, value: string): string {
	return `process.env.${key} = ${JSON.stringify(value)};`;
}

// Fixtures live in the OS temp dir — never write rollout configs in the repo.
function withRolloutConfigFile(
	contents: string,
	run: (filePath: string) => void,
): void {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kaswise-rollout-"));
	try {
		const file = path.join(dir, "rollout-flags.json");
		fs.writeFileSync(file, contents);
		run(file);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

const DOCUMENTED_ROLLOUT_FLAG_KEYS = [
	"EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION",
	"EXPO_PUBLIC_FEATURE_VOICE_NOTE",
	"EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT",
	"EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2",
	"EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT",
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
	it("documents exactly the rollout flag keys the deploy injects", () => {
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

});

describe("deploy-pwa runtime config emission", () => {
	it("does not trigger the deploy sequence when the module is imported", () => {
		const probe = probeDeployModule("");

		expect(probe.imported).toBe(true);
		expect(probe.deployStarted).toBe(false);
	});

	it("emits the resolved rollout value for every flag, not a literal", () => {
		const block = emitRuntimeConfigBlock({
			env: {},
			envFile: INJECTED_ENV_FILE,
			config: {
				simpleNavigation: true,
				voiceNote: false,
				importStatement: true,
			},
		});

		expect(block).toContain(
			rolloutEnvLine("EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION", "true"),
		);
		expect(block).toContain(
			rolloutEnvLine("EXPO_PUBLIC_FEATURE_VOICE_NOTE", "false"),
		);
		expect(block).toContain(
			rolloutEnvLine("EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT", "true"),
		);
	});

	it("emits the precedence-resolved value of each source", () => {
		const block = emitRuntimeConfigBlock({
			env: {
				EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION: "from-env",
				EXPO_PUBLIC_FEATURE_VOICE_NOTE: "",
			},
			envFile: {
				...INJECTED_ENV_FILE,
				EXPO_PUBLIC_FEATURE_VOICE_NOTE: "from-env-file",
			},
			config: {
				simpleNavigation: false,
				voiceNote: false,
				importStatement: true,
			},
		});

		expect(block).toContain(
			rolloutEnvLine("EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION", "from-env"),
		);
		expect(block).toContain(
			rolloutEnvLine("EXPO_PUBLIC_FEATURE_VOICE_NOTE", "from-env-file"),
		);
		expect(block).toContain(
			rolloutEnvLine("EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT", "true"),
		);
	});

	it("emits '' when no source defines the flag", () => {
		const block = emitRuntimeConfigBlock({
			env: {},
			envFile: INJECTED_ENV_FILE,
			config: {},
		});

		for (const key of DOCUMENTED_ROLLOUT_FLAG_KEYS) {
			expect(block).toContain(rolloutEnvLine(key, ""));
		}
	});

	it("falls back to the committed rollout config on a real deploy", () => {
		const committed = JSON.parse(
			fs.readFileSync(rolloutConfigPath, "utf8"),
		) as Record<string, RolloutSourceValue>;
		expect(Object.keys(committed).length).toBeGreaterThan(0);

		// No `config` injected: the block must read apps/mobile/rollout-flags.json.
		const block = emitRuntimeConfigBlock({
			env: {},
			supabaseUrl: INJECTED_ENV_FILE.EXPO_PUBLIC_SUPABASE_URL,
			supabaseAnonKey: INJECTED_ENV_FILE.EXPO_PUBLIC_SUPABASE_ANON_KEY,
		});

		for (const key of DOCUMENTED_ROLLOUT_FLAG_KEYS) {
			const expected = resolveRolloutFlagValue({
				envKey: key,
				env: {},
				envFile: {},
				config: committed,
			});
			expect(block).toContain(rolloutEnvLine(key, expected));
		}
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

	it("returns {} for a JSON array instead of the raw array", () => {
		withRolloutConfigFile("[1, 2, 3]", (file) => {
			expect(() => readRolloutConfig(file)).not.toThrow();
			expect(readRolloutConfig(file)).toEqual({});
			expect(Array.isArray(readRolloutConfig(file))).toBe(false);
		});
	});

	it("returns {} for JSON scalars (string, number, boolean, null)", () => {
		for (const scalar of ['"kaswise"', "42", "0", "true", "false", "null"]) {
			withRolloutConfigFile(scalar, (file) => {
				expect(() => readRolloutConfig(file)).not.toThrow();
				expect(readRolloutConfig(file)).toEqual({});
			});
		}
	});

	it("returns {} for an empty or whitespace-only file", () => {
		for (const contents of ["", "\n", "   \n	"]) {
			withRolloutConfigFile(contents, (file) => {
				expect(() => readRolloutConfig(file)).not.toThrow();
				expect(readRolloutConfig(file)).toEqual({});
			});
		}
	});

	it("returns {} when the path is a directory", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kaswise-rollout-"));

		try {
			expect(() => readRolloutConfig(dir)).not.toThrow();
			expect(readRolloutConfig(dir)).toEqual({});
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
