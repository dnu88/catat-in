'use strict'

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
const ROLLOUT_FLAG_ENV_KEYS = [
  'EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION',
  'EXPO_PUBLIC_FEATURE_VOICE_NOTE',
  'EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT',
]

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

module.exports = { ROLLOUT_FLAG_ENV_KEYS, stripRolloutFlagsFromEnv }
