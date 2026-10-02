/* eslint-env jest */
// Mocks for native modules that do not exist in the Jest environment.

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async key => {
        store.delete(key);
      }),
      removeMany: jest.fn(async keys => {
        keys.forEach(key => store.delete(key));
      }),
      clear: jest.fn(async () => store.clear()),
    },
  };
});

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION', CAMERA: 'android.permission.CAMERA' },
    IOS: { LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE', CAMERA: 'ios.permission.CAMERA' },
  },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked', LIMITED: 'limited', UNAVAILABLE: 'unavailable' },
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
  openSettings: jest.fn(async () => undefined),
}));

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(success =>
      success({ coords: { latitude: 28.5689, longitude: 77.239, accuracy: 10 } }),
    ),
    watchPosition: jest.fn(() => 1),
    clearWatch: jest.fn(),
    requestAuthorization: jest.fn(),
    setRNConfiguration: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ didCancel: true })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = props => React.createElement(View, props, props.children);
  return { __esModule: true, default: Mock, Marker: Mock, Circle: Mock, Callout: Mock, PROVIDER_GOOGLE: 'google' };
});
