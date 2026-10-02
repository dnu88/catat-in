const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
  return env;
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

(async () => {
  const env = readEnv(path.join(__dirname, '..', '.env'));
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'preview@kaswise.local',
    email_confirmed_at: new Date().toISOString(),
    user_metadata: { full_name: 'Danu Preview' },
    app_metadata: { provider: 'email', providers: ['email'] },
    created_at: new Date().toISOString(),
  };
  const token = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: now + 3600 })}.preview`;
  const session = {
    access_token: token,
    refresh_token: 'preview-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem('kaswise:theme-preference', 'light');
    localStorage.setItem('kaswise:language', 'id');
  }, { key: `sb-${projectRef}-auth-token`, session });

  await page.route(`${supabaseUrl}/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (url.includes('/auth/v1/token')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/0' },
      body: '[]',
    });
  });

  const outputDir = path.join(__dirname, '..', 'theme-preview');
  fs.mkdirSync(outputDir, { recursive: true });
  const routes = ['/', 'transactions', 'capture', 'reports', 'settings', 'wallets', 'budgets', 'bills', 'groups', 'imports', 'transaction-new', 'notifications', 'privacy'];
  for (const routeName of routes) {
    const routePath = routeName === '/' ? '' : `${routeName}/`;
    const fileName = routeName === '/' ? 'dashboard' : routeName;
    await page.goto(`http://127.0.0.1:4188/${routePath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    console.log(fileName, page.url(), (await page.locator('body').innerText()).slice(0, 180).replace(/\n/g, ' | '));
    await page.screenshot({ path: path.join(outputDir, `${fileName}.png`), fullPage: true });
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
