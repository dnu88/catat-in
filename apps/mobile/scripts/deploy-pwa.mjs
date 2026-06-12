import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

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
  run('pnpm quality:live')
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

function publicRuntimeConfigBlock() {
  const env = readEnvFile(join(appDir, '.env'))
  const extra = readExpoConfig().extra ?? {}
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.supabaseUrl ||
    extra.EXPO_PUBLIC_SUPABASE_URL ||
    env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabaseAnonKey ||
    extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing public Supabase config for PWA deploy')
  }

  const runtimeExpoConfig = readExpoConfig()
  const manifest = {
    name: runtimeExpoConfig.name,
    slug: runtimeExpoConfig.slug,
    version: runtimeExpoConfig.version,
    extra: {
      supabaseUrl,
      supabaseAnonKey,
    },
  }

  return `${marker}\n    <script>\n      var process = window.process = window.process || {};\n      process.env = process.env || {};\n      process.env.NODE_ENV = "production";\n      process.env.EXPO_PUBLIC_SUPABASE_URL = ${JSON.stringify(supabaseUrl)};\n      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};\n      process.env.APP_MANIFEST = ${JSON.stringify(JSON.stringify(manifest))};\n    </script>\n`
}

function deployDistToTarget() {
  const expoConfig = readExpoConfig()
  let indexHtml = readFileSync(distIndex, 'utf8')
  if (!indexHtml.includes(marker)) {
    indexHtml = indexHtml.replace(metaMarker, `${publicRuntimeConfigBlock()}${metaMarker}`)
  }

  indexHtml = withInstallMetadata(indexHtml)

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
