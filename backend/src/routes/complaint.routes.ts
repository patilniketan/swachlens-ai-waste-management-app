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
  rejectDuplicate,
} from "../controllers/complaint.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { complaintCreateLimiter } from "../middleware/rateLimit.middleware.js";
import { upload, verifyImageContent } from "../middleware/upload.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  complaintCreateSchema,
  complaintUpdateSchema,
  complaintVerifySchema,
  confirmDuplicateSchema,
  mergeComplaintsSchema,
  rejectDuplicateSchema,
} from "../validation/schemas.js";

const router = Router();

const staffOnly = requireRole("STAFF", "ADMIN");

// Create complaint. Rate limit before upload so throttled requests store
// nothing; image bytes are checked before the body is validated.
router.post(
  "/",
  authenticate,
  complaintCreateLimiter,
  upload.single("image"),
  verifyImageContent,
  validateBody(complaintCreateSchema),
  createComplaint,
);

// Get logged-in user's complaints
router.get("/", authenticate, getComplaints);

// Get nearby complaints (no reporter identifiers)
router.get("/nearby", authenticate, getNearbyComplaints);

// Get hotspots (aggregates only)
router.get("/hotspots", authenticate, getHotspots);

// Get today's scheduled tasks
router.get("/todays-tasks", authenticate, staffOnly, getTodaysTasks);

// Merge complaints into master complaint
router.post(
  "/merge",
  authenticate,
  staffOnly,
  validateBody(mergeComplaintsSchema),
  mergeComplaints,
);

// Get single complaint: citizens only their own, staff/admin any
router.get("/:id", authenticate, getComplaintById);

// Update complaint - STAFF and ADMIN only, whitelisted fields/enums
router.patch(
  "/:id",
  authenticate,
  staffOnly,
  validateBody(complaintUpdateSchema),
  updateComplaint,
);

// Verify complaint - STAFF and ADMIN only
router.post(
  "/:id/verify",
  authenticate,
  staffOnly,
  validateBody(complaintVerifySchema),
  verifyComplaint,
);

// Confirm the AI duplicate suggestion (links + vote) - STAFF and ADMIN only
router.post(
  "/:id/confirm-duplicate",
  authenticate,
  staffOnly,
  validateBody(confirmDuplicateSchema),
  confirmDuplicate,
);

// Reject the AI duplicate suggestion - STAFF and ADMIN only
router.post(
  "/:id/reject-duplicate",
  authenticate,
  staffOnly,
  validateBody(rejectDuplicateSchema),
  rejectDuplicate,
);

export default router;
