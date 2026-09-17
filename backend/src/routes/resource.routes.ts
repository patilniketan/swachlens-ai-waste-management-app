import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { getDailyResources } from "../controllers/resource.controller.js";

const router = Router();

router.get(
  "/daily",
  authenticate,
  requireRole("STAFF", "ADMIN"),
  getDailyResources,
);

export default router;
