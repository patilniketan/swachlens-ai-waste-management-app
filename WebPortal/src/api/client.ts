import axios, { AxiosError } from "axios";
import { clearSession, getToken } from "../auth/session";

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

// Origin serving /uploads (the API URL without its /api suffix).
export const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, "");

// Turns "/uploads/x.png" from the API into a loadable URL.
export const assetUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;

  return `${SERVER_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
};

// No default Content-Type: axios sets JSON for objects and the multipart
// boundary for FormData itself.
export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Set by the app: where to go when the session is no longer valid.
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // A 401 from /auth/login is just "wrong password", not an expired session.
    const isLogin = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLogin) {
      clearSession();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

// API envelope: { success, message?, data, ... }
export interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const unwrap = async <T>(request: Promise<{ data: Envelope<T> }>) =>
  (await request).data.data;

// A message that is safe to show to the user.
export const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;

    if (typeof message === "string" && message) return message;
    if (!error.response) return "Cannot reach the server. Check that the API is running.";
    if (error.response.status === 429) return "Too many requests. Please wait a moment.";

    return `Request failed (${error.response.status}).`;
  }

  return error instanceof Error ? error.message : "Something went wrong.";
};
