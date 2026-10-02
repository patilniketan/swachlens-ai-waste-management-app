import { Router } from "express";

import {
  createComplaint,
  getComplaints,
  getComplaintById,
  getNearbyComplaints,
  getHotspots,
  updateComplaint,
  verifyComplaint,
  mergeComplaints,
  getTodaysTasks,
  confirmDuplicate,
} from "../controllers/complaint.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();

// Create complaint
router.post("/", authenticate, upload.single("image"), createComplaint);

// Get logged-in user's complaints
router.get("/", authenticate, getComplaints);

// Get nearby complaints
router.get("/nearby", authenticate, getNearbyComplaints);

// Get hotspots
router.get("/hotspots", authenticate, getHotspots);

// Get today's scheduled tasks
router.get(
  "/todays-tasks",
  authenticate,
  requireRole("STAFF", "ADMIN"),
  getTodaysTasks,
);

// Merge complaints into master complaint
router.post(
  "/merge",
  authenticate,
  requireRole("STAFF", "ADMIN"),
  mergeComplaints,
);

// Get single complaint
router.get("/:id", authenticate, getComplaintById);

// Update complaint
router.patch("/:id", authenticate, updateComplaint);

// Verify complaint - STAFF and ADMIN only
router.post(
  "/:id/verify",
  authenticate,
  requireRole("STAFF", "ADMIN"),
  verifyComplaint,
);

// Confirm the AI duplicate suggestion (links + vote) - STAFF and ADMIN only
router.post(
  "/:id/confirm-duplicate",
  authenticate,
  requireRole("STAFF", "ADMIN"),
  confirmDuplicate,
);

export default router;
