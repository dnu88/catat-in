import { render } from '@testing-library/react-native'
import { KaswiseIcon, kaswiseIconNames } from './kaswise-icons'

describe('KaswiseIcon', () => {
  it('exposes required app icon names', () => {
    expect(kaswiseIconNames).toEqual(
      expect.arrayContaining([
        'home',
        'transactions',
        'capture',
        'reports',
        'settings',
        'wallets',
        'budgets',
        'bills',
        'groups',
        'imports',
        'lock',
        'email',
        'back',
      ]),
    )
  })

  it('renders a fallback icon for unknown icon names', () => {
    const { getByTestId } = render(
      <KaswiseIcon name={'missing' as never} color="#6366F1" size={20} testID="icon" />,
    )

    expect(getByTestId('icon')).toBeTruthy()
  })
})
