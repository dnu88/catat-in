import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

// This script is ESM; the roll-out flag helper is plain CommonJS so both Node
// and Jest can load it directly.
const require = createRequire(import.meta.url)
const {
  stripRolloutFlagsFromEnv,
  readRolloutConfig,
  resolveRolloutFlagValue,
} = require('./rollout-flags.cjs')

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const repoDir = resolve(appDir, '..', '..')
const distDir = join(appDir, 'dist')
const targetDir = process.env.KASWISE_PWA_TARGET || '/home/Danu88/nginx-proxy-manager/placeholder'
const targetIndex = join(targetDir, 'index.html')
const distIndex = join(distDir, 'index.html')
const marker = '    <!-- Inject Expo config & Supabase env sebelum bundle dimuat -->'
const metaMarker = '    <meta charset="utf-8"'
const manifestLink = '<link rel="manifest" href="/manifest.json" />'
const appleTouchIconLink = '<link rel="apple-touch-icon" href="/assets/icon.png" />'
const allowedBranchPatterns = [/^main$/, /^production$/, /^release\//]
const currentBranch = git('branch --show-current').trim() || '(detached)'
const spaRoutes = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'auth/callback',
  'help',
  'terms',
  'privacy',
  'contact',
  'account-deletion',
  'notifications',
  'upgrade',
  'transactions',
  'transaction-new',
  'capture',
  'wallets',
  'budgets',
  'bills',
  'reports',
  'groups',
  'imports',
  'settings',
]

function git(args) {
  return execSync(`git ${args}`, { cwd: repoDir, encoding: 'utf8' })
}

function run(command, options = {}) {
  execSync(command, {
    cwd: appDir,
    stdio: 'inherit',
    ...options,
  })
}

function assertAllowedBranch() {
  if (allowedBranchPatterns.some((pattern) => pattern.test(currentBranch))) return

  if (process.env.ALLOW_NON_PROD_BRANCH === '1') {
    console.warn(`⚠️  ALLOW_NON_PROD_BRANCH=1 — deploying from non-production branch: ${currentBranch}`)
    return
  }

  console.error(`❌ Refusing production deploy from branch: ${currentBranch}`)
  console.error('Allowed branches: main, production, release/*')
  console.error('For an explicit emergency deploy, rerun with:')
  console.error('  ALLOW_NON_PROD_BRANCH=1 pnpm --filter mobile deploy:pwa')
  process.exit(1)
}

function assertDistExists() {
  if (!existsSync(distIndex)) {
    throw new Error(`Missing ${distIndex}. Run "pnpm --filter mobile export:pwa" first.`)
  }
}

function runLiveQualityGate() {
  if (process.env.SKIP_LIVE_QUALITY === '1') {
    console.warn('⚠️  SKIP_LIVE_QUALITY=1 — skipping live quality gate before deploy')
    return
  }

  console.log('🛡️  Running live quality gate before deploy...')
  // The gate validates SOURCE, not the rolled-out flag state. Rollout flags are a
  // deployment concern (injected into the deployed HTML below), so they must not
  // leak into the gate's env and flip the app into the rolled-out mode mid-gate.
  run('pnpm quality:live', { env: stripRolloutFlagsFromEnv(process.env) })
}

function verifyTargetBundleMarkers() {
  console.log('🛡️  Verifying deployed target bundle markers...')
  run('node scripts/check-bundle-markers.mjs', {
    env: {
      ...process.env,
      KASWISE_BUNDLE_DIR: join(targetDir, '_expo', 'static', 'js', 'web'),
    },
  })
}

function verifyLiveUrl() {
  if (process.env.SKIP_LIVE_URL_VERIFY === '1') {
    console.warn('⚠️  SKIP_LIVE_URL_VERIFY=1 — skipping live URL verification')
    return
  }

  console.log('🌐 Verifying live URL bundle and markers...')
  run('node scripts/verify-live-url.mjs')
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        const key = line.slice(0, index).trim()
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
        return [key, value]
      }),
  )
}

function readExpoConfig() {
  const appJson = JSON.parse(readFileSync(join(appDir, 'app.json'), 'utf8'))
  return appJson.expo ?? appJson
}

