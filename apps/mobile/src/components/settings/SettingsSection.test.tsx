import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ThemeProvider } from '../../theme/theme-context'
import { SettingsSection } from './SettingsSection'

describe('SettingsSection', () => {
  it('renders a section heading, supporting copy, and children', () => {
    const screen = render(
      <ThemeProvider>
        <SettingsSection title="Keuangan" description="Kelola kebutuhan keuangan Anda.">
          <Text>Dompet & akun</Text>
        </SettingsSection>
      </ThemeProvider>,
    )

    expect(screen.getByRole('header', { name: 'Keuangan' })).toBeTruthy()
    expect(screen.getByText('Kelola kebutuhan keuangan Anda.')).toBeTruthy()
    expect(screen.getByText('Dompet & akun')).toBeTruthy()
  })
})
