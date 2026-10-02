import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { priorityOverrideSchema } from "../validation/schemas.js";

import {
  getAllComplaints,
  getComplaintDetails,
  getAllStaff,
  getMapComplaints,
} from "../controllers/admin.complaint.controller.js";

import { getDashboardStats } from "../controllers/admin.dashboard.controller.js";

import {
  exportCsv,
  generatePlan,
  getAnalytics,
  getEvaluation,
  getEvents,
  getTodayPlan,
  overridePriority,
} from "../controllers/admin.ops.controller.js";

const router = Router();

// Every admin route requires an ADMIN token.
router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", getDashboardStats);

// ?take=25&skip=0&status=Pending&priority=CRITICAL&wasteType=...&sort=urgency
router.get("/complaints", getAllComplaints);

// Active complaints for the map (registered before /complaints/:id)
router.get("/complaints/map", getMapComplaints);

router.get("/complaints/:id", getComplaintDetails);

// Audit trail
router.get("/complaints/:id/events", getEvents);

// Manual priority with a mandatory reason (logged as an event)
router.patch(
  "/complaints/:id/priority",
  validateBody(priorityOverrideSchema),
  overridePriority,
);

router.get("/staff", getAllStaff);

// Today's resource-aware plan
router.post("/plan/generate", generatePlan);
router.get("/plan/today", getTodayPlan);

// Aggregates (?includeSimulated=false for real data only)
router.get("/analytics", getAnalytics);
router.get("/reports/export.csv", exportCsv);

// Latest offline evaluation (eval/results.json), or null
router.get("/eval/latest", getEvaluation);

export default router;
