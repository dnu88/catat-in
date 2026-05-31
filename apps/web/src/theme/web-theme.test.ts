import { describe, expect, it } from 'vitest'
import { kaswiseTokens } from '@kaswise/shared/theme'
import { buildCssVariables } from './web-theme'

describe('kaswise shared tokens', () => {
  it('has light and dark theme with required root keys', () => {
    expect(kaswiseTokens.light.color.bg.base).toBeTypeOf('string')
    expect(kaswiseTokens.dark.color.bg.base).toBeTypeOf('string')
    expect(kaswiseTokens.light.radius.md).toBeTypeOf('number')
    expect(kaswiseTokens.dark.typography.fontFamily).toContain('Inter')
  })
})

describe('web theme adapter', () => {
  it('maps shared tokens into css vars', () => {
    const vars = buildCssVariables('dark')

    expect(vars['--ks-bg-base']).toBe(kaswiseTokens.dark.color.bg.base)
    expect(vars['--ks-brand-primary']).toBe(kaswiseTokens.dark.color.brand.primary)
    expect(vars['--ks-brand-secondary']).toBe(kaswiseTokens.dark.color.brand.secondary)
    expect(vars['--ks-radius-md']).toBe(`${kaswiseTokens.dark.radius.md}px`)
  })
})
