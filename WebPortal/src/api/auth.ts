import { apiClient, type Envelope } from "./client";
import { clearSession, PORTAL_ROLES, saveSession } from "../auth/session";
import type { AuthUser } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
}

// Signs in and stores the session. Citizens are refused: they use the app.
export const login = async (payload: LoginPayload): Promise<AuthUser> => {
  const response = await apiClient.post<Envelope<{ user: AuthUser; token: string }>>(
    "/auth/login",
    payload,
  );

  const { user, token } = response.data.data;

  if (!PORTAL_ROLES.includes(user.role)) {
    throw new Error("This portal is for municipal staff. Citizens can report waste in the SwachhLens AI app.");
  }

  saveSession(token, user);

  return user;
};

export const logout = () => {
  clearSession();
};
