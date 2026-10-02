import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { type AuthRequest } from "../middleware/auth.middleware.js";
import { HttpError } from "../utils/httpError.js";

// Only HttpError messages are shown to clients; anything else is logged
// and replaced with a generic message.
const sendError = (
  res: Response,
  error: unknown,
  label: string,
  fallbackMessage: string,
) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  console.error(`${label} ERROR:`, error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authService.signup({
      email: String(email),
      password: String(password),
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, "SIGNUP", "Signup failed. Please try again.");
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authService.login({
      email: String(email),
      password: String(password),
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    return sendError(res, error, "LOGIN", "Login failed. Please try again.");
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await authService.getCurrentUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await authService.sendOtp(String(email));

    return res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "SEND OTP",
      "Could not send a verification code. Please try again.",
    );
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body ?? {};

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const result = await authService.verifyOtp(String(email), String(otp));

    return res.json({
      success: true,
      message: "OTP verified successfully",
      data: result,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "VERIFY OTP",
      "Verification failed. Please try again.",
    );
  }
};
