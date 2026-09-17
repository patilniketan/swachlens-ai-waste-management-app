export type UserRole = 'CITIZEN' | 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  token: string;
  user?: User;
}

export interface SignupRequestOtpRequest {
  email: string;
}

export interface SignupVerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}
