/**
 * Centralized environment configuration.
 *
 * Change API_BASE_URL here when moving between:
 *  - Android Emulator      -> http://10.0.2.2:5000/api
 *  - Physical Android device -> http://<your-machine-lan-ip>:5000/api
 *  - iOS Simulator         -> http://localhost:5000/api
 *  - Production            -> https://your-production-domain.com/api
 *
 * Nothing else in the app should hardcode a base URL.
 */

export const API_BASE_URL = 'http://10.0.2.2:5000/api';

// Used to resolve relative image paths returned by the backend (e.g. "/uploads/foo.jpg")
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const REQUEST_TIMEOUT_MS = 15000;

export const NEARBY_DEFAULT_RADIUS_KM = 5;

export const STORAGE_KEYS = {
  TOKEN: '@waste_app/token',
  USER: '@waste_app/user',
};
