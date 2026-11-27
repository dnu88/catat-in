import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const repoDir = resolve(appDir, '..', '..')
const distDir = join(appDir, 'dist')
const registryPath = join(__dirname, 'live-feature-registry.json')
const reportDir = join(repoDir, 'docs', 'releases')

function git(args) {
  return execSync(`git ${args}`, { cwd: repoDir, encoding: 'utf8' }).trim()
}

function readBundleName() {
  const indexPath = join(distDir, 'index.html')
  if (!existsSync(indexPath)) return null
  const html = readFileSync(indexPath, 'utf8')
  return html.match(/entry-[^"'\s]+\.js/)?.[0] ?? null
}

function readMarkerCount() {
  if (!existsSync(registryPath)) return null
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  const markers = []
  for (const feature of registry) {
    for (const marker of feature.markers ?? []) {
      if (typeof marker === 'string' && marker.trim() && !markers.includes(marker)) markers.push(marker)
    }
  }
  return markers.length
}

function readLiveVerification() {
  try {
    execSync('node scripts/verify-live-url.mjs', {
      cwd: appDir,
      stdio: 'pipe',
      env: { ...process.env, KASWISE_LIVE_VERIFY_SILENT: '1', KASWISE_LIVE_VERIFY_SKIP_LOCAL_BUNDLE: '1' },
    })
    return 'pass'
  } catch {
    return 'fail'
  }
}

const commitSha = git('rev-parse --short HEAD')
const branch = git('branch --show-current')
const bundle = readBundleName()
const markerCount = readMarkerCount()
const liveVerification = readLiveVerification()
const timestamp = new Date().toISOString()

const report = {
  timestamp,
  commit: commitSha,
  branch,
  bundle,
  markerCount,
  liveVerification,
  pwaUrl: process.env.KASWISE_LIVE_URL || 'https://app.kaswise.com/',
}

// JSON
const jsonPath = join(distDir, 'release-report.json')
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n')

// Markdown
mkdirSync(reportDir, { recursive: true })
const date = timestamp.slice(0, 10)
const mdPath = join(reportDir, `${date}-${commitSha}.md`)
const md = [
  `# Release Report — ${date}`,
  '',
  `- **Commit:** \`${commitSha}\``,
  `- **Branch:** \`${branch}\``,
  `- **Bundle:** \`${bundle ?? 'N/A'}\``,
  `- **Registry markers:** ${markerCount ?? 'N/A'}`,
  `- **Live URL verify:** ${liveVerification}`,
  `- **PWA URL:** ${report.pwaUrl}`,
  '',
  `Generated: ${timestamp}`,
].join('\n') + '\n'
writeFileSync(mdPath, md)

console.log(`Release report: ${jsonPath}`)
console.log(`Release report: ${mdPath}`)
