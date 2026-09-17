import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

import {
  getAllComplaints,
  getComplaintDetails,
  getAllStaff,
} from "../controllers/admin.complaint.controller";

import { getDashboardStats } from "../controllers/admin.dashboard.controller";

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
