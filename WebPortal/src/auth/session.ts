import type { AuthUser, UserRole } from "../types";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as Partial<AuthUser>) : null;

    return user?.id && user.email && user.role ? (user as AuthUser) : null;
  } catch {
    return null;
  }
};

export const saveSession = (token: string, user: AuthUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Portal roles. Citizens use the mobile app.
export const PORTAL_ROLES: UserRole[] = ["ADMIN", "STAFF"];

export const homeFor = (role: UserRole | undefined) =>
  role === "STAFF" ? "/my-tasks" : role === "ADMIN" ? "/dashboard" : "/login";