function installManifest(expoConfig) {
  const webConfig = expoConfig.web ?? {}
  return {
    name: webConfig.name || expoConfig.name || 'Kaswise',
    short_name: webConfig.shortName || webConfig.name || expoConfig.name || 'Kaswise',
    description: webConfig.description || 'Aplikasi keuangan pribadi yang cerdas',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: expoConfig.orientation || 'portrait',
    background_color: webConfig.backgroundColor || '#EAF1FF',
    theme_color: webConfig.themeColor || '#4A80F0',
    icons: [
      {
        src: '/assets/icon.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/assets/favicon.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}

function withInstallMetadata(indexHtml) {
	let nextHtml = indexHtml
	if (!nextHtml.includes(manifestLink)) {
		nextHtml = nextHtml.replace('</head>', `${manifestLink}
${appleTouchIconLink}</head>`)
	}
	return nextHtml
}

function withViewportLock(indexHtml) {
	const locked = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no'
	if (indexHtml.includes('user-scalable=no')) return indexHtml
	return indexHtml.replace(
		/<meta name="viewport" content="[^"]+" \/>/,
		`<meta name="viewport" content="${locked}" />`,
	)
}

/**
 * Build the runtime config `<script>` injected into the deployed `index.html`.
 *
 * Every input is injectable (`{ env, envFile, config, expoConfig }` mirroring the
 * operator env, the local `.env`, the committed rollout config and the Expo
 * config) so the emitted block can be asserted without running a real deploy.
 * The defaults read the real sources, so the CLI path is unchanged.
 *
 * @param {{
 *   env?: Record<string, unknown>,
 *   envFile?: Record<string, unknown>,
 *   config?: Record<string, unknown>,
 *   expoConfig?: Record<string, unknown>,
 *   supabaseUrl?: string,
 *   supabaseAnonKey?: string,
 * }} [injected]
 * @returns {string}
 */
export function publicRuntimeConfigBlock(injected = {}) {
  const expoConfig = injected.expoConfig ?? readExpoConfig()
  const env = injected.envFile ?? readEnvFile(join(appDir, '.env'))
  const extra = expoConfig.extra ?? {}
  const supabaseUrl =
    injected.supabaseUrl ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.supabaseUrl ||
    extra.EXPO_PUBLIC_SUPABASE_URL ||
    env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    injected.supabaseAnonKey ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabaseAnonKey ||
    extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  // Rollout flags are a DEPLOYMENT concern. Each one resolves with the
  // precedence: operator env var → local .env file → committed rollout config
  // (apps/mobile/rollout-flags.json) → ''. The final '' keeps the code-level
  // default in src/config/features.ts authoritative for dev/test.
  const rolloutEnv = injected.env ?? {
    EXPO_PUBLIC_FEATURE_VOICE_NOTE: process.env.EXPO_PUBLIC_FEATURE_VOICE_NOTE,
    EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION: process.env.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION,
    EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT: process.env.EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT,
    EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2: process.env.EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2,
    EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT: process.env.EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT,
    EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE: process.env.EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE,
  }
  const rolloutConfig = injected.config ?? readRolloutConfig()
  const voiceNoteFeature = resolveRolloutFlagValue({
    envKey: 'EXPO_PUBLIC_FEATURE_VOICE_NOTE',
    configKey: 'voiceNote',
    env: rolloutEnv,
    envFile: env,
    config: rolloutConfig,
  })
  const simpleNavigationFeature = resolveRolloutFlagValue({
    envKey: 'EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION',
    configKey: 'simpleNavigation',
    env: rolloutEnv,
    envFile: env,
    config: rolloutConfig,
  })
  const importStatementFeature = resolveRolloutFlagValue({
    envKey: 'EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT',
    configKey: 'importStatement',
    env: rolloutEnv,
    envFile: env,
    config: rolloutConfig,
  })
  const transactionEntryV2Feature = resolveRolloutFlagValue({
    envKey: 'EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2',
    configKey: 'transactionEntryV2',
    env: rolloutEnv,
    envFile: env,
    config: rolloutConfig,
  })
  const aiAutoSaveTextFeature = resolveRolloutFlagValue({
    envKey: 'EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT',
    configKey: 'aiAutosaveText',
    env: rolloutEnv,
    envFile: env,
    config: rolloutConfig,
  })
  const simplePremiumExperienceFeature = resolveRolloutFlagValue({
    envKey: 'EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE',
    configKey: 'simplePremiumExperience',
    env: rolloutEnv,
    envFile: env,
    config: rolloutConfig,
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing public Supabase config for PWA deploy')
  }

  const manifest = {
    name: expoConfig.name,
    slug: expoConfig.slug,
    version: expoConfig.version,
    extra: {
      supabaseUrl,
      supabaseAnonKey,
    },
  }

  return `${marker}\n    <script>\n      var process = window.process = window.process || {};\n      process.env = process.env || {};\n      process.env.NODE_ENV = "production";\n      process.env.EXPO_PUBLIC_SUPABASE_URL = ${JSON.stringify(supabaseUrl)};\n      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};\n      process.env.EXPO_PUBLIC_FEATURE_VOICE_NOTE = ${JSON.stringify(voiceNoteFeature)};\n      process.env.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION = ${JSON.stringify(simpleNavigationFeature)};\n      process.env.EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT = ${JSON.stringify(importStatementFeature)};\n      process.env.EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2 = ${JSON.stringify(transactionEntryV2Feature)};\n      process.env.EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT = ${JSON.stringify(aiAutoSaveTextFeature)};\n      process.env.EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE = ${JSON.stringify(simplePremiumExperienceFeature)};\n      process.env.APP_MANIFEST = ${JSON.stringify(JSON.stringify(manifest))};\n    </script>\n`
}

function deployDistToTarget() {
  const expoConfig = readExpoConfig()
  let indexHtml = readFileSync(distIndex, 'utf8')
  if (!indexHtml.includes(marker)) {
    indexHtml = indexHtml.replace(metaMarker, `${publicRuntimeConfigBlock()}${metaMarker}`)
  }

  indexHtml = withInstallMetadata(indexHtml)
  indexHtml = withViewportLock(indexHtml)

  mkdirSync(targetDir, { recursive: true })
  writeFileSync(targetIndex, indexHtml)
  writeFileSync(join(targetDir, 'manifest.json'), `${JSON.stringify(installManifest(expoConfig), null, 2)}\n`)

  for (const name of ['metadata.json', 'favicon.ico']) {
    const source = join(distDir, name)
    if (existsSync(source)) cpSync(source, join(targetDir, name))
  }

  for (const name of ['_expo', 'assets']) {
    const source = join(distDir, name)
    if (existsSync(source)) cpSync(source, join(targetDir, name), { recursive: true })
  }

  for (const route of spaRoutes) {
    const routeDir = join(targetDir, route)
    mkdirSync(routeDir, { recursive: true })
    writeFileSync(join(routeDir, 'index.html'), indexHtml)
  }

  const sourceAssetsDir = join(appDir, 'assets')
  const targetAssetsDir = join(targetDir, 'assets')
  mkdirSync(targetAssetsDir, { recursive: true })
  for (const name of ['icon.png', 'adaptive-icon.png', 'favicon.png']) {
    const source = join(sourceAssetsDir, name)
    if (existsSync(source)) cpSync(source, join(targetAssetsDir, name))
  }

  const safeServerSource = join(repoDir, 'ops', 'pwa', 'server.py')
  if (existsSync(safeServerSource)) cpSync(safeServerSource, join(targetDir, 'server.py'))

  console.log(`Deployed mobile PWA dist to ${targetDir}`)
}

let deployStarted = false

// The full deploy sequence, in order. Exported so the rollout-config tests can
// prove that importing this module never starts it.
export function runDeploy() {
  deployStarted = true
  assertAllowedBranch()
  runLiveQualityGate()
  assertDistExists()
  deployDistToTarget()
  verifyTargetBundleMarkers()

  try {
    console.log('📊 Generating marker diff report (non-blocking)...')
    run('node scripts/marker-diff-report.mjs')
  } catch {
    console.warn('⚠️  Marker diff report failed (non-blocking) — review before merging')
  }
  verifyLiveUrl()
  run('node scripts/generate-release-report.mjs')
  console.log('✅  Deploy completed with live regression guards')
}

export function isDeployStarted() {
  return deployStarted
}

// Only the real CLI entry point (`node scripts/deploy-pwa.mjs`) deploys.
// Importing this module — from tests or from other tooling — must have no side
// effects: `assertAllowedBranch()` would exit the importing process and
// `runLiveQualityGate()` would run the whole pre-deploy gate inside it.
const isEntryPoint =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isEntryPoint && process.env.KASWISE_DEPLOY_PWA_TEST !== '1') {
  runDeploy()
}
