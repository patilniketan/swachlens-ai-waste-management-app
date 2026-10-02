import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import * as adminDashboardService from "../services/admin.dashboard.service.js";
import { sendError } from "../utils/httpError.js";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await adminDashboardService.getDashboardStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return sendError(res, error, "GET DASHBOARD STATS", "Failed to fetch dashboard statistics");
  }
};
