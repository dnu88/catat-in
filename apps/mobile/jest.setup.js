// Supabase Realtime requires a WebSocket constructor in Node 20 test runs.
if (!global.WebSocket) {
  global.WebSocket = class MockWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
    }
    close() {
      this.readyState = 3;
    }
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

// Mock AsyncStorage globally
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn((keys) => Promise.resolve(keys.map((key) => [key, null]))),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    },
  },
}));

// Keep entrance motion deterministic in tests and disable runtime animations by
// default. Individual motion tests can still spy on these methods when they need
// to exercise resolved preferences.
const mockRnActual = require('react-native');
const { AccessibilityInfo } = mockRnActual;

const mockAnimatedShim = (() => {
  const mockAnimatedBase = mockRnActual.Animated || {};
  if (mockAnimatedBase.Value) {
    return mockAnimatedBase;
  }

  const AnimatedValue = class {
    constructor(value) {
      this._value = value;
    }
    setValue(value) {
      this._value = value;
    }
    addListener() {
      return 'animated-listener';
    }
    removeAllListeners() {}
    interpolate() {
      return this;
    }
  };

  return {
    ...mockAnimatedBase,
    View: mockAnimatedBase.View ?? mockRnActual.View,
    Text: mockAnimatedBase.Text ?? mockRnActual.Text,
    Image: mockAnimatedBase.Image ?? mockRnActual.Image,
    ScrollView: mockAnimatedBase.ScrollView ?? mockRnActual.ScrollView,
    FlatList: mockAnimatedBase.FlatList ?? mockRnActual.FlatList,
    SectionList: mockAnimatedBase.SectionList ?? mockRnActual.SectionList,
    Modal: mockAnimatedBase.Modal ?? mockRnActual.Modal,
    Pressable: mockAnimatedBase.Pressable ?? mockRnActual.Pressable,
    Value: AnimatedValue,
    timing: mockAnimatedBase.timing ?? (() => ({ start: (cb) => cb?.({ finished: true }) })),
    spring: mockAnimatedBase.spring ?? (() => ({ start: (cb) => cb?.({ finished: true }) })),
    createAnimatedComponent: mockAnimatedBase.createAnimatedComponent ?? ((Component) => Component),
    event: mockAnimatedBase.event ?? (() => () => {}),
    sequence: mockAnimatedBase.sequence ?? ((animations) => ({ start: (cb) => cb?.({ finished: true }), animations })),
    parallel: mockAnimatedBase.parallel ?? ((animations) => ({ start: (cb) => cb?.({ finished: true }), animations })),
    delay: mockAnimatedBase.delay ?? (() => ({ start: (cb) => cb?.({ finished: true }) })),
  };
})();

try {
  Object.defineProperty(mockRnActual, 'Animated', {
    value: mockAnimatedShim,
    configurable: true,
    enumerable: true,
    writable: true,
  });
} catch {
  mockRnActual.Animated = mockAnimatedShim;
}

AccessibilityInfo.isReduceMotionEnabled = jest.fn(() => Promise.resolve(true));
AccessibilityInfo.addEventListener = jest.fn(() => ({ remove: jest.fn() }));


// React Native tests in this suite intentionally render screens that kick off
// passive async effects. Keep Jest output actionable by filtering React's generic
// act(...) noise while preserving all other console.error messages.
const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  const firstArg = args[0];
  if (
    typeof firstArg === 'string' &&
    firstArg.includes('not wrapped in act')
  ) {
    return;
  }
  originalConsoleError(...args);
};
