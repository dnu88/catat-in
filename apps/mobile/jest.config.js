module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry[/+].*))"
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Playwright-driven e2e/preview specs are not jest suites. `tests/golive/`
  // held the only ones until the local preview harness added `tests/experience/`
  // (run it with `pnpm exec playwright test -c playwright.experience.config.ts`);
  // without this entry jest collects those specs and reports them as failures.
  testPathIgnorePatterns: ['<rootDir>/tests/golive/', '<rootDir>/tests/experience/'],
  moduleNameMapper: {
    '^@react-native/assets-registry/registry$': '<rootDir>/node_modules/@react-native/assets-registry/registry.js',
  },
  collectCoverageFrom: ['src/services/**/*.ts', 'src/state/**/*.tsx'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },
};
