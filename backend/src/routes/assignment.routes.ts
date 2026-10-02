import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

import {
  assignComplaint,
  getStaffTasks,
  getStaffTaskById,
  updateAssignmentStatus,
} from "../controllers/assignment.controller.js";

const router = Router();

// Admin assigns a complaint to a staff member
router.post("/", authenticate, requireRole("ADMIN"), assignComplaint);

// Staff gets their assigned tasks
router.get("/tasks", authenticate, requireRole("STAFF"), getStaffTasks);

router.get("/:id", authenticate, requireRole("STAFF"), getStaffTaskById);
// Staff updates their task status
router.patch(
  "/:id/status",
  authenticate,
  requireRole("STAFF"),
  updateAssignmentStatus,
);

export default router;
