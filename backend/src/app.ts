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
import {
  authLimiter,
  generalLimiter,
} from "./middleware/rateLimit.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import resourceRoutes from "./routes/resource.routes.js";

const app = express();

// Number of reverse proxies in front of the app (e.g. 1 behind a tunnel or
// load balancer) so rate limits see the real client IP. 0 = trust none.
app.set("trust proxy", Number(process.env.TRUST_PROXY) || 0);

// Browser origins allowed to call the API. Native apps and curl send no
// Origin header and are not affected by CORS.
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// helmet's default Cross-Origin-Resource-Policy (same-origin) would block
// the web portal (different origin) from rendering uploaded images.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || corsOrigins.includes(origin)),
    // Let browsers reuse the preflight for 10 min instead of one per request.
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

if (process.env.ENABLE_REQUEST_LOGGING !== "false") {
  app.use(morgan("dev"));
}

app.use("/api", generalLimiter);

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

// Authentication (stricter rate limit)
app.use("/api/auth", authLimiter, authRoutes);

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

  // Client errors (bad JSON, rejected upload type) keep their message;
  // server errors are logged here and never described to the client.
  if (status >= 500) {
    console.error("UNHANDLED ERROR:", err);

    return res
      .status(status)
      .json({ success: false, message: "Internal server error" });
  }

  const message = err instanceof Error ? err.message : "Bad request";

  return res.status(status).json({ success: false, message });
});

export default app;
