import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const repoDir = resolve(appDir, '..', '..')
const registryPath = join(__dirname, 'live-feature-registry.json')
const requiredMarkersPath = join(__dirname, 'required-markers.json')

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`Failed to read JSON ${path}: ${error.message}`)
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validateStringArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`)
    return []
  }

  const strings = []
  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${label}[${index}] must be a non-empty string`)
      return
    }
    strings.push(item)
  })
  return strings
}

const registry = readJson(registryPath)
const requiredMarkers = readJson(requiredMarkersPath)
const errors = []

if (!Array.isArray(registry)) {
  errors.push('live-feature-registry.json must contain an array')
}
if (!Array.isArray(requiredMarkers)) {
  errors.push('required-markers.json must contain an array')
}

const requiredMarkerSet = new Set(Array.isArray(requiredMarkers) ? requiredMarkers : [])
const seenFeatureIds = new Set()

if (Array.isArray(registry)) {
  registry.forEach((feature, index) => {
    const prefix = `feature[${index}]`
    if (!feature || typeof feature !== 'object' || Array.isArray(feature)) {
      errors.push(`${prefix} must be an object`)
      return
    }

    const id = feature.id
    if (!isNonEmptyString(id)) {
      errors.push(`${prefix}.id must be a non-empty string`)
    } else if (seenFeatureIds.has(id)) {
      errors.push(`${prefix}.id '${id}' is duplicated`)
    } else {
      seenFeatureIds.add(id)
    }

    if (!isNonEmptyString(feature.description)) {
      errors.push(`${prefix}.description must be a non-empty string`)
    }

    if (typeof feature.critical !== 'boolean') {
      errors.push(`${prefix}.critical must be a boolean`)
    }

    const markers = validateStringArray(feature.markers ?? [], `${prefix}.markers`, errors)
    const tests = validateStringArray(feature.tests ?? [], `${prefix}.tests`, errors)

    if (feature.critical === true && markers.length === 0 && tests.length === 0) {
      errors.push(`${prefix} (${id || 'missing-id'}) is critical but has no markers or tests`)
    }

    markers.forEach((marker) => {
      if (!requiredMarkerSet.has(marker)) {
        errors.push(`${prefix} (${id || 'missing-id'}) marker '${marker}' is not listed in required-markers.json`)
      }
    })

    tests.forEach((testPath) => {
      const absolutePath = resolve(repoDir, testPath)
      if (!existsSync(absolutePath)) {
        errors.push(`${prefix} (${id || 'missing-id'}) test '${testPath}' does not exist`)
      }
    })
  })
}

if (errors.length > 0) {
  console.error('❌ Live feature registry invalid')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`✅ Live feature registry valid (${registry.length} features, ${requiredMarkerSet.size} required markers)`)
