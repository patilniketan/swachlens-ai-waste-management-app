import { Platform } from 'react-native';

/**
 * Centralized environment configuration.
 *
 * To point the app at a different backend, edit API_HOST_OVERRIDE below
 * (the only line you should need to touch):
 *
 *  - Android Emulator         -> leave null (uses http://10.0.2.2:5000)
 *  - iOS Simulator            -> leave null (uses http://localhost:5000)
 *  - Physical device on Wi-Fi -> 'http://<your-machine-lan-ip>:5000'
 *                                e.g. 'http://192.168.1.42:5000'
 *                                (find it with `ipconfig` on Windows,
 *                                 `ipconfig getifaddr en0` on macOS)
 *  - Deployed backend         -> 'https://your-domain.com'
 *
 * Nothing else in the app should hardcode a base URL.
 */
const API_HOST_OVERRIDE: string | null = null;

const DEFAULT_API_HOST = Platform.select({
  android: 'http://10.0.2.2:5000',
  default: 'http://localhost:5000',
});

// Used to resolve relative image paths returned by the backend (e.g. "/uploads/foo.jpg")
export const SERVER_ORIGIN = (API_HOST_OVERRIDE ?? DEFAULT_API_HOST).replace(
  /\/+$/,
  '',
);

export const API_BASE_URL = `${SERVER_ORIGIN}/api`;

export const REQUEST_TIMEOUT_MS = 15000;

export const NEARBY_DEFAULT_RADIUS_KM = 5;

export const STORAGE_KEYS = {
  TOKEN: '@waste_app/token',
  USER: '@waste_app/user',
};
