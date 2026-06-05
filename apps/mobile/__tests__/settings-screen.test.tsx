import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import SettingsScreen from '../app/(tabs)/settings'
import { I18nProvider } from '../src/i18n/i18n-context'
import { SupabaseProvider } from '../src/lib/supabase'
import { ThemeProvider } from '../src/theme/theme-context'

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockSignOut = jest.fn(async () => ({ error: null }))
const mockUpdateUser = jest.fn(async () => ({ data: { user: null }, error: null }))
const mockGetUser = jest.fn(async () => ({ data: { user: null } }))

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
        getUser: mockGetUser,
        updateUser: mockUpdateUser,
      },
      storage: {
        from: () => ({
          upload: jest.fn(async () => ({ error: null })),
          getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://kaswise.com/avatar.png' } })),
          remove: jest.fn(async () => ({ error: null })),
        }),
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
    mockUpdateUser.mockClear()
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: null } })
    jest.mocked(AsyncStorage.getItem).mockReset()
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null)
    jest.mocked(AsyncStorage.setItem).mockClear()
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
    expect(screen.getByText('Akun & Keamanan')).toBeTruthy()
    expect(screen.getByText('Ubah Password')).toBeTruthy()
    expect(screen.queryByText('Kebijakan Privasi')).toBeNull()
  })

  it('opens family center from settings', () => {
    const screen = renderSettings()

    fireEvent.press(screen.getByTestId('settings-family-center'))

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/groups')
  })


  it('updates password from account security settings', async () => {
    const screen = renderSettings()

    fireEvent.press(screen.getByTestId('settings-password-toggle'))
    fireEvent.changeText(screen.getByTestId('settings-new-password'), 'password-baru')
    fireEvent.changeText(screen.getByTestId('settings-confirm-password'), 'password-baru')
    fireEvent.press(screen.getByTestId('settings-save-password'))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'password-baru' })
      expect(screen.getByText('Password berhasil diganti.')).toBeTruthy()
    })
  })

  it('saves a selected default avatar to user metadata and hides the success message automatically', async () => {
    jest.useFakeTimers()
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'dania@kaswise.com',
          user_metadata: { full_name: 'Dania' },
        },
      },
    } as any)
    const screen = renderSettings()

    await waitFor(() => expect(screen.getByText('dania@kaswise.com')).toBeTruthy())
    fireEvent.press(screen.getByTestId('settings-change-profile-photo'))
    fireEvent.press(screen.getByTestId('settings-avatar-option-sari-hijab'))
    fireEvent.press(screen.getByTestId('settings-save-profile-photo'))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: expect.objectContaining({
          avatar_key: 'sari-hijab',
          avatar_url: null,
          profile_visual_mode: 'avatar',
        }),
      })
      expect(screen.getByText('Foto profil tersimpan.')).toBeTruthy()
    })

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Foto profil tersimpan.')).toBeNull()
    jest.useRealTimers()
  })


  it('keeps the last selected avatar after logout and login even when provider picture exists', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'dania@kaswise.com',
          user_metadata: {
            full_name: 'Dania',
            picture: 'https://accounts.google.com/default-picture.png',
            avatar_key: 'sari-hijab',
            avatar_url: null,
            profile_visual_mode: 'avatar',
          },
        },
      },
    } as any)

    const screen = renderSettings()

    await waitFor(() => expect(screen.getByText('dania@kaswise.com')).toBeTruthy())
    expect(screen.getByLabelText('Sari berhijab')).toBeTruthy()
  })


  it('persists selected language and theme across app reopen', async () => {
    const firstSession = renderSettings()

    fireEvent.press(firstSession.getByTestId('settings-language-en'))
    fireEvent.press(firstSession.getByTestId('settings-theme-dark'))

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('kaswise:language-preference', 'en')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('kaswise:theme-preference', 'dark')

    firstSession.unmount()
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key === 'kaswise:language-preference') return 'en'
      if (key === 'kaswise:theme-preference') return 'dark'
      return null
    })

    const reopenedSession = renderSettings()

    await waitFor(() => {
      expect(reopenedSession.getByText('Settings')).toBeTruthy()
      expect(reopenedSession.getByTestId('settings-language-en').props.accessibilityState.selected).toBe(true)
      expect(reopenedSession.getByTestId('settings-theme-dark').props.accessibilityState.selected).toBe(true)
    })
  })


  it('does not leave logout stuck when Supabase signOut is slow', async () => {
    jest.useFakeTimers()
    mockSignOut.mockImplementationOnce(() => new Promise(() => undefined))
    const screen = renderSettings()

    fireEvent.press(screen.getByText('Keluar dari Akun'))
    expect(mockSignOut).toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1800)
    })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
    })
    jest.useRealTimers()
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
