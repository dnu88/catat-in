import { fireEvent, render, waitFor } from '@testing-library/react-native'

import SettingsScreen from '../app/(tabs)/settings'
import { I18nProvider } from '../src/i18n/i18n-context'
import { SupabaseProvider } from '../src/lib/supabase'
import { ThemeProvider } from '../src/theme/theme-context'

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockSignOut = jest.fn(async () => ({ error: null }))

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}))

jest.mock('../src/lib/supabase', () => ({
  useSupabase: () => ({
    supabase: {
      auth: {
        signOut: mockSignOut,
        getUser: jest.fn(async () => ({ data: { user: null } })),
      },
    },
  }),
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}))

function renderSettings() {
  return render(
    <SupabaseProvider>
      <I18nProvider>
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>
      </I18nProvider>
    </SupabaseProvider>,
  )
}

describe('SettingsScreen honest controls', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockPush.mockClear()
    mockSignOut.mockClear()
  })

  it('keeps working settings controls and removes dead taps', () => {
    const screen = renderSettings()

    expect(screen.getByText('Pengaturan')).toBeTruthy()
    expect(screen.getByText('Tampilan')).toBeTruthy()
    expect(screen.getByText('Bahasa aplikasi')).toBeTruthy()
    expect(screen.getByText('Notifikasi')).toBeTruthy()
    expect(screen.getByText('Keluarga')).toBeTruthy()
    expect(screen.getByText('Pusat Keluarga')).toBeTruthy()
    expect(screen.getByText('kaswise v1.0.0')).toBeTruthy()
    expect(screen.getByText('Keluar dari Akun')).toBeTruthy()

    expect(screen.queryByText('Edit')).toBeNull()
    expect(screen.queryByText('Akses Cepat')).toBeNull()
    expect(screen.queryByText('Dompet')).toBeNull()
    expect(screen.queryByText('Anggaran')).toBeNull()
    expect(screen.queryByText('Tagihan')).toBeNull()
    expect(screen.queryByText('Grup')).toBeNull()
    expect(screen.queryByText('Import')).toBeNull()
    expect(screen.queryByText('Akun & Keamanan')).toBeNull()
    expect(screen.queryByText('Ubah Password')).toBeNull()
    expect(screen.queryByText('Kebijakan Privasi')).toBeNull()
  })

  it('opens family center from settings', () => {
    const screen = renderSettings()

    fireEvent.press(screen.getByTestId('settings-family-center'))

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/groups')
  })

  it('still lets language and logout controls work', async () => {
    const screen = renderSettings()

    fireEvent.press(screen.getByTestId('settings-language-en'))
    expect(screen.getByText('Settings')).toBeTruthy()
    expect(screen.getByText('Appearance')).toBeTruthy()
    expect(screen.getByText('App language')).toBeTruthy()
    expect(screen.getByText('Notifications')).toBeTruthy()
    expect(screen.getByText('Sign Out')).toBeTruthy()

    fireEvent.press(screen.getByText('Sign Out'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
    })
  })
})
