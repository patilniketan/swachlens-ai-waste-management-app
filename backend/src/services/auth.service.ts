import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";
import { sendOtpEmail } from "./email.service.js";

interface SignupInput {
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const signup = async ({ email, password }: SignupInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "CITIZEN",
      otp,
      otpExpiresAt,
      isVerified: false,
    },
  });

  await sendOtpEmail(email, otp);

  return {
    message: "Signup successful. OTP sent to your email.",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
};

export const login = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    throw new Error("Invalid email or password");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
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

export const sendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpiresAt,
    },
  });

  // Send the OTP to the user's email.
  await sendOtpEmail(email, otp);

  return {
    message: "OTP sent successfully",
    expiresAt: otpExpiresAt,
  };
};

export const verifyOtp = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.otp || !user.otpExpiresAt) {
    throw new Error("OTP not found");
  }

  if (new Date() > user.otpExpiresAt) {
    throw new Error("OTP has expired");
  }

  if (user.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      otp: null,
      otpExpiresAt: null,
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    isVerified: updatedUser.isVerified,
  };
};
