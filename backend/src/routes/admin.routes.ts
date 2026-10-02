import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

import {
  getAllComplaints,
  getComplaintDetails,
  getAllStaff,
} from "../controllers/admin.complaint.controller.js";

import { getDashboardStats } from "../controllers/admin.dashboard.controller.js";

const router = Router();

router.get("/dashboard", authenticate, requireRole("ADMIN"), getDashboardStats);

router.get("/complaints", authenticate, requireRole("ADMIN"), getAllComplaints);

router.get(
  "/complaints/:id",
  authenticate,
  requireRole("ADMIN"),
  getComplaintDetails,
);

router.get("/staff", authenticate, requireRole("ADMIN"), getAllStaff);

export default router;
