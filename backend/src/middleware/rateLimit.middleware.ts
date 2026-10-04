import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { AuthRequest } from "./auth.middleware.js";

const readLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const MINUTE = 60 * 1000;

const tooMany = (message: string) => ({ success: false, message });

const shared = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
} as const;

// Every /api request, per IP. The portal polls every 10s, and a venue may
// put several devices behind one IP, so this is generous.
export const generalLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: readLimit(process.env.GENERAL_RATE_LIMIT_MAX, 1000),
  message: tooMany("Too many requests. Please slow down and try again shortly."),
});

// /api/auth/* (login, signup, OTP), per IP. Counts every attempt, so
// password and OTP guessing are both throttled.
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: readLimit(process.env.AUTH_RATE_LIMIT_MAX, 10),
  message: tooMany(
    "Too many sign-in attempts. Please wait a few minutes and try again.",
  ),
});

// POST /api/complaints, per signed-in user. Must run after authenticate()
// and before the upload middleware so rejected requests store no files.
export const complaintCreateLimiter = rateLimit({
  ...shared,
  windowMs: 60 * MINUTE,
  limit: readLimit(process.env.COMPLAINT_RATE_LIMIT_MAX, 20),
  keyGenerator: (req) =>
    (req as AuthRequest).userId ?? ipKeyGenerator(req.ip ?? ""),
  message: tooMany(
    "You have submitted a lot of reports recently. Please try again later.",
  ),
});
