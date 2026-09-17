import type { Request, Response } from "express";
import * as complaintService from "../services/complaint.service.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

// ============================================================
// CREATE COMPLAINT
// ============================================================

export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { description, address, latitude, longitude } = req.body;

    if (!description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Description, latitude and longitude are required",
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: "Latitude or longitude is out of range",
      });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const result = await complaintService.createComplaint({
      text: String(description).trim(),
      address: address ? String(address).trim() : undefined,
      latitude: lat,
      longitude: lng,
      userId: req.userId,
      imageUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: result,
    });
  } catch (error) {
    console.error("CREATE COMPLAINT ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create complaint",
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
    const { id } = req.params;

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
    const { id } = req.params;

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
    const { id } = req.params;

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

// ============================================================
// GET PENDING RECYCLABLE INVENTORY
// Field Worker
// ============================================================

export const getPendingRecyclableInventory = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const inventory = await complaintService.getPendingRecyclableInventory();

    return res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("GET PENDING INVENTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending recyclable inventory",
    });
  }
};

// ============================================================
// VERIFY RECYCLABLE INVENTORY
// Field Worker
// ============================================================

export const verifyRecyclableInventory = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Inventory ID is required",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      verifiedType,
      verifiedWeightKg,
      verifiedVolumeCbm,
      qualityGrade,
      contamination,
      pricePerKg,
      images,
    } = req.body;

    if (!verifiedType || verifiedWeightKg === undefined) {
      return res.status(400).json({
        success: false,
        message: "verifiedType and verifiedWeightKg are required",
      });
    }

    const weight = Number(verifiedWeightKg);

    if (!Number.isFinite(weight) || weight <= 0) {
      return res.status(400).json({
        success: false,
        message: "verifiedWeightKg must be greater than 0",
      });
    }

    let volume: number | undefined;

    if (verifiedVolumeCbm !== undefined) {
      volume = Number(verifiedVolumeCbm);

      if (!Number.isFinite(volume) || volume < 0) {
        return res.status(400).json({
          success: false,
          message: "verifiedVolumeCbm must be a valid number",
        });
      }
    }

    let price: number | undefined;

    if (pricePerKg !== undefined) {
      price = Number(pricePerKg);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "pricePerKg must be a valid non-negative number",
        });
      }
    }

    const result = await complaintService.verifyRecyclableInventory(
      id,
      req.userId,
      {
        verifiedType: String(verifiedType).trim(),

        verifiedWeightKg: weight,

        verifiedVolumeCbm: volume,

        qualityGrade: qualityGrade ? String(qualityGrade).trim() : undefined,

        contamination: contamination ? String(contamination).trim() : undefined,

        pricePerKg: price,

        images: Array.isArray(images)
          ? images.map((image) => String(image))
          : [],
      },
    );

    return res.json({
      success: true,
      message:
        "Recyclable waste verified and marketplace listing created successfully",
      data: result,
    });
  } catch (error) {
    console.error("VERIFY RECYCLABLE INVENTORY ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to verify recyclable inventory",
    });
  }
};

// ============================================================
// REJECT RECYCLABLE INVENTORY
// Field Worker
// ============================================================

export const rejectRecyclableInventory = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Inventory ID is required",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const inventory = await complaintService.rejectRecyclableInventory(
      id,
      req.userId,
    );

    return res.json({
      success: true,
      message: "Recyclable inventory rejected",
      data: inventory,
    });
  } catch (error) {
    console.error("REJECT RECYCLABLE INVENTORY ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reject recyclable inventory",
    });
  }
};

// ============================================================
// GET MARKETPLACE LISTINGS
// Recycler / Admin / Citizen marketplace
// ============================================================

export const getMarketplaceListings = async (req: Request, res: Response) => {
  try {
    const listings = await complaintService.getMarketplaceListings();

    return res.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error("GET MARKETPLACE LISTINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace listings",
    });
  }
};
