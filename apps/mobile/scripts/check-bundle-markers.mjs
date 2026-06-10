import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const markersFile = join(__dirname, 'required-markers.json')
const distDir = join(appDir, 'dist', '_expo', 'static', 'js', 'web')

const required = JSON.parse(readFileSync(markersFile, 'utf8'))
if (!Array.isArray(required) || required.length === 0) {
  throw new Error('required-markers.json is empty or invalid')
}

if (!existsSync(distDir)) {
  throw new Error(`Dist directory not found: ${distDir}. Run "pnpm --filter mobile export:pwa" first.`)
}

const jsFiles = readdirSync(distDir).filter((f) => f.startsWith('entry-') && f.endsWith('.js'))
if (jsFiles.length === 0) {
  throw new Error(`No entry-*.js found in ${distDir}.`)
}

const bundle = readFileSync(join(distDir, jsFiles[0]), 'utf8')
const missing = required.filter((marker) => !bundle.includes(marker))

if (missing.length > 0) {
  console.error(`\n❌  BUNDLE MARKER CHECK FAILED — ${missing.length} missing from ${jsFiles[0]}:\n`)
  for (const marker of missing) console.error(`  ✗ ${marker}`)
  console.error(`\n  These testIDs are required in every PWA bundle.`)
  console.error(`  If you intentionally removed one, update: ${markersFile}\n`)
  process.exit(1)
}

console.log(`✅  All ${required.length} required markers present in ${jsFiles[0]}`)
