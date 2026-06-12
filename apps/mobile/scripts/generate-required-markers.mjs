import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const registryPath = join(__dirname, 'live-feature-registry.json')
const requiredMarkersPath = join(__dirname, 'required-markers.json')

const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
if (!Array.isArray(registry)) {
  throw new Error('live-feature-registry.json must contain an array')
}

const markers = []
for (const feature of registry) {
  if (!feature || typeof feature !== 'object') continue
  for (const marker of feature.markers ?? []) {
    if (typeof marker === 'string' && marker.trim() && !markers.includes(marker)) {
      markers.push(marker)
    }
  }
}

if (markers.length === 0) {
  throw new Error('No markers found in live-feature-registry.json')
}

writeFileSync(requiredMarkersPath, `${JSON.stringify(markers, null, 2)}\n`)
console.log(`✅ Synced ${markers.length} required markers from live-feature-registry.json`)
