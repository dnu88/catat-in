import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const distDir = join(appDir, 'dist')
const targetDir = process.env.KASWISE_PWA_TARGET || '/home/Danu88/nginx-proxy-manager/placeholder'
const targetIndex = join(targetDir, 'index.html')
const distIndex = join(distDir, 'index.html')
const marker = '    <!-- Inject Expo config & Supabase env sebelum bundle dimuat -->'
const metaMarker = '    <meta charset="utf-8"'

if (!existsSync(distIndex)) {
  throw new Error(`Missing ${distIndex}. Run "pnpm --filter mobile export:pwa" first.`)
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

function publicRuntimeConfigBlock() {
  const env = readEnvFile(join(appDir, '.env'))
  const expoConfig = readExpoConfig()
  const extra = expoConfig.extra ?? {}
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.supabaseUrl ||
    extra.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabaseAnonKey ||
    extra.EXPO_PUBLIC_SUPABASE_ANON_KEY

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

  return `${marker}\n    <script>\n      var process = window.process = window.process || {};\n      process.env = process.env || {};\n      process.env.NODE_ENV = "production";\n      process.env.EXPO_PUBLIC_SUPABASE_URL = ${JSON.stringify(supabaseUrl)};\n      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};\n      process.env.APP_MANIFEST = ${JSON.stringify(JSON.stringify(manifest))};\n    </script>\n`
}

function existingInjectBlock() {
  if (!existsSync(targetIndex)) return null
  const currentIndex = readFileSync(targetIndex, 'utf8')
  const start = currentIndex.indexOf(marker)
  const end = currentIndex.indexOf(metaMarker, start)
  if (start === -1 || end === -1) return null
  return currentIndex.slice(start, end)
}

let indexHtml = readFileSync(distIndex, 'utf8')
if (!indexHtml.includes(marker)) {
  const injectBlock = existingInjectBlock() ?? publicRuntimeConfigBlock()
  indexHtml = indexHtml.replace(metaMarker, `${injectBlock}${metaMarker}`)
}

mkdirSync(targetDir, { recursive: true })
writeFileSync(targetIndex, indexHtml)

for (const name of ['metadata.json', 'favicon.ico']) {
  const source = join(distDir, name)
  if (existsSync(source)) cpSync(source, join(targetDir, name))
}

for (const name of ['_expo', 'assets']) {
  const source = join(distDir, name)
  if (existsSync(source)) cpSync(source, join(targetDir, name), { recursive: true })
}

console.log(`Deployed mobile PWA dist to ${targetDir}`)
