import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { OperationalHero } from './OperationalHero'

function flattened(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style) ?? {}
}

describe('OperationalHero', () => {
  it.each(['fullBleed', 'compact', 'analytics'] as const)(
    'uses the canonical lower radius for the %s variant',
    (variant) => {
      render(
        <OperationalHero testID={`hero-${variant}`} variant={variant}>
          {variant}
        </OperationalHero>,
      )

      expect(flattened(`hero-${variant}`)).toEqual(
        expect.objectContaining({
          borderBottomLeftRadius: 42,
          borderBottomRightRadius: 42,
          overflow: 'hidden',
        }),
      )
    },
  )

  it('provides stable geometry for each operational use case', () => {
    render(
      <>
        <OperationalHero testID="full" variant="fullBleed">Full</OperationalHero>
        <OperationalHero testID="compact" variant="compact">Compact</OperationalHero>
        <OperationalHero testID="analytics" variant="analytics">Analytics</OperationalHero>
      </>,
    )

    expect(flattened('full')).toEqual(expect.objectContaining({ marginHorizontal: -20 }))
    expect(flattened('compact')).toEqual(expect.objectContaining({ minHeight: 124 }))
    expect(flattened('analytics')).toEqual(
      expect.objectContaining({ marginHorizontal: -20, marginTop: -20, paddingBottom: 48 }),
    )
  })
})
