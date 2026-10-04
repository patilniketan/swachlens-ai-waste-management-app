import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/jwt.js";
import { HttpError } from "../utils/httpError.js";
import { sendOtpEmail } from "./email.service.js";

// DEMO_MODE=true: signup creates verified accounts and no OTP email is sent.
const DEMO_MODE = process.env.DEMO_MODE === "true";

if (DEMO_MODE) {
  console.log("DEMO_MODE=true: signup skips OTP verification.");
}

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 6;

// Generic messages so responses never reveal whether an email is registered.
const SIGNUP_SENT_MESSAGE =
  "If this email can be registered, a verification code has been sent to it.";
const OTP_SENT_MESSAGE =
  "If an unverified account exists for this email, a new verification code has been sent.";
const INVALID_OTP_MESSAGE = "Invalid or expired verification code.";
const INVALID_LOGIN_MESSAGE = "Invalid email or password";

interface SignupInput {
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateOtp = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

// Keyed hash: a leaked database alone is not enough to brute-force codes.
const hashOtp = (email: string, otp: string) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET as string)
    .update(`${email}:${otp}`)
    .digest("hex");

const otpMatches = (email: string, otp: string, storedHash: string) => {
  const candidate = Buffer.from(hashOtp(email, otp), "hex");
  const stored = Buffer.from(storedHash, "hex");

  return (
    candidate.length === stored.length &&
    crypto.timingSafeEqual(candidate, stored)
  );
};

// Sends a fresh code, then stores its hash. If sending fails nothing changes.
const issueOtp = async (email: string) => {
  const otp = generateOtp();

  await sendOtpEmail(email, otp);

  await prisma.user.update({
    where: { email },
    data: {
      otpHash: hashOtp(email, otp),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
    },
  });
};

const isUniqueViolation = (error: unknown) =>
  (error as { code?: unknown })?.code === "P2002";

export const signup = async ({ email: rawEmail, password }: SignupInput) => {
  const email = normalizeEmail(rawEmail);

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (DEMO_MODE) {
    if (existingUser) {
      throw new HttpError(400, "Unable to create an account with these details.");
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        role: "CITIZEN",
        isVerified: true,
      },
    });

    return {
      requiresVerification: false,
      message: "Account created. You can log in now.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  if (existingUser) {
    // Same response either way; an unverified account just gets a new code.
    if (!existingUser.isVerified) {
      await issueOtp(email);
    }

    return { requiresVerification: true, message: SIGNUP_SENT_MESSAGE };
  }

  // Send the email before persisting, so a failed send leaves no
  // half-created account behind.
  const otp = generateOtp();

  await sendOtpEmail(email, otp);

  try {
    await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        role: "CITIZEN",
        isVerified: false,
        otpHash: hashOtp(email, otp),
        otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        otpAttempts: 0,
      },
    });
  } catch (error) {
    // A concurrent signup for the same email won the race.
    if (!isUniqueViolation(error)) throw error;
  }

  return { requiresVerification: true, message: SIGNUP_SENT_MESSAGE };
};

export const login = async ({ email: rawEmail, password }: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(rawEmail) },
  });

  if (!user || !user.password) {
    throw new HttpError(401, INVALID_LOGIN_MESSAGE);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new HttpError(401, INVALID_LOGIN_MESSAGE);
  }

  if (!DEMO_MODE && !user.isVerified) {
    throw new HttpError(
      403,
      "Please verify your email with the code we sent before logging in.",
    );
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

export const getCurrentUser = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });
};

// Idempotent: always returns the same message. Only unverified accounts
// receive a new code.
export const sendOtp = async (rawEmail: string) => {
  const email = normalizeEmail(rawEmail);

  if (!DEMO_MODE) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && !user.isVerified) {
      await issueOtp(email);
    }
  }

  return { message: OTP_SENT_MESSAGE };
};

export const verifyOtp = async (rawEmail: string, otp: string) => {
  const email = normalizeEmail(rawEmail);

  // Atomically use up one attempt. Parallel guesses cannot exceed the limit,
  // and expired / exhausted / missing codes all fail here identically.
  const claimed = await prisma.user.updateMany({
    where: {
      email,
      isVerified: false,
      otpHash: { not: null },
      otpExpiresAt: { gt: new Date() },
      otpAttempts: { lt: MAX_OTP_ATTEMPTS },
    },
    data: { otpAttempts: { increment: 1 } },
  });

  const user =
    claimed.count === 1
      ? await prisma.user.findUnique({ where: { email } })
      : null;

  if (!user?.otpHash || !otpMatches(email, String(otp).trim(), user.otpHash)) {
    if (user && user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await prisma.user.update({
        where: { email },
        data: { otpHash: null, otpExpiresAt: null },
      });
    }

    throw new HttpError(400, INVALID_OTP_MESSAGE);
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    isVerified: updatedUser.isVerified,
  };
};
