import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking, StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'

jest.mock('../src/components/motion', () => ({
  PageEntrance: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StaggeredStack: jest.requireActual('../src/components/motion').StaggeredStack,
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
import { featureFlags } from '../src/config/features'
import { getNotificationPreferences, updateNotificationPreferences } from '../src/services/notifications'

const mockSetPersonalContext = jest.fn()
const mockSetActiveHousehold = jest.fn()
jest.mock('../src/state/finance-context', () => ({
  useFinanceContext: () => ({
    activeContext: { type: 'personal' },
    memberships: [{ household_id: 'family-1', role: 'owner', households: { name: 'Keluarga Dania' } }],
    setPersonalContext: mockSetPersonalContext,
    setActiveHousehold: mockSetActiveHousehold,
  }),
}))

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

const mockSupabase = {
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
}

jest.mock('../src/lib/supabase', () => ({
  useSupabase: () => ({ supabase: mockSupabase }),
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockPlan = { plan: 'free' }
let mockAllowNativePremiumPurchase = false
jest.mock('../src/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ data: mockPlan, loading: false }),
}))
jest.mock('../src/config/store-release', () => ({
  getStoreReleaseConfig: () => ({ allowNativePremiumPurchase: mockAllowNativePremiumPurchase }),
}))
jest.mock('../src/services/notifications', () => ({
  getNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(async () => ({ ok: true })),
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

function getFlattenedStyle(node: { props: { style?: StyleProp<ViewStyle> } }): ViewStyle {
  return StyleSheet.flatten(node.props.style) ?? {}
}

describe.each([false, true])('SettingsScreen honest controls (simpleNavigation=%s)', simpleMode => {
  beforeEach(() => {
    jest.spyOn(featureFlags, 'simpleNavigation', 'get').mockReturnValue(simpleMode)
    jest.spyOn(featureFlags, 'importStatement', 'get').mockReturnValue(false)
    mockSetPersonalContext.mockClear()
    mockSetActiveHousehold.mockClear()
    mockPlan.plan = 'free'
    mockAllowNativePremiumPurchase = false
    jest.mocked(getNotificationPreferences).mockResolvedValue({
      enabled: true, daily_reminder_enabled: true, bill_reminder_enabled: true,
      budget_alert_enabled: true, budget_alert_thresholds: [80, 100],
      weekly_summary_enabled: true, ai_insight_enabled: true,
      weekly_summary_day: 0, weekly_summary_time: '19:00', daily_reminder_time: '20:00',
      timezone: 'Asia/Jakarta', push_enabled: false,
    })
    jest.mocked(updateNotificationPreferences).mockClear()
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

    expect(screen.queryByText('Pengaturan')).toBeNull()
    expect(screen.getByTestId('settings-profile')).toBeTruthy()
    expect(screen.getByTestId(simpleMode ? 'settings-entrance-3' : 'settings-entrance-10')).toBeTruthy()
    expect(screen.queryByTestId(simpleMode ? 'settings-entrance-4' : 'settings-entrance-11')).toBeNull()
    expect(screen.queryByTestId('settings-kaswise-logo-mark')).toBeNull()
    expect(screen.getByText('Bahasa aplikasi')).toBeTruthy()
    expect(screen.getByText('Tampilan')).toBeTruthy()
    expect(screen.getByTestId('settings-theme-system')).toBeTruthy()
    expect(screen.getByTestId('settings-theme-light')).toBeTruthy()
    expect(screen.getByTestId('settings-theme-dark')).toBeTruthy()
    expect(screen.getByText(simpleMode ? 'Preferensi notifikasi' : 'Notifikasi')).toBeTruthy()
    expect(screen.getByText('Keluarga')).toBeTruthy()
    expect(screen.getByText('Pusat Keluarga')).toBeTruthy()
    expect(screen.getByText('Kaswise v1.0.0')).toBeTruthy()
    expect(screen.getByText('Keluar dari Akun')).toBeTruthy()

    expect(screen.queryByText('Edit')).toBeNull()
    if (!simpleMode) {
      expect(screen.queryByText('Akses Cepat')).toBeNull()
      expect(screen.queryByText('Dompet')).toBeNull()
      expect(screen.queryByText('Anggaran')).toBeNull()
      expect(screen.queryByText('Tagihan')).toBeNull()
      expect(screen.queryByText('Grup')).toBeNull()
      expect(screen.queryByText('Import')).toBeNull()
      expect(screen.queryByTestId('settings-wallets')).toBeNull()
      expect(screen.queryByTestId('finance-context-switcher')).toBeNull()
    }
    expect(screen.getByText('Akun & Keamanan')).toBeTruthy()
    expect(screen.getByText('Ubah Password')).toBeTruthy()
    expect(screen.getByText('Legal & Dukungan')).toBeTruthy()
    expect(screen.getByText('Kebijakan Privasi')).toBeTruthy()
    expect(screen.getByText('Penghapusan Akun')).toBeTruthy()
    expect(screen.getByText('Syarat Layanan')).toBeTruthy()
  })

  const itSimple = simpleMode ? it : it.skip

  itSimple('shows four simple-mode groups with finance context before commands', async () => {
    const screen = await renderSettings()

    expect(screen.getAllByRole('header').map(node => node.props.children)).toEqual([
      'Keuangan', 'Keluarga', 'Aplikasi', 'Akun & bantuan',
    ])
    expect(screen.getByTestId('finance-context-switcher')).toBeTruthy()
    expect(screen.getByText('Pribadi')).toBeTruthy()
    for (const title of ['Dompet & akun', 'Kategori & anggaran', 'Tagihan & pengingat']) {
      expect(screen.getByText(title)).toBeTruthy()
    }
    const controls = screen.UNSAFE_root.findAll((node: { type: unknown; props: { testID?: string } }) => typeof node.type === 'string' && node.props.testID)
      .map((node: { props: { testID: string } }) => node.props.testID)
    expect(controls.indexOf('finance-context-switcher')).toBeLessThan(controls.indexOf('settings-wallets'))
    expect(screen.queryByTestId('settings-import-statement-link')).toBeNull()
  })

  itSimple('keeps notification writes distinct from inbox navigation', async () => {
    const screen = await renderSettings()
    expect(screen.getByText('Preferensi notifikasi')).toBeTruthy()
    fireEvent.press(screen.getByRole('switch', { name: 'Pengingat Harian' }))
    expect(updateNotificationPreferences).toHaveBeenCalledWith(mockSupabase, { daily_reminder_enabled: false })
    expect(mockPush).not.toHaveBeenCalled()
    fireEvent.press(screen.getByTestId('settings-notification-inbox'))
    expect(mockPush).toHaveBeenCalledWith('/notifications')
  })

  itSimple('localizes commands and group headings when switching to English', async () => {
    jest.spyOn(featureFlags, 'importStatement', 'get').mockReturnValue(true)
    const screen = await renderSettings()
    expect(screen.getByText('Import rekening koran')).toBeTruthy()
    fireEvent.press(screen.getByTestId('settings-language-en'))
    expect(screen.getAllByRole('header').map(node => node.props.children)).toEqual([
      'Finance', 'Family', 'App', 'Account & support',
    ])
    for (const label of ['Wallets & accounts', 'Categories & budgets', 'Bills & reminders',
      'Bank statement import', 'Notification inbox', 'Notification preferences', 'Personal']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  itSimple.each([
    ['settings-wallets', '/(tabs)/wallets'],
    ['settings-budgets', '/(tabs)/budgets'],
    ['settings-bills', '/(tabs)/bills'],
    ['settings-notification-inbox', '/notifications'],
  ])('opens %s at its existing route', async (testID, route) => {
    const screen = await renderSettings()
    fireEvent.press(screen.getByTestId(testID))
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith(route)
  })

  it('gates statement import independently of navigation mode', async () => {
    const hidden = await renderSettings()
    expect(hidden.queryByTestId('settings-import-statement')).toBeNull()
    expect(hidden.queryByTestId('settings-import-statement-link')).toBeNull()
    hidden.unmount()
    jest.spyOn(featureFlags, 'importStatement', 'get').mockReturnValue(true)
    const visible = await renderSettings()
    expect(visible.getByTestId('settings-import-statement')).toBeTruthy()
    fireEvent.press(visible.getByTestId('settings-import-statement-link'))
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/imports')
  })

  itSimple('uses the shared finance context actions rather than separate settings state', async () => {
    const screen = await renderSettings()
    fireEvent.press(screen.getByTestId('finance-context-switcher'))
    fireEvent.press(screen.getByTestId('finance-context-option-family-1'))
    expect(mockSetActiveHousehold).toHaveBeenCalledWith('family-1')
    fireEvent.press(screen.getByTestId('finance-context-switcher'))
    fireEvent.press(screen.getByTestId('finance-context-option-personal'))
    expect(mockSetPersonalContext).toHaveBeenCalledTimes(1)
  })

  it.each(['free', 'premium'])('honors native purchase gating for the %s plan', async plan => {
    mockPlan.plan = plan
    const action = plan === 'premium' ? 'extend' : 'upgrade'
    const gated = await renderSettings()
    expect(gated.queryByTestId(`settings-${action}-button`)).toBeNull()
    expect(gated.getByTestId('settings-plan')).toBeTruthy()
    gated.unmount()
    mockAllowNativePremiumPurchase = true
    const allowed = await renderSettings()
    fireEvent.press(allowed.getByTestId(`settings-${action}-button`))
    expect(mockPush).toHaveBeenCalledWith('/upgrade')
  })

  it('gives the plan upgrade and profile photo controls a real 44x44 touch box', async () => {
    mockAllowNativePremiumPurchase = true
    const screen = await renderSettings()

    for (const testID of ['settings-upgrade-button', 'settings-change-profile-photo']) {
      const control = getFlattenedStyle(screen.getByTestId(testID))
      expect(Number(control.minHeight)).toBeGreaterThanOrEqual(44)
      expect(Number(control.minWidth)).toBeGreaterThanOrEqual(44)
    }
  })

  it('preserves profile avatar saving and logout behavior', async () => {
    mockGetUser.mockResolvedValue({ data: { user: {
      id: 'user-1', email: 'dania@kaswise.com', user_metadata: { full_name: 'Dania' },
    } } } as any)
    const screen = await renderSettings()
    fireEvent.press(screen.getByTestId('settings-change-profile-photo'))
    fireEvent.press(screen.getByTestId('settings-avatar-option-sari-hijab'))
    fireEvent.press(screen.getByTestId('settings-save-profile-photo'))
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ data: expect.objectContaining({
      avatar_key: 'sari-hijab', profile_visual_mode: 'avatar',
    }) }))
    fireEvent.press(screen.getByTestId('settings-logout'))
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
    expect(mockSignOut).toHaveBeenCalledTimes(1)
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
    expect(screen.queryByText('Settings')).toBeNull()
    expect(screen.getByText('App language')).toBeTruthy()
    expect(screen.getByText(simpleMode ? 'Notification preferences' : 'Notifications')).toBeTruthy()
    expect(screen.getByText('Sign Out')).toBeTruthy()
  })

  it('moves theme preference into settings', async () => {
    const screen = await renderSettings()

    fireEvent.press(screen.getByTestId('settings-theme-dark'))

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('kaswise:theme-preference', 'dark')
  })
})
