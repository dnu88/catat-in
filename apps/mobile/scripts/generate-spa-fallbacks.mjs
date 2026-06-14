import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '..', 'dist')
const sourceIndex = join(distDir, 'index.html')

if (!existsSync(sourceIndex)) {
  throw new Error(`Build output not found: ${sourceIndex}`)
}

const spaRoutes = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'auth/callback',
  'help',
  'terms',
  'privacy',
  'contact',
  'account-deletion',
  'notifications',
  'upgrade',
  'transactions',
  'transaction-new',
  'capture',
  'wallets',
  'budgets',
  'bills',
  'reports',
  'groups',
  'imports',
  'settings',
]

for (const route of spaRoutes) {
  const targetDir = join(distDir, route)
  mkdirSync(targetDir, { recursive: true })
  cpSync(sourceIndex, join(targetDir, 'index.html'))
}

console.log(`Generated SPA fallback files for ${spaRoutes.length} mobile routes.`)
