import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { UPLOAD_DIR } from "./config/uploads.js";

import prisma from "./config/prisma.js";

import authRoutes from "./routes/auth.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import resourceRoutes from "./routes/resource.routes.js";

const app = express();

// helmet's default Cross-Origin-Resource-Policy (same-origin) would block
// the web portal (different origin) from rendering uploaded images.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
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

// Uploaded complaint images
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

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

// Errors thrown by middleware (e.g. multer file type/size checks)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 500;

  if (status >= 500) {
    console.error("UNHANDLED ERROR:", err);
  }

  const message = err instanceof Error ? err.message : "Internal server error";

  return res.status(status).json({ success: false, message });
});

export default app;
