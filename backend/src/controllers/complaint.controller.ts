import fs from "fs/promises";
import type { Request, Response } from "express";
import * as complaintService from "../services/complaint.service.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { getParam } from "../utils/params.js";
import { HttpError } from "../utils/httpError.js";

// ============================================================
// CREATE COMPLAINT
// ============================================================

// Client-generated UUID (or similar) sent as the Idempotency-Key header.
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

// The upload is not needed when the request fails or is a retry.
const discardUpload = (req: AuthRequest) => {
  if (req.file) {
    fs.unlink(req.file.path).catch(() => undefined);
  }
};

export const createComplaint = async (req: AuthRequest, res: Response) => {
  const reject = (status: number, message: string) => {
    discardUpload(req);

    return res.status(status).json({ success: false, message });
  };

  try {
    if (!req.userId) {
      return reject(401, "Unauthorized");
    }

    const rawKey = req.get("Idempotency-Key")?.trim();

    if (rawKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(rawKey)) {
      return reject(
        400,
        "Idempotency-Key must be 8-100 letters, digits, '-' or '_' (e.g. a UUID)",
      );
    }

    // Mobile clients send `text`; web/API clients send `description`.
    const body = req.body ?? {};
    const { address, latitude, longitude } = body;
    const description = body.description ?? body.text;

    if (!description || latitude === undefined || longitude === undefined) {
      return reject(400, "Description, latitude and longitude are required");
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return reject(400, "Invalid latitude or longitude");
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return reject(400, "Latitude or longitude is out of range");
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const { replayed, response } = await complaintService.createComplaint({
      text: String(description).trim(),
      address: address ? String(address).trim() : undefined,
      latitude: lat,
      longitude: lng,
      userId: req.userId,
      imageUrl,
      imagePath: req.file?.path,
      imageMimeType: req.file?.mimetype,
      idempotencyKey: rawKey,
    });

    if (replayed) {
      discardUpload(req);

      return res.status(200).json({
        success: true,
        message: "Complaint already submitted",
        data: response,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: response,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return reject(error.status, error.message);
    }

    console.error("CREATE COMPLAINT ERROR:", error);

    return reject(500, "Failed to create complaint. Please try again.");
  }
};

// ============================================================
// CONFIRM DUPLICATE (STAFF / ADMIN)
// ============================================================

export const confirmDuplicate = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id || !req.userId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    const masterId = req.body?.masterId;

    const result = await complaintService.confirmDuplicate(
      id,
      req.userId,
      typeof masterId === "string" && masterId.trim() ? masterId.trim() : undefined,
    );

    return res.json({
      success: true,
      message: "Duplicate confirmed and linked",
      data: result,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    console.error("CONFIRM DUPLICATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to confirm duplicate",
    });
  }
};

// ============================================================
// GET USER COMPLAINTS
// ============================================================

export const getComplaints = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const complaints = await complaintService.getUserComplaints(req.userId);

    return res.json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    console.error("GET COMPLAINTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
    });
  }
};

// ============================================================
// GET NEARBY COMPLAINTS
// ============================================================

export const getNearbyComplaints = async (req: Request, res: Response) => {
  try {
    const latitude = Number(req.query.latitude);

    const longitude = Number(req.query.longitude);

    const radiusMeters = req.query.radius ? Number(req.query.radius) : 500;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid radius",
      });
    }

    const complaints = await complaintService.getNearbyComplaints(
      latitude,
      longitude,
      radiusMeters,
    );

    return res.json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    console.error("NEARBY COMPLAINTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby complaints",
    });
  }
};

// ============================================================
// GET SINGLE COMPLAINT
// ============================================================

export const getComplaintById = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    const complaint = await complaintService.getComplaintById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    return res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error("GET COMPLAINT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint",
    });
  }
};

// ============================================================
// UPDATE COMPLAINT
// ============================================================

export const updateComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    const complaint = await complaintService.updateComplaint(id, req.body);

    return res.json({
      success: true,
      message: "Complaint updated successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("UPDATE COMPLAINT ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update complaint",
    });
  }
};

// ============================================================
// VERIFY COMPLAINT
// ============================================================

export const verifyComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const complaint = await complaintService.verifyComplaint(id, req.userId);

    return res.json({
      success: true,
      message: "Complaint verified successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("VERIFY COMPLAINT ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to verify complaint",
    });
  }
};

// ============================================================
// GET HOTSPOTS
// ============================================================

export const getHotspots = async (req: Request, res: Response) => {
  try {
    const hotspots = await complaintService.getHotspots();

    return res.json({
      success: true,
      data: hotspots,
    });
  } catch (error) {
    console.error("GET HOTSPOTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch hotspots",
    });
  }
};

// ============================================================
// MERGE COMPLAINTS
// ============================================================

export const mergeComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const { complaintIds } = req.body;

    if (!Array.isArray(complaintIds) || complaintIds.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "complaintIds must be an array containing at least 2 complaint IDs",
      });
    }

    const result = await complaintService.mergeComplaints(complaintIds);

    return res.json({
      success: true,
      message: "Complaints merged successfully",
      data: result,
    });
  } catch (error) {
    console.error("MERGE COMPLAINTS ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to merge complaints",
    });
  }
};

// ============================================================
// GET TODAY'S TASKS
// ============================================================

export const getTodaysTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await complaintService.getTodaysTasks();

    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("TODAYS TASKS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's tasks",
    });
  }
};
