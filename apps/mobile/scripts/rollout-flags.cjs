'use strict'

const fs = require('node:fs')
const path = require('node:path')

// Rollout feature flags are a DEPLOYMENT concern, not a SOURCE concern.
//
// The pre-deploy quality gate (registry check, type-check, Jest live-regression,
// export, bundle check) must validate the committed source. If the gate inherits
// the caller's rollout flags it renders the app in the rolled-out mode and
// flag-dependent assertions fail even though the source is healthy.
//
// `deploy-pwa.mjs` therefore strips these keys from the child env it hands to the
// gate, while still reading the raw values from `process.env` for the runtime
// config block it injects into the deployed HTML.
//
// The deployed value itself resolves with the precedence:
//   process.env → .env file → committed rollout config → ''
// so an operator can always override (and roll back) the committed state from
// the deploy shell, and a deploy that forgets the env var cannot silently flip
// production back to the legacy path.
const ROLLOUT_FLAG_ENV_KEYS = [
  'EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION',
  'EXPO_PUBLIC_FEATURE_VOICE_NOTE',
  'EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT',
  'EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2',
]

// Committed, reviewable rollout state — one file, so a rollout change is a
// one-line diff and a one-line revert. Kept beside the scripts that consume it.
const ROLLOUT_CONFIG_PATH = path.resolve(__dirname, '..', 'rollout-flags.json')

const ROLLOUT_FLAG_ENV_PREFIX = 'EXPO_PUBLIC_FEATURE_'

/**
 * Convert a camelCase flag name into its SNAKE_CASE suffix.
 * `simpleNavigation` → `SIMPLE_NAVIGATION`
 *
 * @param {string} flagName
 * @returns {string}
 */
function flagNameToSnakeCase(flagName) {
  return String(flagName)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
}

/**
 * Convert a SNAKE_CASE env-key suffix into camelCase.
 * `SIMPLE_NAVIGATION` → `simpleNavigation`
 *
 * @param {string} envKey
 * @returns {string}
 */
function envKeyToFlagName(envKey) {
  return String(envKey)
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_match, character) => character.toUpperCase())
}

/**
 * Build the public env key for a camelCase rollout flag name.
 * `simpleNavigation` → `EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION`
 *
 * @param {string} flagName
 * @returns {string}
 */
function envKeyForFlag(flagName) {
  return `${ROLLOUT_FLAG_ENV_PREFIX}${flagNameToSnakeCase(flagName)}`
}

/**
 * Build the camelCase rollout config key for a public env key.
 * `EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION` → `simpleNavigation`
 *
 * @param {string} envKey
 * @returns {string}
 */
function configKeyForEnvKey(envKey) {
  return envKeyToFlagName(String(envKey).slice(ROLLOUT_FLAG_ENV_PREFIX.length))
}

/**
 * Shallow-copy `env` and delete every rollout feature-flag key.
 *
 * Never mutates the input; tolerates `undefined` envs, missing keys and
 * keys present with an `undefined` value.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined> | undefined} env
 * @returns {Record<string, string | undefined>}
 */
function stripRolloutFlagsFromEnv(env) {
  const stripped = { ...(env || {}) }
  for (const key of ROLLOUT_FLAG_ENV_KEYS) {
    delete stripped[key]
  }
  return stripped
}

/**
 * Read the committed rollout config.
 *
 * Never throws: a missing file, an unreadable file or invalid JSON all resolve
 * to `{}` so a deploy can not be blocked (or flipped) by a broken config file.
 *
 * @param {string} [filePath]
 * @returns {Record<string, unknown>}
 */
function readRolloutConfig(filePath = ROLLOUT_CONFIG_PATH) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

/**
 * Normalise a single source value into the string that gets injected into the
 * deployed HTML. Returns `undefined` when the source has no usable value so the
 * caller keeps looking down the precedence chain.
 *
 * @param {unknown} value
 * @returns {string | undefined}
 */
function normalizeRolloutFlagValue(value) {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  const text = String(value).trim()
  return text === '' ? undefined : text
}

/**
 * Resolve a rollout flag with precedence env → .env file → committed config → ''.
 *
 * Accepts either an options object with explicit `envKey` / `configKey`, or a
 * camelCase flag name (whose env/config keys are derived). Always returns a
 * string so the injected `process.env.X = "..."` stays consistent.
 *
 * @param {string | {
 *   envKey?: string,
 *   configKey?: string,
 *   env?: Record<string, unknown>,
 *   envFile?: Record<string, unknown>,
 *   config?: Record<string, unknown>,
 * }} flagOrOptions
 * @param {{ env?: Record<string, unknown>, envFile?: Record<string, unknown>, config?: Record<string, unknown> }} [overrides]
 * @returns {string}
 */
function resolveRolloutFlagValue(flagOrOptions, overrides) {
  const options =
    typeof flagOrOptions === 'string'
      ? {
          envKey: envKeyForFlag(flagOrOptions),
          configKey: flagOrOptions,
          ...(overrides || {}),
        }
      : flagOrOptions || {}

  const envKey =
    options.envKey || (options.configKey ? envKeyForFlag(options.configKey) : undefined)
  const configKey =
    options.configKey || (options.envKey ? configKeyForEnvKey(options.envKey) : undefined)

  const env = options.env || {}
  const envFile = options.envFile || {}
  const config = options.config || {}

  const sources = [
    envKey ? env[envKey] : undefined,
    envKey ? envFile[envKey] : undefined,
    configKey ? config[configKey] : undefined,
  ]

  for (const source of sources) {
    const resolved = normalizeRolloutFlagValue(source)
    if (resolved !== undefined) return resolved
  }

  return ''
}

module.exports = {
  ROLLOUT_FLAG_ENV_KEYS,
  ROLLOUT_CONFIG_PATH,
  stripRolloutFlagsFromEnv,
  readRolloutConfig,
  resolveRolloutFlagValue,
}
