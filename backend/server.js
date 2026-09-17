import "dotenv/config";
import express from "express";
import path from "path";
import authRoutes from "./src/routes/auth.routes";
import app from "./src/app";
import prisma from "./src/config/prisma";
import complaintRoutes from "./src/routes/complaint.routes";
import assignmentRoutes from "./src/routes/assignment.routes";
import adminRoutes from "./src/routes/admin.routes";
import resourceRoutes from "./src/routes/resource.routes.js";
const PORT = Number(process.env.PORT) || 5000;
// Serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "src", "uploads")));
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/resources", resourceRoutes);
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
//# sourceMappingURL=server.js.map