import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const registryPath = join(__dirname, 'live-feature-registry.json')
const liveUrl = (process.env.KASWISE_LIVE_URL || 'https://app.kaswise.com/').replace(/\/+$/, '/')
const timeoutMs = Number(process.env.KASWISE_LIVE_VERIFY_TIMEOUT_MS || 20000)

function loadRegistryMarkers() {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  const markers = []
  for (const feature of registry) {
    for (const marker of feature.markers ?? []) {
      if (typeof marker === 'string' && marker.trim() && !markers.includes(marker)) {
        markers.push(marker)
      }
    }
  }
  return markers
}

function extractCandidateBundleMarkers() {
  const indexPath = join(appDir, 'dist', 'index.html')
  const html = readFileSync(indexPath, 'utf8')
  const bundleName = html.match(/entry-[^"'\s]+\.js/)?.[0]
  if (!bundleName) throw new Error('No entry bundle found in candidate dist/index.html')
  const bundlePath = join(appDir, 'dist', '_expo', 'static', 'js', 'web', bundleName)
  const bundle = readFileSync(bundlePath, 'utf8')
  return { bundleName, bundle }
}

async function fetchLiveBundle() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const htmlRes = await fetch(liveUrl, { signal: controller.signal })
    if (!htmlRes.ok) throw new Error(`Live HTTP ${htmlRes.status}`)
    const html = await htmlRes.text()
    const bundleName = html.match(/entry-[^"'\s]+\.js/)?.[0]
    if (!bundleName) throw new Error('No entry bundle found in live index.html')
    const bundleUrl = new URL(`/_expo/static/js/web/${bundleName}`, liveUrl).toString()
    const bundleRes = await fetch(bundleUrl, { signal: controller.signal })
    if (!bundleRes.ok) throw new Error(`Bundle HTTP ${bundleRes.status}`)
    const bundle = await bundleRes.text()
    return { bundleName, bundle }
  } finally {
    clearTimeout(timer)
  }
}

const registryMarkers = loadRegistryMarkers()
const candidate = extractCandidateBundleMarkers()

console.log(`Candidate bundle: ${candidate.bundleName}`)

const candidateFound = registryMarkers.filter((m) => candidate.bundle.includes(m))
const candidateMissing = registryMarkers.filter((m) => !candidate.bundle.includes(m))

console.log(`\n📦 Candidate marker check (vs registry):`)
console.log(`  Found:   ${candidateFound.length}/${registryMarkers.length}`)
if (candidateMissing.length > 0) {
  console.log(`  Missing: ${candidateMissing.length}`)
  for (const m of candidateMissing) console.log(`    ❌ ${m}`)
}

let liveBundleName = '(not fetched)'
let liveFound = []
let liveMissing = []
try {
  const live = await fetchLiveBundle()
  liveBundleName = live.bundleName
  liveFound = registryMarkers.filter((m) => live.bundle.includes(m))
  liveMissing = registryMarkers.filter((m) => !live.bundle.includes(m))
} catch (err) {
  console.log(`\n🌐 Live bundle: fetch failed — ${err.message}`)
}

if (liveBundleName !== '(not fetched)') {
  console.log(`\n🌐 Live bundle: ${liveBundleName}`)
  console.log(`  Found:   ${liveFound.length}/${registryMarkers.length}`)
  if (liveMissing.length > 0) {
    console.log(`  Missing: ${liveMissing.length}`)
    for (const m of liveMissing) console.log(`    ❌ ${m}`)
  }
}

// Diff: candidate vs live
if (liveBundleName !== '(not fetched)' && liveBundleName !== candidate.bundleName) {
  const added = candidateFound.filter((m) => !liveFound.includes(m))
  const removed = liveFound.filter((m) => !candidateFound.includes(m))
  const unchanged = candidateFound.filter((m) => liveFound.includes(m))

  console.log(`\n📊 Marker diff (candidate → live):`)
  console.log(`  Unchanged: ${unchanged.length}`)
  console.log(`  Added:     ${added.length}`)
  for (const m of added) console.log(`    ➕ ${m}`)
  console.log(`  Removed:   ${removed.length}`)
  for (const m of removed) console.log(`    ➖ ${m}`)

  // Fail on registry-required removals
  if (removed.length > 0) {
    console.error(`\n❌ ${removed.length} registry-required marker(s) would be removed from live.`)
    console.error('If intentional, update live-feature-registry.json before deploying.')
    process.exit(1)
  }
} else if (liveBundleName === candidate.bundleName) {
  console.log(`\n📊 Marker diff: candidate and live are the same bundle (${candidate.bundleName})`)
}

if (candidateMissing.length > 0) {
  console.error(`\n❌ ${candidateMissing.length} registry-required marker(s) missing from candidate.`)
  process.exit(1)
}

console.log(`\n✅ Marker diff report complete`)
