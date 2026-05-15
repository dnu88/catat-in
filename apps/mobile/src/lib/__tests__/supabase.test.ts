describe('Supabase Client', () => {
  it('should load React Native URL polyfill before creating the client', () => {
    const fs = require('fs')
    const resolveModule = (require as unknown as { resolve: (id: string) => string }).resolve
    const source = fs.readFileSync(resolveModule('../supabase'), 'utf8')
    const firstImport = source.split('\n').find((line: string) => line.trim().startsWith('import'))

    expect(firstImport?.trim()).toBe("import 'react-native-url-polyfill/auto'")
  })

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

  it('should ignore unresolved app config placeholders and use Supabase env aliases', () => {
    jest.doMock('expo-constants', () => ({
      expoConfig: {
        extra: {
          supabaseUrl: '${EXPO_PUBLIC_SUPABASE_URL}',
          supabaseAnonKey: '${EXPO_PUBLIC_SUPABASE_ANON_KEY}',
        },
      },
    }))

    const g = globalThis as { process?: { env?: Record<string, string | undefined> } }
    const originalProcess = g.process
    g.process = {
      env: {
        SUPABASE_URL: 'https://fallback.supabase.co',
        SUPABASE_ANON_KEY: 'fallback-anon-key',
      },
    }

    const { supabase } = require('../supabase')
    expect(supabase.supabaseUrl).toBe('https://fallback.supabase.co')

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

  it('should provide the supabase client under the key route screens destructure', () => {
    jest.doMock('expo-constants', () => ({
      expoConfig: {
        extra: {
          supabaseUrl: 'https://test.supabase.co',
          supabaseAnonKey: 'test-anon-key',
        },
      },
    }))

    const { SupabaseProvider, supabase } = require('../supabase')

    const providerElement = SupabaseProvider({ children: null })

    expect(providerElement.props.value.supabase).toBe(supabase)
  })
})
