import { Router } from "express";
import {
  signup,
  login,
  me,
  sendOtp,
  verifyOtp,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticate, me);

// OTP routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

export default router;
