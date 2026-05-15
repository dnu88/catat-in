import { render } from '@testing-library/react-native'
import { ThemeProvider } from './src/theme/theme-context'
import { Button } from './src/components/ui/Button'

const mockPush = jest.fn()
const mockRouter = { push: mockPush }
const mockUseRouter = jest.fn(() => mockRouter)

jest.mock('expo-router', () => ({
  useRouter: mockUseRouter,
}))

describe('Mobile UI foundation', () => {
  it('should run a dummy test', () => {
    expect(1 + 1).toBe(2)
  })

  it('renders mobile ui button primitive', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Button label="Test Button" onPress={() => {}} />
      </ThemeProvider>,
    )

    expect(getByText('Test Button')).toBeTruthy()
  })
})
