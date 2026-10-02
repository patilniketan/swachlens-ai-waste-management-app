import "dotenv/config";
import app from "./src/app.js";
import prisma, { warmUpDatabase } from "./src/config/prisma.js";

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  warmUpDatabase()
    .then((ms) => console.log(`Database connections ready (${ms}ms)`))
    .catch((error) => console.error("Database warm-up failed:", error));
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
