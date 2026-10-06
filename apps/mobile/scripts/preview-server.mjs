/**
 * Minimal static server for the LOCAL experience preview.
 *
 * Serves `apps/mobile/dist` (a local `expo export`) with SPA fallback so the
 * Playwright experience suite can drive the real built bundle without touching
 * production, credentials, or the deploy pipeline.
 *
 * Usage: node scripts/preview-server.mjs [port]
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '..', 'dist')
const port = Number(process.argv[2] || process.env.PREVIEW_PORT || 4174)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
}

/**
 * A plain `expo export` has NO runtime config: `deploy-pwa.mjs` injects that
 * block at deploy time. The preview needs the same block, but pointed at a stub
 * Supabase host that the tests intercept — never at production.
 */
const STUB_SUPABASE_URL = process.env.PREVIEW_SUPABASE_URL || 'https://preview-stub.supabase.co'
const STUB_SUPABASE_ANON_KEY = process.env.PREVIEW_SUPABASE_ANON_KEY || 'preview-stub-anon-key'

function withPreviewRuntimeConfig(html) {
  if (html.includes('PREVIEW_RUNTIME_CONFIG')) return html
  const block = [
    '<script id="PREVIEW_RUNTIME_CONFIG">',
    'window.process = window.process || {};',
    'window.process.env = window.process.env || {};',
    'window.process.env.NODE_ENV = "production";',
    `window.process.env.EXPO_PUBLIC_SUPABASE_URL = ${JSON.stringify(STUB_SUPABASE_URL)};`,
    `window.process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ${JSON.stringify(STUB_SUPABASE_ANON_KEY)};`,
    '</script>',
  ].join('\n')
  return html.includes('</head>')
    ? html.replace('</head>', `${block}\n</head>`)
    : `${block}\n${html}`
}

if (!existsSync(join(distDir, 'index.html'))) {
  throw new Error(
    `No local build found at ${distDir}. Run: EXPO_PUBLIC_SUPABASE_URL=... corepack pnpm export:pwa`,
  )
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'content-type': type,
    // The preview must never be cached: the whole point is toggling flags.
    'cache-control': 'no-store',
  })
  res.end(body)
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const candidate = join(distDir, requested)

  if (candidate.startsWith(distDir) && existsSync(candidate) && statSync(candidate).isFile()) {
    const body =
      extname(candidate) === '.html'
        ? withPreviewRuntimeConfig(readFileSync(candidate, 'utf8'))
        : readFileSync(candidate)
    return send(res, 200, body, MIME[extname(candidate)] || 'application/octet-stream')
  }

  // SPA fallback — expo-router resolves the route client-side.
  return send(
    res,
    200,
    withPreviewRuntimeConfig(readFileSync(join(distDir, 'index.html'), 'utf8')),
    MIME['.html'],
  )
})

server.listen(port, '127.0.0.1', () => {
  // Printed so the harness can wait for readiness instead of sleeping blindly.
  console.log(`preview-ready http://127.0.0.1:${port}`)
})
