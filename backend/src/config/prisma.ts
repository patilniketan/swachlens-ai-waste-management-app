import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

// Opening a TLS connection to a remote Postgres (e.g. Neon) costs ~2s, a
// query on an open connection ~250ms. pg's default closes idle connections
// after 10s, so nearly every request paid the connect cost again; keep them.
const adapter = new PrismaPg({
  connectionString,
  max: 10,
  idleTimeoutMillis: 5 * 60 * 1000,
  keepAlive: true,
});

const prisma = new PrismaClient({
  adapter,
});

// Open a few pooled connections up front so the first requests are fast.
export const warmUpDatabase = async (connections = 4) => {
  const started = Date.now();

  await Promise.all(
    Array.from({ length: connections }, () => prisma.$queryRaw`SELECT 1`),
  );

  return Date.now() - started;
};

export default prisma;
