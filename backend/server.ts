import "dotenv/config";
import express from "express";
import path from "path";
import app from "./src/app";
import prisma from "./src/config/prisma";
import complaintRoutes from "./src/routes/complaint.routes";
import assignmentRoutes from "./src/routes/assignment.routes";
import adminRoutes from "./src/routes/admin.routes";

const PORT = Number(process.env.PORT) || 5000;

// Serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "src", "uploads")));

// Routes
app.use("/api/complaints", complaintRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/assignments", assignmentRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const shutdown = async () => {
  console.log("Shutting down server...");

  await prisma.$disconnect();

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
