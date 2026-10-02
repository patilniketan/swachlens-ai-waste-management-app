import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';
import type { User } from '../types/auth';

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
}

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Clears the JWT and cached user — used on logout and on 401 responses. */
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeMany([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
}

export async function hasValidSession(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
