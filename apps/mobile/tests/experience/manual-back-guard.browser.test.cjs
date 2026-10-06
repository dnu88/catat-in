// Isolated real-Chromium history regression, NOT an application smoke test.
// Runs the production guard and Expo's installed createMemoryHistory together.
// Run: node --test tests/experience/manual-back-guard.browser.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const ts = require('typescript');
const { chromium } = require('@playwright/test');

function browserModule(source, dependencies = '{}') {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, allowJs: true },
  }).outputText;
  return `(() => { const exports = {}; const module = { exports }; const require = name => (${dependencies})[name]; ${compiled}; return module.exports; })()`;
}
const memoryPath = require.resolve('expo-router/build/fork/createMemoryHistory');
const nanoidPath = require.resolve('nanoid/non-secure', { paths: [path.dirname(memoryPath)] });
const memoryModule = browserModule(fs.readFileSync(memoryPath, 'utf8'),
  `{ 'nanoid/non-secure': ${browserModule(fs.readFileSync(nanoidPath, 'utf8'))} }`);
const guardModule = browserModule(fs.readFileSync(path.resolve(__dirname,
  '../../src/features/capture/manual-back-guard.ts'), 'utf8'));

for (const transition of ['replace', 'push']) test(`focus-before-URL ${transition}: Back keeps Manual edit URL, router state and amount`, async () => {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><input aria-label="Amount" value="45000">');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/capture`);
    await page.evaluate(({ memoryModule, guardModule, transition }) => {
      const memory = eval(memoryModule).createMemoryHistory();
      const { armManualBackGuard } = eval(guardModule);
      memory.replace({ path: '/capture', state: { screen: 'Capture' } });
      const manualUrl = '/transaction-new?transactionId=edit%2F123&scope=household';
      window.urlAtFocus = location.pathname;
      window.routerScreen = 'Manual';
      window.routerResets = 0;
      window.backRequests = 0;
      window.blocked = false;
      // Mirrors useLinking's registered-before-the-screen bubble listener:
      // history.index resolves history.state.id, then resetRoot(record.state).
      memory.listen(() => {
        window.routerResets++;
        const record = memory.get(memory.index);
        window.routerScreen = record?.state?.screen ?? 'Capture';
        document.querySelector('input').value = '';
      });
      window.cleanupGuard = armManualBackGuard({ isWeb: true, url: manualUrl, onBack: () => {
        window.backRequests++;
        if (window.blocked) { window.alert('Save result must be checked'); return; }
        if (!window.confirm('Discard this draft?')) return;
        window.cleanupGuard();
        document.querySelector('input').value = '';
        window.routerScreen = 'Capture';
        memory.replace({ path: '/capture', state: { screen: 'Capture' } });
      } });
      // Expo commits URL/history AFTER Manual's focus effect (real memoryHistory,
      // not a fake popstate). push also changes the router id, unlike replace.
      memory[transition]({ path: manualUrl, state: { screen: 'Manual', transactionId: 'edit/123' } });
      window.manualId = history.state.id;
      window.historyAtCommit = history.length;
    }, { memoryModule, guardModule, transition });
    await page.waitForFunction(() => history.length > window.historyAtCommit, null, { timeout: 1000 });
    assert.equal(await page.evaluate(() => window.urlAtFocus), '/capture');
    assert.equal(await page.evaluate(() => history.state.id === window.manualId), true,
      'sentinel must retain the Expo history id');
    for (let count = 1; count <= 2; count++) {
      const dialog = page.waitForEvent('dialog');
      await page.evaluate(() => { history.back(); });
      await (await dialog).dismiss();
      await page.waitForFunction(n => window.backRequests === n, count);
      assert.equal(new URL(page.url()).pathname + new URL(page.url()).search,
        '/transaction-new?transactionId=edit%2F123&scope=household');
      assert.equal(await page.locator('input').inputValue(), '45000');
      assert.equal(await page.evaluate(() => window.routerScreen), 'Manual');
      assert.equal(await page.evaluate(() => window.routerResets), 0);
      assert.equal(await page.evaluate(() => history.state.id === window.manualId), true);
    }
    // Saving/unknown outcome never reaches navigation, even with discard requested.
    const blockedDialog = page.waitForEvent('dialog');
    await page.evaluate(() => { window.blocked = true; history.back(); });
    await (await blockedDialog).dismiss();
    await page.waitForFunction(() => window.backRequests === 3);
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search,
        '/transaction-new?transactionId=edit%2F123&scope=household');
    assert.equal(await page.locator('input').inputValue(), '45000');
    assert.equal(await page.evaluate(() => window.routerResets), 0);
    const discardDialog = page.waitForEvent('dialog');
    await page.evaluate(() => { window.blocked = false; history.back(); });
    await (await discardDialog).accept();
    await page.waitForFunction(() => window.backRequests === 4);
    assert.equal(new URL(page.url()).pathname, '/capture');
    assert.equal(await page.evaluate(() => window.routerScreen), 'Capture');
    assert.equal(await page.locator('input').inputValue(), '');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
