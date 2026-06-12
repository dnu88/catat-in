import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const registryFile = join(__dirname, 'live-feature-registry.json')
const defaultBundleDir = join(appDir, 'dist', '_expo', 'static', 'js', 'web')
const distDir = process.env.KASWISE_BUNDLE_DIR ? resolve(process.env.KASWISE_BUNDLE_DIR) : defaultBundleDir

const registry = JSON.parse(readFileSync(registryFile, 'utf8'))
const required = []
for (const feature of registry) {
  for (const marker of feature.markers ?? []) {
    if (typeof marker === 'string' && marker.trim() && !required.includes(marker)) required.push(marker)
  }
}
if (!Array.isArray(registry) || required.length === 0) {
  throw new Error('live-feature-registry.json has no required markers')
}

if (!existsSync(distDir)) {
  throw new Error(`Dist directory not found: ${distDir}. Run "pnpm --filter mobile export:pwa" first.`)
}

const jsFiles = readdirSync(distDir).filter((f) => f.startsWith('entry-') && f.endsWith('.js'))
if (jsFiles.length === 0) {
  throw new Error(`No entry-*.js found in ${distDir}.`)
}

function findIndexReferencedBundle() {
  const candidateIndexPaths = [
    join(distDir, '..', '..', '..', '..', 'index.html'),
    join(appDir, 'dist', 'index.html'),
  ]

  for (const indexPath of candidateIndexPaths) {
    if (!existsSync(indexPath)) continue
    const indexHtml = readFileSync(indexPath, 'utf8')
    const referenced = indexHtml.match(/entry-[^"'\s]+\.js/)?.[0]
    if (referenced && jsFiles.includes(referenced)) return referenced
  }
  return null
}

const selectedFile =
  findIndexReferencedBundle() ??
  jsFiles
    .map((file) => ({ file, mtimeMs: statSync(join(distDir, file)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0].file

const bundle = readFileSync(join(distDir, selectedFile), 'utf8')
const missing = required.filter((marker) => !bundle.includes(marker))

if (missing.length > 0) {
  console.error(`\n❌  BUNDLE MARKER CHECK FAILED — ${missing.length} missing from ${selectedFile}:\n`)
  for (const marker of missing) console.error(`  ✗ ${marker}`)
  console.error(`\n  These testIDs are required by live-feature-registry.json.`)
  console.error(`  If you intentionally removed one, update: ${registryFile}\n`)
  process.exit(1)
}

console.log(`✅  All ${required.length} required markers present in ${selectedFile}`)
