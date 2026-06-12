import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const liveUrl = (process.env.KASWISE_LIVE_URL || 'https://kaswise.com/').replace(/\/+$/, '/')
const timeoutMs = Number(process.env.KASWISE_LIVE_VERIFY_TIMEOUT_MS || 20000)

function readRequiredMarkers() {
  return JSON.parse(readFileSync(join(__dirname, 'required-markers.json'), 'utf8'))
}

function readLocalBundleName() {
  const indexPath = join(appDir, 'dist', 'index.html')
  if (!existsSync(indexPath)) return null
  const html = readFileSync(indexPath, 'utf8')
  return html.match(/entry-[^"'\s]+\.js/)?.[0] ?? null
}

async function fetchText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

const html = await fetchText(liveUrl)
const liveBundleName = html.match(/entry-[^"'\s]+\.js/)?.[0]
if (!liveBundleName) {
  console.error(`❌ Could not find entry bundle in ${liveUrl}`)
  process.exit(1)
}

const localBundleName = readLocalBundleName()
if (localBundleName && liveBundleName !== localBundleName) {
  console.error(`❌ Live bundle mismatch: live=${liveBundleName}, local dist=${localBundleName}`)
  process.exit(1)
}

const bundleUrl = new URL(`/_expo/static/js/web/${liveBundleName}`, liveUrl).toString()
const bundle = await fetchText(bundleUrl)
const requiredMarkers = readRequiredMarkers()
const missing = requiredMarkers.filter((marker) => !bundle.includes(marker))

if (missing.length > 0) {
  console.error(`❌ Live bundle ${liveBundleName} is missing ${missing.length}/${requiredMarkers.length} required markers:`)
  for (const marker of missing) console.error(`- ${marker}`)
  process.exit(1)
}

console.log(`✅ Live URL references ${liveBundleName}`)
console.log(`✅ All ${requiredMarkers.length} required markers present in live bundle`)
