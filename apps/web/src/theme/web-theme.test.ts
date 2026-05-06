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

    expect(vars['--ks-bg-base']).toBe('#050C1B')
    expect(vars['--ks-brand-primary']).toBe('#4F46E5')
    expect(vars['--ks-radius-md']).toBe('14px')
  })
})
