import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { LegalInfoScreen } from '../src/components/legal/LegalInfoScreen';
import { mobileLegalPages } from '../src/content/legal-pages';


let mockLanguage: 'id' | 'en' = 'id';
jest.mock('../src/i18n/i18n-context', () => ({ useI18n: () => ({ language: mockLanguage }) }));
jest.mock('../src/theme/theme-context', () => ({ useTheme: () => ({ theme: require('../src/theme/mobile-theme').toMobileTheme('light') }) }));
jest.mock('../src/components/brand/KaswiseLogoMark', () => ({ KaswiseLogoMark: () => null }));

describe('Help language and safe guidance', () => {
  it.each(['id', 'en'] as const)('renders %s guide and preserves email support', (language) => {
    mockLanguage = language;
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    render(<LegalInfoScreen page="help" />);
    expect(screen.getByText(language === 'id' ? 'Catat dengan teks' : 'Record with text')).toBeTruthy();
    expect(screen.getByText(language === 'id' ? 'Catat dari struk' : 'Record from receipts')).toBeTruthy();
    expect(screen.getByText(language === 'id' ? 'Kelola dompet' : 'Manage wallets')).toBeTruthy();
    expect(screen.getByText(language === 'id' ? 'Baca laporan' : 'Read reports')).toBeTruthy();
    expect(screen.queryByText(/Track A|OCR|rollout|voice|suara/i)).toBeNull();
    expect(screen.getByText(language === 'id' ? /Periksa hasil pencatatan/ : /Check the recorded result/)).toBeTruthy();
    fireEvent.press(screen.getByText(language === 'id' ? 'Email bantuan' : 'Email support'));
    expect(open).toHaveBeenCalledWith(mobileLegalPages.help.ctaHref);
    open.mockRestore();
  });
  it.each(['terms', 'privacy'] as const)('keeps %s legal content unchanged in either locale', (page) => {
    mockLanguage = 'en';
    render(<LegalInfoScreen page={page} />);
    expect(screen.getByText(mobileLegalPages[page].title)).toBeTruthy();
    for (const section of mobileLegalPages[page].sections) expect(screen.getByText(section.body)).toBeTruthy();
  });
});
