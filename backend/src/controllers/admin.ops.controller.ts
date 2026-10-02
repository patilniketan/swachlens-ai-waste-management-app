import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import * as adminComplaintService from "../services/admin.complaint.service.js";
import * as analyticsService from "../services/analytics.service.js";
import * as planService from "../services/plan.service.js";
import { getComplaintEvents } from "../services/event.service.js";
import { getParam } from "../utils/params.js";
import { sendError } from "../utils/httpError.js";
import { analyticsQuerySchema } from "../validation/schemas.js";
import type { Priority } from "../generated/prisma/client.js";

// ============================================================
// PLAN
// ============================================================

export const generatePlan = async (req: AuthRequest, res: Response) => {
  try {
    const plan = await planService.generatePlan(req.userId as string);

    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendError(res, error, "GENERATE PLAN", "Failed to generate today's plan");
  }
};

export const getTodayPlan = async (_req: AuthRequest, res: Response) => {
  try {
    const plan = await planService.getTodayPlan();

    if (!plan) {
      return res.json({
        success: true,
        data: null,
        message: "No plan has been generated for today yet.",
      });
    }

    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendError(res, error, "GET TODAY PLAN", "Failed to fetch today's plan");
  }
};

// ============================================================
// EVENTS + PRIORITY OVERRIDE
// ============================================================

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({ success: false, message: "Complaint ID is required" });
    }

    const events = await getComplaintEvents(id);

    return res.json({ success: true, data: events });
  } catch (error) {
    return sendError(res, error, "GET EVENTS", "Failed to fetch complaint events");
  }
};

export const overridePriority = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({ success: false, message: "Complaint ID is required" });
    }

    // Validated by priorityOverrideSchema.
    const { priority, reason } = req.body as { priority: Priority; reason: string };

    const complaint = await adminComplaintService.overridePriority(
      id,
      req.userId as string,
      priority,
      reason,
    );

    return res.json({
      success: true,
      message: "Priority overridden",
      data: complaint,
    });
  } catch (error) {
    return sendError(res, error, "PRIORITY OVERRIDE", "Failed to override priority");
  }
};

// ============================================================
// ANALYTICS + EXPORT
// ============================================================

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const query = analyticsQuerySchema.safeParse(req.query);

    if (!query.success) {
      return res.status(400).json({
        success: false,
        message: query.error.issues[0]?.message ?? "Invalid query",
      });
    }

    const analytics = await analyticsService.getAnalytics(query.data);

    return res.json({ success: true, data: analytics });
  } catch (error) {
    return sendError(res, error, "ANALYTICS", "Failed to compute analytics");
  }
};

export const exportCsv = async (req: AuthRequest, res: Response) => {
  const query = analyticsQuerySchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({
      success: false,
      message: query.error.issues[0]?.message ?? "Invalid query",
    });
  }

  try {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="complaints-${new Date().toISOString().slice(0, 10)}.csv"`,
    );

    for await (const chunk of analyticsService.exportComplaintsCsv(query.data)) {
      res.write(chunk);
    }

    return res.end();
  } catch (error) {
    // Rows may already be streamed: log and end the response early.
    if (res.headersSent) {
      console.error("CSV EXPORT ERROR:", error);
      return res.end();
    }

    return sendError(res, error, "CSV EXPORT", "Failed to export complaints");
  }
};
