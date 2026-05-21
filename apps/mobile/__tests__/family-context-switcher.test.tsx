import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { FinanceContextSwitcher } from '../src/components/FinanceContextSwitcher'
import { ThemeProvider } from '../src/theme/theme-context'

const mockSetPersonalContext = jest.fn()
const mockSetActiveHousehold = jest.fn()

jest.mock('../src/state/finance-context', () => ({
  useFinanceContext: () => ({
    activeContext: { type: 'personal' },
    memberships: [
      {
        household_id: 'hh-1',
        role: 'admin',
        households: { name: 'Keluarga Budi' },
      },
    ],
    setPersonalContext: mockSetPersonalContext,
    setActiveHousehold: mockSetActiveHousehold,
  }),
}))

describe('FinanceContextSwitcher', () => {
  beforeEach(() => {
    mockSetPersonalContext.mockClear()
    mockSetActiveHousehold.mockClear()
  })

  it('shows personal and household choices', () => {
    render(
      <ThemeProvider>
        <FinanceContextSwitcher />
      </ThemeProvider>,
    )

    expect(screen.getByText('Pribadi')).toBeTruthy()
    fireEvent.press(screen.getByTestId('finance-context-switcher'))
    expect(screen.getByTestId('finance-context-option-personal')).toBeTruthy()
    expect(screen.getByTestId('finance-context-option-personal').props.accessibilityState).toEqual({ selected: true })
    expect(screen.getByText('Keluarga Budi')).toBeTruthy()
    expect(screen.getByTestId('finance-context-option-hh-1').props.accessibilityState).toEqual({ selected: false })
    fireEvent.press(screen.getByTestId('finance-context-option-hh-1'))
    expect(mockSetActiveHousehold).toHaveBeenCalledWith('hh-1')
  })
})
