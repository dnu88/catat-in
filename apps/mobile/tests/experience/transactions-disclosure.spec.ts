import { expect, test } from '@playwright/test'
import { bootExperience, waitForOpaque } from './harness'

/**
 * T22 (simple premium) — Transactions filter progressive disclosure.
 *
 * Flag OFF must stay byte-for-byte legacy (scroller always visible). Flag ON
 * collapses the preference filters behind a disclosure while the review
 * affordance and the Bills navigation chip stay reachable.
 */

async function gotoTransactions(page: import('@playwright/test').Page) {
  await page.goto('/transactions')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)
}

const idsOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((node) =>
      node.getAttribute('data-testid'),
    ),
  )

test.describe('T22 — transactions filter disclosure (local preview)', () => {
  test('OFF keeps the always-visible filter scroller', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: false })
    await gotoTransactions(page)

    await expect(page.getByTestId('transactions-filter-scroller')).toBeVisible()
    await expect(page.getByTestId('transactions-filter-toggle')).toHaveCount(0)
    await expect(page.getByTestId('transactions-review-chip')).toBeVisible()
  })

  test('ON collapses the filters but keeps the review affordance', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoTransactions(page)
    await waitForOpaque(page, 'transactions-filter-toggle')

    // T27 follow-up: the Bills chip NAVIGATES away, so it must survive the
    // collapse (only the preference filters may hide).
    const ids = await idsOf(page)
    console.log(
      'MEASURE t22ChipsCollapsed=' +
        JSON.stringify({
          reviewChip: ids.includes('transactions-review-chip'),
          billsChip: ids.includes('transactions-bills-chip'),
        }),
    )
    await expect(page.getByTestId('transactions-review-chip')).toHaveCount(1)
    await expect(page.getByTestId('transactions-bills-chip')).toHaveCount(1)
    console.log(
      'MEASURE t22Collapsed=' +
        JSON.stringify({
          toggle: ids.includes('transactions-filter-toggle'),
          scroller: ids.includes('transactions-filter-scroller'),
          reviewChip: ids.includes('transactions-review-chip'),
        }),
    )
    await expect(page.getByTestId('transactions-filter-toggle')).toBeVisible()
    await expect(page.getByTestId('transactions-filter-scroller')).toHaveCount(0)
    await expect(page.getByTestId('transactions-review-chip')).toBeVisible()
  })

  test('ON expands to the full scroller and back without duplicating chips', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoTransactions(page)
    await waitForOpaque(page, 'transactions-filter-toggle')

    await page.getByTestId('transactions-filter-toggle').click()
    await expect(page.getByTestId('transactions-filter-scroller')).toBeVisible()
    await expect(page.getByTestId('transactions-bills-chip')).toBeVisible()
    // Exactly one review chip in the tree (the scroller owns it while expanded).
    await expect(page.getByTestId('transactions-review-chip')).toHaveCount(1)
    const expandedIds = await idsOf(page)
    console.log(
      'MEASURE t22Expanded=' +
        JSON.stringify({
          scroller: expandedIds.includes('transactions-filter-scroller'),
          reviewChipCount: expandedIds.filter((id) => id === 'transactions-review-chip').length,
        }),
    )

    await page.getByTestId('transactions-filter-toggle').click()
    await expect(page.getByTestId('transactions-filter-scroller')).toHaveCount(0)
    await expect(page.getByTestId('transactions-review-chip')).toBeVisible()
    console.log('MEASURE t22Recollapsed=ok')
  })

  test('captures transactions before/after screenshots', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0

    await bootExperience(page, { simplePremiumExperience: false })
    await gotoTransactions(page)
    await expect(page.getByTestId('transactions-filter-scroller')).toBeVisible()
    await page.screenshot({
      path: `test-results/experience/transactions-off-${width}.png`,
      fullPage: false,
    })

    await bootExperience(page, { simplePremiumExperience: true })
    await gotoTransactions(page)
    await waitForOpaque(page, 'transactions-filter-toggle')
    await page.screenshot({
      path: `test-results/experience/transactions-on-collapsed-${width}.png`,
      fullPage: false,
    })

    await page.getByTestId('transactions-filter-toggle').click()
    await expect(page.getByTestId('transactions-filter-scroller')).toBeVisible()
    await page.screenshot({
      path: `test-results/experience/transactions-on-expanded-${width}.png`,
      fullPage: false,
    })
  })
})
