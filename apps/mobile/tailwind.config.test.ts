jest.mock('nativewind/preset', () => ({}), { virtual: true })

const tailwindConfig = require('./tailwind.config')

describe('mobile tailwind config', () => {
  it('exposes Kaswise light and dark tokens', () => {
    expect(tailwindConfig.theme.extend.colors.kaswise.navy).toBe('#0F172A')
    expect(tailwindConfig.theme.extend.colors.kaswise.cardbg).toBe('#1E293B')
    expect(tailwindConfig.theme.extend.colors.kaswise.indigo).toBe('#6366F1')
    expect(tailwindConfig.theme.extend.colors.kaswise.emerald).toBe('#10B981')
    expect(tailwindConfig.theme.extend.colors.kaswise.rose).toBe('#F43F5E')
    expect(tailwindConfig.theme.extend.colors.kaswise.sky).toBe('#38BDF8')
    expect(tailwindConfig.theme.extend.colors.kaswise.lightBg).toBe('#F8FAFC')
    expect(tailwindConfig.theme.extend.boxShadow.soft).toBeDefined()
  })
})
