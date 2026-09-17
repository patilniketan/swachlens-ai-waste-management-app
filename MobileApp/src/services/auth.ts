import { apiRequest } from './api';
import { saveToken, saveUser, clearSession, getUser } from '../utils/storage';
import type {
  ApiEnvelope,
  LoginRequest,
  LoginResponseData,
  SignupRequestOtpRequest,
  SignupVerifyOtpRequest,
  User,
} from '../types/auth';

export async function login(payload: LoginRequest): Promise<User | undefined> {
  const res = await apiRequest<ApiEnvelope<LoginResponseData>>('/auth/login', {
    method: 'POST',
    body: payload,
    authenticated: false,
  });

  const data = res?.data;
  if (!data?.token) {
    throw new Error('Login succeeded but no session token was returned.');
  }

  await saveToken(data.token);
  if (data.user) {
    await saveUser(data.user);
  }
  return data.user;
}

/** Requests an OTP be sent to the given email as the first step of signup. */
export async function requestSignupOtp(
  payload: SignupRequestOtpRequest,
): Promise<void> {
  await apiRequest<ApiEnvelope<null>>('/auth/send-otp', {
    method: 'POST',
    body: {
      email: payload.email,
    },
    authenticated: false,
  });
}

export async function verifySignupOtp(
  payload: SignupVerifyOtpRequest,
): Promise<void> {
  await apiRequest<ApiEnvelope<null>>('/auth/verify-otp', {
    method: 'POST',
    body: {
      email: payload.email,
      otp: payload.otp,
    },
    authenticated: false,
  });
}

export async function logout(): Promise<void> {
  await clearSession();
}

export async function getCurrentUser(): Promise<User | null> {
  return getUser();
}
