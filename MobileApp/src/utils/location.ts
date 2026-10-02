import { Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import type { Coordinates } from '../types/complaint';
import { DEMO_LOCATION_OVERRIDE } from '../constants/config';

/** True when reports use the configured demo location, not GPS. */
export const usingDemoLocation = DEMO_LOCATION_OVERRIDE !== null;

const LOCATION_PERMISSION = Platform.select({
  android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
}) as any;

export type LocationPermissionState = 'granted' | 'denied' | 'blocked' | 'unavailable';

export async function ensureLocationPermission(): Promise<LocationPermissionState> {
  if (!LOCATION_PERMISSION) return 'unavailable';

  const existing = await check(LOCATION_PERMISSION);
  if (existing === RESULTS.GRANTED) return 'granted';
  if (existing === RESULTS.BLOCKED) return 'blocked';

  const result = await request(LOCATION_PERMISSION);
  if (result === RESULTS.GRANTED) return 'granted';
  if (result === RESULTS.BLOCKED) return 'blocked';
  return 'denied';
}

export function getCurrentCoordinates(): Promise<Coordinates> {
  if (DEMO_LOCATION_OVERRIDE) {
    return Promise.resolve({ ...DEMO_LOCATION_OVERRIDE });
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error.message || 'Unable to determine your location.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

/** Haversine distance in kilometers — used as a client-side fallback if the
 * backend does not already include a `distanceKm` field on nearby results. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}
