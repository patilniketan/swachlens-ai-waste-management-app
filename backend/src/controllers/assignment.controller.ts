import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import * as assignmentService from "../services/assignment.service";

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
    console.error("Assign complaint error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to assign complaint",
    });
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
    console.error("Get staff tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff tasks",
    });
  }
};

export const updateAssignmentStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const assignment = await assignmentService.updateAssignmentStatus(
      id,
      req.userId,
      status,
    );

    return res.json({
      success: true,
      message: "Assignment status updated successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Update assignment status error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update assignment status",
    });
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

    const { id } = req.params;

    const task = await assignmentService.getStaffTaskById(id, req.userId);

    return res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Get staff task error:", error);

    return res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch staff task",
    });
  }
};