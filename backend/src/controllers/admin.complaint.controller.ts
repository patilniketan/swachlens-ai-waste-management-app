import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import * as adminComplaintService from "../services/admin.complaint.service.js";
import { getParam } from "../utils/params.js";
import { sendError } from "../utils/httpError.js";
import { paginationQuerySchema } from "../validation/schemas.js";

// ?take=25&skip=0&status=Pending
export const getAllComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const query = paginationQuerySchema.safeParse(req.query);

    if (!query.success) {
      return res.status(400).json({
        success: false,
        message: query.error.issues[0]?.message ?? "Invalid query",
      });
    }

    const { items, total } = await adminComplaintService.getAllComplaints(query.data);

    return res.json({
      success: true,
      data: items,
      pagination: {
        take: query.data.take,
        skip: query.data.skip,
        total,
        hasMore: query.data.skip + items.length < total,
      },
    });
  } catch (error) {
    return sendError(res, error, "GET ALL COMPLAINTS", "Failed to fetch complaints");
  }
};

export const getComplaintDetails = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    const complaint = await adminComplaintService.getComplaintDetails(id);

    return res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    return sendError(res, error, "GET COMPLAINT DETAILS", "Failed to fetch complaint");
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
    return sendError(res, error, "GET ALL STAFF", "Failed to fetch staff");
  }
};

export const getMapComplaints = async (_req: AuthRequest, res: Response) => {
  try {
    const complaints = await adminComplaintService.getMapComplaints();

    return res.json({ success: true, data: complaints });
  } catch (error) {
    return sendError(res, error, "MAP COMPLAINTS", "Failed to fetch map data");
  }
};

