import { Router } from "express";
import {
  signup,
  login,
  me,
  sendOtp,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  loginSchema,
  sendOtpSchema,
  signupSchema,
  verifyOtpSchema,
} from "../validation/schemas.js";

// The stricter auth rate limiter is applied to this whole router in app.ts.
const router = Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", authenticate, me);

// OTP routes
router.post("/send-otp", validateBody(sendOtpSchema), sendOtp);
router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOtp);

export default router;
