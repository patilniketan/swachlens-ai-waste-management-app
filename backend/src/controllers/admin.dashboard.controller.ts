import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import * as adminDashboardService from "../services/admin.dashboard.service.js";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await adminDashboardService.getDashboardStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};
