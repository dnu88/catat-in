jest.mock('nativewind/preset', () => ({}), { virtual: true })

const tailwindConfig = require('./tailwind.config')

describe('mobile tailwind config', () => {
  it('uses the nativewind preset', () => {
    expect(Array.isArray(tailwindConfig.presets)).toBe(true)
    expect(tailwindConfig.presets).toHaveLength(1)
  })

  it('scans app and src directories for content', () => {
    expect(tailwindConfig.content).toContain('./app/**/*.{js,jsx,ts,tsx}')
    expect(tailwindConfig.content).toContain('./src/**/*.{js,jsx,ts,tsx}')
  })

  it('does not define a stale kaswise color palette', () => {
    expect(tailwindConfig.theme?.extend?.colors).toBeUndefined()
  })
})
