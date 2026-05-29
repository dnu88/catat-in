import { isIgnoredGoLiveConsoleError } from '../tests/golive/console-errors';

describe('go-live Playwright helpers', () => {
  test('ignores only known unauthenticated Supabase auth-session console noise', () => {
    expect(isIgnoredGoLiveConsoleError('AuthSessionMissingError: Auth session missing!')).toBe(true);
    expect(isIgnoredGoLiveConsoleError('Supabase auth: Auth session missing')).toBe(true);
    expect(isIgnoredGoLiveConsoleError('PostgrestError: null value in column "balance" violates not-null constraint')).toBe(false);
    expect(isIgnoredGoLiveConsoleError('Failed to save transaction')).toBe(false);
  });
});
