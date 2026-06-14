import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'

jest.mock('../src/components/motion', () => ({
  PageEntrance: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StaggeredStack: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('../src/components/ui', () => ({
  IconBubble: () => null,
}))

jest.mock('../src/components/brand/KaswiseLogoMark', () => ({
  KaswiseLogoMark: () => null,
}))

jest.mock('../src/components/icons/kaswise-icons', () => ({
  KaswiseIcon: () => null,
}))

import SettingsScreen from '../app/(tabs)/settings'
import { getLatestAccountDeletionRequest, submitAccountDeletionRequest } from '../src/services/account-deletion'
import { I18nProvider } from '../src/i18n/i18n-context'
import { KASWISE_LEGAL_URLS } from '../src/config/legal-links'
import { SupabaseProvider } from '../src/lib/supabase'
import { ThemeProvider } from '../src/theme/theme-context'

jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)

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

jest.mock('../src/services/account-deletion', () => ({
  getLatestAccountDeletionRequest: jest.fn(async () => ({ request: null })),
  submitAccountDeletionRequest: jest.fn(),
}))

async function renderSettings() {
  const screen = render(
    <SupabaseProvider>
      <I18nProvider>
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>
      </I18nProvider>
    </SupabaseProvider>,
  )

  return screen
}

describe('SettingsScreen honest controls', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockPush.mockClear()
    mockSignOut.mockClear()
    mockUpdateUser.mockClear()
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: null } })
    jest.mocked(getLatestAccountDeletionRequest).mockReset()
    jest.mocked(getLatestAccountDeletionRequest).mockResolvedValue({ request: null })
    jest.mocked(submitAccountDeletionRequest).mockReset()
    jest.mocked(Linking.openURL).mockClear()
    jest.mocked(AsyncStorage.getItem).mockReset()
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null)
    jest.mocked(AsyncStorage.setItem).mockClear()
  })

  it('keeps working settings controls and removes dead taps', async () => {
    const screen = await renderSettings()

    expect(screen.getByText('Pengaturan')).toBeTruthy()
    expect(screen.getByTestId('settings-profile')).toBeTruthy()
    expect(screen.getByText('Bahasa aplikasi')).toBeTruthy()
    expect(screen.getByText('Notifikasi')).toBeTruthy()
    expect(screen.getByText('Keluarga')).toBeTruthy()
    expect(screen.getByText('Pusat Keluarga')).toBeTruthy()
    expect(screen.getByText('Kaswise v1.0.0')).toBeTruthy()
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
    expect(screen.getByText('Legal & Dukungan')).toBeTruthy()
    expect(screen.getByText('Kebijakan Privasi')).toBeTruthy()
    expect(screen.getByText('Penghapusan Akun')).toBeTruthy()
    expect(screen.getByText('Syarat Layanan')).toBeTruthy()
  })

  it('opens family center from settings', async () => {
    const screen = await renderSettings()

    fireEvent.press(screen.getByTestId('settings-family-center'))

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/groups')
  })

  it('opens public legal URLs from settings without local placeholders', async () => {
    const screen = await renderSettings()

    fireEvent.press(screen.getByTestId('settings-privacy-policy'))
    fireEvent.press(screen.getByTestId('settings-account-deletion'))
    fireEvent.press(screen.getByTestId('settings-terms-of-service'))

    expect(Linking.openURL).toHaveBeenNthCalledWith(1, KASWISE_LEGAL_URLS.privacy)
    expect(Linking.openURL).toHaveBeenNthCalledWith(2, KASWISE_LEGAL_URLS.accountDeletion)
    expect(Linking.openURL).toHaveBeenNthCalledWith(3, KASWISE_LEGAL_URLS.terms)
  })

  it('submits an account deletion request from settings', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'dania@kaswise.com',
          user_metadata: { full_name: 'Dania' },
        },
      },
    } as any)
    jest.mocked(submitAccountDeletionRequest).mockResolvedValue({
      created: true,
      request: {
        id: 'req-1',
        user_id: 'user-1',
        email: 'dania@kaswise.com',
        status: 'pending',
        reason: 'Tidak lagi memakai aplikasi',
        details: 'Mohon hapus akun dan data aktif saya.',
        review_notes: null,
        requested_at: '2026-06-14T12:00:00+00:00',
        reviewed_at: null,
        created_at: '2026-06-14T12:00:00+00:00',
        updated_at: '2026-06-14T12:00:00+00:00',
      },
    })

    const screen = await renderSettings()

    fireEvent.press(screen.getByTestId('settings-account-deletion-toggle'))
    await waitFor(() => expect(screen.getByTestId('settings-account-deletion-email')).toBeTruthy())
    fireEvent.changeText(screen.getByTestId('settings-account-deletion-reason'), 'Tidak lagi memakai aplikasi')
    fireEvent.changeText(screen.getByTestId('settings-account-deletion-details'), 'Mohon hapus akun dan data aktif saya.')
    fireEvent.press(screen.getByTestId('settings-submit-account-deletion'))

    await waitFor(() => {
      expect(submitAccountDeletionRequest).toHaveBeenCalledWith(expect.anything(), {
        confirm_email: 'dania@kaswise.com',
        reason: 'Tidak lagi memakai aplikasi',
        details: 'Mohon hapus akun dan data aktif saya.',
      })
      expect(screen.getByText(/Request penghapusan akun tercatat/i)).toBeTruthy()
    })
  })


  it('updates password from account security settings', async () => {
    const screen = await renderSettings()

    fireEvent.press(screen.getByTestId('settings-password-toggle'))
    fireEvent.changeText(screen.getByTestId('settings-new-password'), 'password-baru')
    fireEvent.changeText(screen.getByTestId('settings-confirm-password'), 'password-baru')
    fireEvent.press(screen.getByTestId('settings-save-password'))

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'password-baru' })
      expect(screen.getByText('Password berhasil diganti.')).toBeTruthy()
    })
  })

  it('still lets language controls work and keeps logout visible', async () => {
    const screen = await renderSettings()

    fireEvent.press(screen.getByTestId('settings-language-en'))
    expect(screen.getByText('Settings')).toBeTruthy()
    expect(screen.getByText('App language')).toBeTruthy()
    expect(screen.getByText('Notifications')).toBeTruthy()
    expect(screen.getByText('Sign Out')).toBeTruthy()
  })
})
