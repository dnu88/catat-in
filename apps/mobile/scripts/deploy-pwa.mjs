import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const distDir = join(appDir, 'dist')
const targetDir = process.env.KASWISE_PWA_TARGET || '/home/Danu88/nginx-proxy-manager/placeholder'
const targetIndex = join(targetDir, 'index.html')
const distIndex = join(distDir, 'index.html')

if (!existsSync(distIndex)) {
  throw new Error(`Missing ${distIndex}. Run "pnpm --filter mobile export:pwa" first.`)
}

let indexHtml = readFileSync(distIndex, 'utf8')
if (existsSync(targetIndex)) {
  const currentIndex = readFileSync(targetIndex, 'utf8')
  const marker = '    <!-- Inject Expo config & Supabase env sebelum bundle dimuat -->'
  const metaMarker = '    <meta charset="utf-8"'
  const start = currentIndex.indexOf(marker)
  const end = currentIndex.indexOf(metaMarker, start)

  if (start !== -1 && end !== -1 && !indexHtml.includes(marker)) {
    const injectBlock = currentIndex.slice(start, end)
    indexHtml = indexHtml.replace(metaMarker, `${injectBlock}${metaMarker}`)
  }
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
