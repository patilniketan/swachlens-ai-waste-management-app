import {
  API_BASE_URL,
  REQUEST_TIMEOUT_MS,
  SERVER_ORIGIN,
} from '../constants/config';
import { getToken, clearSession } from '../utils/storage';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * A normalized application-level error. Every consumer of apiRequest()
 * can rely on `.message` being safe to show to the user and `.status`
 * being present for callers that need to branch on HTTP status.
 */
export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status = 0, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  formData?: FormData;
  authenticated?: boolean;
  /**
   * Called when the server responds 401. Defaults to clearing the stored
   * session so the app can redirect to Login. Screens can pass a custom
   * handler (e.g. to trigger navigation) via this hook.
   */
  onUnauthorized?: () => void | Promise<void>;
}

function friendlyMessageForStatus(
  status: number,
  backendMessage?: string,
): string {
  if (backendMessage) return backendMessage;
  switch (status) {
    case 400:
      return 'That request was invalid. Please check the information and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'This conflicts with existing data. Please try again.';
    case 500:
    case 502:
    case 503:
      return 'Something went wrong on our end. Please try again shortly.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

/**
 * Reusable request function used by every service in the app.
 *
 * - Automatically attaches the JWT Authorization header when `authenticated`
 *   is true (default) and a token exists in AsyncStorage.
 * - Supports both JSON bodies and multipart FormData uploads.
 * - Parses JSON responses and throws a normalized ApiError on failure.
 * - On 401, clears the stored session so the app can redirect to Login.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    formData,
    authenticated = true,
    onUnauthorized,
  } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!formData) {
    headers['Content-Type'] = 'application/json';
  }
  // Important: when sending FormData, we deliberately do NOT set
  // Content-Type — React Native's fetch will set the correct
  // multipart/form-data boundary automatically.

  if (authenticated) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const { signal, cancel } = withTimeout(REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (err: any) {
    cancel();
    if (err?.name === 'AbortError') {
      throw new ApiError(
        'The request timed out. Please check your connection and try again.',
        0,
        true,
      );
    }
    throw new ApiError(
      'Could not reach the server. Please check your connection and try again.',
      0,
      true,
    );
  }
  cancel();

  let payload: any = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // Non-JSON response body — leave payload null, we'll fall back to status text.
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      await clearSession();
      if (onUnauthorized) {
        await onUnauthorized();
      }
    }
    const backendMessage = payload?.message;
    throw new ApiError(
      friendlyMessageForStatus(response.status, backendMessage),
      response.status,
    );
  }

  return payload as T;
}

/** Resolves a possibly-relative image path returned by the backend into a full URL. */
export function resolveImageUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SERVER_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
