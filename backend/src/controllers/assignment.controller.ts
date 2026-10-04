import fs from "fs/promises";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import * as assignmentService from "../services/assignment.service.js";
import type { AssignmentStatusUpdate } from "../services/assignment.service.js";
import { getParam } from "../utils/params.js";
import { sendError } from "../utils/httpError.js";

export const assignComplaint = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { complaintId, staffId } = req.body;

    if (!complaintId || !staffId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID and staff ID are required",
      });
    }

    const assignment = await assignmentService.assignComplaint({
      complaintId,
      staffId,
      assignedBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Complaint assigned successfully",
      data: assignment,
    });
  } catch (error) {
    return sendError(res, error, "ASSIGN COMPLAINT", "Failed to assign complaint");
  }
};

export const getStaffTasks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const latitude = req.query.latitude
      ? Number(req.query.latitude)
      : undefined;

    const longitude = req.query.longitude
      ? Number(req.query.longitude)
      : undefined;

    const tasks = await assignmentService.getStaffTasks(
      req.userId,
      latitude,
      longitude,
    );

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    return sendError(res, error, "GET STAFF TASKS", "Failed to fetch staff tasks");
  }
};

// Multipart when completing: fields status, verifiedWeightKg, resolutionNotes
// and the after photo in "afterImage". JSON is fine for other statuses.
export const updateAssignmentStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  const discardUpload = () => {
    if (req.file) fs.unlink(req.file.path).catch(() => undefined);
  };

  try {
    const id = getParam(req.params.id);

    if (!id || !req.userId) {
      discardUpload();

      return res.status(400).json({
        success: false,
        message: "Assignment ID is required",
      });
    }

    // Validated by assignmentStatusSchema.
    const { status, verifiedWeightKg, resolutionNotes } = req.body as {
      status: AssignmentStatusUpdate["status"];
      verifiedWeightKg?: number;
      resolutionNotes?: string;
    };

    if (status === "COMPLETED" && !req.file) {
      return res.status(400).json({
        success: false,
        message: "An after photo (field \"afterImage\") is required to complete a task.",
      });
    }

    // A photo is only kept as completion evidence.
    if (status !== "COMPLETED") discardUpload();

    const assignment = await assignmentService.updateAssignmentStatus(
      id,
      req.userId,
      {
        status,
        verifiedWeightKg,
        resolutionNotes,
        afterImageUrl:
          status === "COMPLETED" && req.file
            ? `/uploads/${req.file.filename}`
            : undefined,
      },
    );

    return res.json({
      success: true,
      message: "Assignment status updated successfully",
      data: assignment,
    });
  } catch (error) {
    discardUpload();

    return sendError(res, error, "UPDATE ASSIGNMENT STATUS", "Failed to update assignment status");
  }
};

export const getStaffTaskById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required",
      });
    }

    const task = await assignmentService.getStaffTaskById(id, req.userId);

    return res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    return sendError(res, error, "GET STAFF TASK", "Failed to fetch staff task");
  }
};