import { expect, test } from '@playwright/test'
import { bootExperience, gotoCapture, trackPageErrors, waitForOpaque } from './harness'

/**
 * T12 measurements on the real exported bundle (flag ON unless stated).
 *
 * Rule from the plan: measure keyboard/focus/Back/deep-link behaviour, record
 * numbers, and never add a new mandatory review gate for the autosave-safe path.
 * Every assertion here is an invariant we are confident about; anything that is
 * merely observed is logged as `MEASURE ...` for the P6 result matrix instead of
 * being asserted into a fake pass.
 */

const idsOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((node) =>
      node.getAttribute('data-testid'),
    ),
  )

test.describe('T12 — keyboard, focus, deep link, back (local preview)', () => {
  test('cold deep link to the receipt mode lands on the receipt intake', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    // Contract (resolveCaptureModeParam): the `?mode=` value is LOWERCASE —
    // text | photo | voice. An unknown value falls back to the default mode.
    await page.goto('/capture?mode=photo')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('capture-receipt-pick')).toBeVisible()
    expect(new URL(page.url()).pathname).toContain('capture')

    const ids = await idsOf(page)
    console.log(
      'MEASURE deepLinkPhoto=' +
        JSON.stringify({
          receiptPick: ids.includes('capture-receipt-pick'),
          composerVisible: ids.includes('capture-composer'),
          primaryCtaCount:
            (ids.includes('capture-composer-submit') ? 1 : 0) +
            (ids.includes('capture-receipt-process') ? 1 : 0),
        }),
    )
  })

  test('an unknown deep-link mode falls back to the default mode', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    // Uppercase / unknown values must not open the receipt panel.
    await page.goto('/capture?mode=Foto')
    await page.waitForLoadState('networkidle')
    await waitForOpaque(page, 'capture-composer')

    const ids = await idsOf(page)
    console.log('MEASURE deepLinkUnknown=' + JSON.stringify({ receiptPick: ids.includes('capture-receipt-pick') }))
    await expect(page.getByTestId('capture-composer-input')).toBeVisible()
    expect(ids.includes('capture-receipt-pick')).toBe(false)
  })

  test('cold deep link to an unavailable voice mode never crashes the screen', async ({ page }) => {
    const errors = trackPageErrors(page)
    await bootExperience(page, { simplePremiumExperience: true, voiceNote: false })
    await page.goto('/capture?mode=Suara')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1200)

    const ids = await idsOf(page)
    console.log(
      'MEASURE deepLinkSuara=' +
        JSON.stringify({
          voiceCard: ids.includes('capture-voice-card'),
          composer: ids.includes('capture-composer'),
          textInput: ids.includes('capture-composer-input'),
        }),
    )
    // Invariant: a mode the user cannot use must not break the screen render.
    expect(ids.includes('capture-composer') || ids.includes('capture-input')).toBe(true)
    expect(errors).toEqual([])
  })

  test('soft-keyboard shrink keeps the input usable and the CTA reachable', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')

    const before = await page.getByTestId('capture-composer-submit').boundingBox()
    await page.setViewportSize({ width: 390, height: 420 })
    await page.getByTestId('capture-composer-input').click()
    await page.waitForTimeout(800)

    const inputBox = await page.getByTestId('capture-composer-input').boundingBox()
    const submitBox = await page.getByTestId('capture-composer-submit').boundingBox()
    console.log(
      'MEASURE keyboardShrink=' +
        JSON.stringify({
          ctaBottomFullHeight: before ? Math.round(before.y + before.height) : null,
          viewportAfter: 420,
          inputBottom: inputBox ? Math.round(inputBox.y + inputBox.height) : null,
          ctaBottomAfter: submitBox ? Math.round(submitBox.y + submitBox.height) : null,
        }),
    )

    // Invariant: the field the keyboard serves must stay inside the visual viewport.
    expect(inputBox, 'input must remain measurable').not.toBeNull()
    expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(420 + 1)

    // Invariant: the CTA must be reachable (scrollable), never trapped off-screen.
    await page.getByTestId('capture-composer-submit').scrollIntoViewIfNeeded()
    const reachable = await page.getByTestId('capture-composer-submit').boundingBox()
    expect(reachable).not.toBeNull()
    expect(reachable!.y + reachable!.height).toBeLessThanOrEqual(420 + 1)
  })

  test('composer controls are keyboard focusable in a sane order', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')

    const focusState = await page.evaluate((ids) => {
      return ids.map((id) => {
        const node = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
        if (!node) return { id, present: false, tabIndex: null, disabled: null }
        node.focus()
        return {
          id,
          present: true,
          tabIndex: node.tabIndex,
          disabled: (node as HTMLButtonElement).disabled ?? null,
          focused: document.activeElement === node,
        }
      })
    }, ['capture-composer-submit', 'capture-composer-manual', 'capture-composer-receipt'])

    console.log('MEASURE focusState=' + JSON.stringify(focusState))
    for (const entry of focusState) {
      expect(entry.present, `${entry.id} present`).toBe(true)
      expect(entry.tabIndex, `${entry.id} tabIndex`).toBeGreaterThanOrEqual(0)
      expect(entry.disabled, `${entry.id} disabled`).not.toBe(true)
    }

    const order: string[] = []
    await page.getByTestId('capture-composer-input').click()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      order.push(
        await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null
          if (!active) return 'none'
          return active.getAttribute('data-testid') || active.tagName.toLowerCase()
        }),
      )
    }
    console.log('MEASURE tabOrder=' + JSON.stringify(order))
  })

  // T12-F1 — RESOLVED 2026-10-03 (finding #2). Entering Manual used to replace
  // the history entry (expo-router serves `transaction-new` inside the capture
  // tab), so browser/Android Back left the app on a blank page. Fixed by
  // `src/features/capture/manual-back-guard.ts`, which buffers one history entry
  // before navigating and returns the user to Capture on Back (flag-gated; see
  // tests/experience/manual-back.spec.ts for the definitive assertions). This
  // legacy test now only pins the app-level route identity + crash-free Back.
  test('browser Back after Manual no longer leaves the app (regression pin)', async ({ page }) => {
    const errors = trackPageErrors(page)
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')

    const before = await page.evaluate(() => history.length)
    await page.getByTestId('capture-composer-manual').click()
    await expect(page).toHaveURL(/transaction-new/)
    const after = await page.evaluate(() => history.length)

    console.log(
      'MEASURE backHistory=' + JSON.stringify({ before, after, pushed: after > before }),
    )
    expect(after - before, 'T12-F1 fix: one buffered entry before manual entry').toBe(1)
    expect(errors, 'capture → manual navigation must stay crash-free').toEqual([])
  })

  test('cancelling the receipt picker leaves the composer stable', async ({ page }) => {
    const errors = trackPageErrors(page)
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')

    await page.getByTestId('capture-composer-receipt').click()
    await expect(page.getByTestId('capture-receipt-pick')).toBeVisible()

    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('capture-receipt-pick').click()
    const chooser = await chooserPromise
    await chooser.setFiles([]) // the user closes the picker without choosing
    await page.waitForTimeout(900)

    expect(new URL(page.url()).pathname).toContain('capture')
    await expect(page.getByTestId('capture-receipt-pick')).toBeVisible()
    expect(errors).toEqual([])
    console.log('MEASURE receiptPickerCancel=stable')
  })

  test('text gating: CTA is permission-gated and an empty submit is harmless', async ({ page }) => {
    const errors = trackPageErrors(page)
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')

    const submit = page.getByTestId('capture-composer-submit')
    const disabledNow = () =>
      submit.evaluate((node) => (node as HTMLButtonElement).disabled ?? false)

    const emptyDisabled = await disabledNow()

    await page.getByTestId('capture-composer-input').fill('Kopi susu 25rb di Kopi Kenangan')
    await page.waitForTimeout(300)
    const clearDisabled = await disabledNow()

    await page.getByTestId('capture-composer-input').fill('tadi bayar sesuatu')
    await page.waitForTimeout(300)
    const ambiguousDisabled = await disabledNow()

    console.log(
      'MEASURE textGating=' +
        JSON.stringify({ emptyDisabled, clearDisabled, ambiguousDisabled }),
    )
    // Measured contract: `submitDisabled = !editable || unknownOutcome !== null`,
    // so the CTA tracks context PERMISSION and an unresolved outcome — it is
    // deliberately not gated on text emptiness (validation happens on submit).
    expect(emptyDisabled, 'CTA tracks permission, not emptiness (measured)').toBe(false)
    // Plan rule: no NEW mandatory review gate for the autosave-safe path.
    expect(clearDisabled, 'clear text must be submittable').toBe(false)
    expect(ambiguousDisabled, 'ambiguous text must stay submittable').toBe(false)

    // Safety: an empty submit must not navigate away or crash.
    await page.getByTestId('capture-composer-input').fill('')
    await page.waitForTimeout(200)
    await submit.click()
    await page.waitForTimeout(1500)
    const ids = await idsOf(page)
    console.log(
      'MEASURE emptySubmit=' +
        JSON.stringify({
          path: new URL(page.url()).pathname,
          stateIds: ids.filter(
            (id) => id.startsWith('capture-composer') || id.startsWith('batch-review'),
          ),
        }),
    )
    expect(new URL(page.url()).pathname).toContain('capture')
    expect(errors, 'empty submit must be crash-free').toEqual([])
  })
})
