import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking, StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

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

let mockAuthChanged: (event: string, session: any) => void
const mockUnsubscribe = jest.fn()
const mockSupabase = {
  auth: {
    onAuthStateChange: (callback: typeof mockAuthChanged) => { mockAuthChanged = callback; return { data: { subscription: { unsubscribe: mockUnsubscribe } } } },
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

describe('Package A settings', () => {
  beforeEach(() => {
    jest.spyOn(featureFlags, 'simplePremiumExperience', 'get').mockReturnValue(true)
    jest.spyOn(featureFlags, 'importStatement', 'get').mockReturnValue(false)
    jest.mocked(getNotificationPreferences).mockResolvedValue({ enabled: true, daily_reminder_enabled: true, bill_reminder_enabled: true, budget_alert_enabled: true } as any)
    jest.mocked(updateNotificationPreferences).mockReset()
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null)
  })
  it.each([
    ['enabled', 'enabled'], ['daily', 'daily_reminder_enabled'],
    ['bills', 'bill_reminder_enabled'], ['budget', 'budget_alert_enabled'],
  ])('saves and rolls back %s with an ordinary-toggle retry', async (id, key) => {
    jest.mocked(updateNotificationPreferences).mockRejectedValueOnce(new Error('offline'))
    const screen = await renderSettings()
    await waitFor(() => expect(screen.getByTestId(`settings-notification-${id}`).props.accessibilityState.disabled).toBe(false))
    fireEvent.press(screen.getByTestId(`settings-notification-${id}`))
    await waitFor(() => expect(screen.getByTestId('settings-notification-error')).toBeTruthy())
    expect(screen.getByTestId(`settings-notification-${id}`).props.accessibilityState.checked).toBe(true)
    jest.mocked(updateNotificationPreferences).mockResolvedValueOnce({ [key]: false } as any)
    fireEvent.press(screen.getByTestId(`settings-notification-${id}`))
    await waitFor(() => expect(screen.getByTestId(`settings-notification-${id}`).props.accessibilityState).toMatchObject({ checked: false, disabled: false }))
    expect(updateNotificationPreferences).toHaveBeenLastCalledWith(mockSupabase, { [key]: false })
  })
  it('ignores old-account writes after switching user and releases the new account lock', async () => {
    let finish!: (value: any) => void
    jest.mocked(updateNotificationPreferences).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const screen = await renderSettings()
    await waitFor(() => expect(screen.getByTestId('settings-notification-daily').props.accessibilityState.disabled).toBe(false))
    fireEvent.press(screen.getByTestId('settings-notification-daily'))
    expect(screen.getByTestId('settings-notification-budget').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(screen.getByTestId('settings-notification-budget'))
    expect(updateNotificationPreferences).toHaveBeenCalledTimes(1)
    await act(async () => mockAuthChanged('SIGNED_IN', { user: { id: 'new-user' } }))
    await waitFor(() => expect(screen.getByTestId('settings-notification-daily').props.accessibilityState.disabled).toBe(false))
    await act(async () => finish({ daily_reminder_enabled: false }))
    expect(screen.getByTestId('settings-notification-daily').props.accessibilityState.checked).toBe(true)
    screen.unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
  it('retries load failures rather than presenting unsaved local preferences', async () => {
    jest.mocked(getNotificationPreferences).mockRejectedValueOnce(new Error('offline'))
    const screen = await renderSettings()
    await waitFor(() => expect(screen.getByTestId('settings-notification-error')).toBeTruthy())
    expect(screen.getByTestId('settings-notification-daily').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(screen.getByTestId('settings-notification-retry'))
    await waitFor(() => expect(screen.getByTestId('settings-notification-enabled').props.accessibilityState.disabled).toBe(false))
    expect(screen.queryByTestId('settings-notification-error')).toBeNull()
  })
  it('reconciles a saved server value when the save response is lost', async () => {
    const screen = await renderSettings()
    await waitFor(() => expect(screen.getByTestId('settings-notification-daily').props.accessibilityState.disabled).toBe(false))
    jest.mocked(getNotificationPreferences).mockResolvedValueOnce({ enabled: true, daily_reminder_enabled: false, bill_reminder_enabled: true, budget_alert_enabled: true } as any)
    jest.mocked(updateNotificationPreferences).mockRejectedValueOnce(new Error('response lost'))
    fireEvent.press(screen.getByTestId('settings-notification-daily'))
    await waitFor(() => expect(screen.getByTestId('settings-notification-daily').props.accessibilityState).toMatchObject({ checked: false, busy: false }))
    expect(screen.queryByTestId('settings-notification-error')).toBeNull()
  })
  it('opens the localized guide from Settings without leaving the app', async () => {
    const screen = await renderSettings()
    fireEvent.press(screen.getByTestId('settings-help-guide'))
    expect(mockPush).toHaveBeenCalledWith('/help')
  })
  it('retains premium groups and capabilities, puts logout last, and honestly labels preferences', async () => {
    const screen = await renderSettings()
    expect(screen.getAllByRole('header').map(node => node.props.children)).toEqual(['Akun', 'Pencatatan', 'Data', 'Preferensi', 'Bantuan'])
    expect(screen.getByText('Anggaran kategori')).toBeTruthy()
    expect(screen.getByText('Atur batas pengeluaran per kategori.')).toBeTruthy()
    expect(screen.getByTestId('settings-appearance-row')).toBeTruthy()
    expect(screen.getByText('Terang')).toBeTruthy()
    expect(screen.queryByTestId('settings-theme-dark')).toBeNull()
    expect(screen.queryByTestId('settings-theme-system')).toBeNull()
    for (const id of ['settings-profile', 'settings-account-security', 'settings-plan', 'settings-family', 'settings-account-deletion', 'settings-notification-inbox', 'settings-legal']) expect(screen.getByTestId(id)).toBeTruthy()
    const ids = screen.UNSAFE_root.findAll((node: { type: unknown; props: { testID?: string } }) => typeof node.type === 'string' && Boolean(node.props.testID)).map((node: { props: { testID: string } }) => node.props.testID)
    expect(ids.indexOf('settings-logout')).toBeGreaterThan(ids.indexOf('settings-legal'))
    expect(screen.queryByTestId('settings-language-sheet')).toBeNull()
    fireEvent.press(screen.getByTestId('settings-language-row'))
    expect(screen.getByTestId('settings-language-sheet')).toBeTruthy()
    expect(screen.getByTestId('settings-language-id').props.accessibilityState.selected).toBe(true)
    fireEvent.press(screen.getByTestId('settings-language-en'))
    expect(screen.getByText('Category budgets')).toBeTruthy()
    expect(screen.getByText('Light')).toBeTruthy()
    expect(screen.queryByTestId('settings-language-sheet')).toBeNull()
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('kaswise:language-preference', 'en'))
  })
  it('rolls back failed daily saves, prevents double presses and permits retry', async () => {
    let reject!: (error: Error) => void
    jest.mocked(updateNotificationPreferences).mockImplementationOnce(() => new Promise((_, no) => { reject = no }))
    const screen = await renderSettings()
    await waitFor(() => expect(screen.getByTestId('settings-notification-daily').props.accessibilityState.disabled).toBe(false))
    const toggle = screen.getByRole('switch', { name: 'Pengingat Harian' })
    fireEvent.press(toggle)
    fireEvent.press(toggle)
    expect(updateNotificationPreferences).toHaveBeenCalledTimes(1)
    expect(toggle.props.accessibilityState).toMatchObject({ disabled: true, busy: true, checked: false })
    await act(async () => reject(new Error('offline')))
    expect(screen.getByTestId('settings-notification-error')).toBeTruthy()
    expect(toggle.props.accessibilityState.checked).toBe(true)
    jest.mocked(updateNotificationPreferences).mockResolvedValueOnce({ daily_reminder_enabled: false } as any)
    fireEvent.press(toggle)
    await waitFor(() => expect(toggle.props.accessibilityState).toMatchObject({ busy: false, checked: false }))
    expect(screen.queryByTestId('settings-notification-error')).toBeNull()
  })
})
