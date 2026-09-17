import type { Request, Response } from "express";
import * as resourceService from "../services/resource.service.js";

export const getDailyResources = async (req: Request, res: Response) => {
  try {
    const resources = await resourceService.getDailyResources();

    return res.json({
      success: true,
      data: resources,
    });
  } catch (error) {
    console.error("DAILY RESOURCES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch daily resources",
    });
  }
};
