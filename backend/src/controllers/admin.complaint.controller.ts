import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import * as adminComplaintService from "../services/admin.complaint.service";

export const getAllComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const complaints = await adminComplaintService.getAllComplaints();

    return res.json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    console.error("Get all complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
    });
  }
};

export const getComplaintDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const complaint = await adminComplaintService.getComplaintDetails(id);

    return res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error("Get complaint details error:", error);

    return res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Complaint not found",
    });
  }
};

export const getAllStaff = async (req: AuthRequest, res: Response) => {
  try {
    const staff = await adminComplaintService.getAllStaff();

    return res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Get all staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff",
    });
  }
};
