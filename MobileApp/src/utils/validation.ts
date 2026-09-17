const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export function validateOtp(otp: string): string | null {
  if (!otp.trim()) return 'Enter the OTP sent to your email.';
  if (!/^\d{6}$/.test(otp.trim())) return 'Enter a valid 6-digit OTP.';
  return null;
}

export function validateDescription(description: string): string | null {
  if (!description.trim()) return 'Please describe the issue.';
  if (description.trim().length < 10) return 'Please add a little more detail (10+ characters).';
  return null;
}

export function validateAddress(address: string): string | null {
  if (!address.trim()) return 'Please enter or confirm an address.';
  return null;
}
