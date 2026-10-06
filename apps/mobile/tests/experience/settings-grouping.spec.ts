import { expect, test } from '@playwright/test'
import { bootExperience, waitForOpaque } from './harness'

/**
 * T25 (simple premium) — Settings grouping.
 *
 * Premium groups the existing sections into Akun / Pencatatan / Data /
 * Preferensi / Bantuan by REUSING the same SettingsSection component and the
 * same rows (one extracted source). Flag OFF keeps the existing 4-group
 * "simple" layout untouched. Rows for features that are OFF (bank statement
 * import) must never be promoted.
 */

const GROUPS = [
  'settings-group-account',
  'settings-group-recording',
  'settings-group-data',
  'settings-group-preferences',
  'settings-group-help',
]

const idsOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((node) =>
      node.getAttribute('data-testid'),
    ),
  )

async function gotoSettings(page: import('@playwright/test').Page) {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1800)
}

test.describe('T25 — settings grouping (local preview)', () => {
  test('OFF keeps the existing simple layout without the premium groups', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: false, importStatement: true })
    await gotoSettings(page)

    const ids = await idsOf(page)
    console.log(
      'MEASURE t25Off=' +
        JSON.stringify({
          premiumGroups: GROUPS.filter((group) => ids.includes(group)).length,
          wallets: ids.includes('settings-wallets'),
          importRow: ids.includes('settings-import-statement'),
        }),
    )
    for (const group of GROUPS) {
      await expect(page.getByTestId(group)).toHaveCount(0)
    }
    await expect(page.getByTestId('settings-wallets')).toBeVisible()
    await expect(page.getByTestId('settings-import-statement')).toBeVisible()
  })

  test('ON renders the five groups and keeps every section reachable', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true, importStatement: true })
    await gotoSettings(page)
    await waitForOpaque(page, 'settings-group-account')

    const ids = await idsOf(page)
    console.log(
      'MEASURE t25On=' +
        JSON.stringify({
          groups: GROUPS.filter((group) => ids.includes(group)),
          rows: [
            'settings-profile',
            'settings-account-security',
            'settings-plan',
            'settings-family',
            'settings-logout',
            'settings-wallets',
            'settings-budgets',
            'settings-bills',
            'settings-import-statement',
            'settings-appearance',
            'settings-language',
            'settings-notifications',
            'settings-notification-inbox',
            'settings-app-info',
          ].filter((id) => ids.includes(id)),
        }),
    )

    for (const group of GROUPS) {
      await expect(page.getByTestId(group)).toBeVisible()
    }
    // Recording rows live in "Pencatatan" now, not in "Finance".
    await expect(page.getByTestId('settings-wallets')).toBeVisible()
    await expect(page.getByTestId('settings-import-statement')).toBeVisible()
    // T27 follow-up (reviewer finding): the inbox row must NOT be dropped by the
    // premium grouping — it was missing and silently removed a way to /notifications.
    await expect(page.getByTestId('settings-notification-inbox')).toHaveCount(1)
    await expect(page.getByTestId('settings-logout')).toBeVisible()
    await expect(page.getByTestId('settings-language')).toBeVisible()
  })

  test('a feature that is OFF is not promoted in Data', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true, importStatement: false })
    await gotoSettings(page)
    await waitForOpaque(page, 'settings-group-data')

    const ids = await idsOf(page)
    console.log(
      'MEASURE t25ImportOff=' + JSON.stringify({ importRow: ids.includes('settings-import-statement') }),
    )
    await expect(page.getByTestId('settings-group-data')).toBeVisible()
    await expect(page.getByTestId('settings-import-statement')).toHaveCount(0)
  })

  test('captures settings before/after screenshots', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0
    await bootExperience(page, { simplePremiumExperience: false, importStatement: true })
    await gotoSettings(page)
    await page.screenshot({ path: `test-results/experience/settings-off-${width}.png` })

    await bootExperience(page, { simplePremiumExperience: true, importStatement: true })
    await gotoSettings(page)
    await waitForOpaque(page, 'settings-group-account')
    await page.screenshot({ path: `test-results/experience/settings-on-${width}.png` })
  })
})
