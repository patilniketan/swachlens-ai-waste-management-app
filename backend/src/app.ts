import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import prisma from "./config/prisma.js";

import authRoutes from "./routes/auth.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import resourceRoutes from "./routes/resource.routes.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      success: true,
      message: "Waste Management API is running",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return res.status(503).json({
      success: false,
      message: "API is running but database is unavailable",
    });
  }
});

// Authentication
app.use("/api/auth", authRoutes);

// Complaints
app.use("/api/complaints", complaintRoutes);

// Assignments
app.use("/api/assignments", assignmentRoutes);

// Admin
app.use("/api/admin", adminRoutes);

// Daily resources
app.use("/api/resources", resourceRoutes);

// 404
app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
