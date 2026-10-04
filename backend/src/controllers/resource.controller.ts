import type { Request, Response } from "express";
import * as resourceService from "../services/resource.service.js";
import { sendError } from "../utils/httpError.js";

export const getDailyResources = async (req: Request, res: Response) => {
  try {
    const resources = await resourceService.getDailyResources();

    return res.json({
      success: true,
      data: resources,
    });
  } catch (error) {
    return sendError(res, error, "DAILY RESOURCES", "Failed to fetch daily resources");
  }
};
