describe('Supabase Client', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('should create client instance', () => {
    const { supabase } = require('../supabase')
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })

  it('should use expoConfig fallback when process env is absent', () => {
    const g = globalThis as { process?: { env?: Record<string, string | undefined> } }
    const originalProcess = g.process
    g.process = { env: {} }

    const { supabase } = require('../supabase')
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')

    g.process = originalProcess
  })

  it('should throw when both process env and expoConfig are missing', () => {
    jest.doMock('expo-constants', () => ({ expoConfig: { extra: {} } }))

    const g = globalThis as { process?: { env?: Record<string, string | undefined> } }
    const originalProcess = g.process
    g.process = { env: {} }

    expect(() => require('../supabase')).toThrow(
      'Missing Supabase environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required'
    )

    g.process = originalProcess
  })
})
