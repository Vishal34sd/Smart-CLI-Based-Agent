import "dotenv/config";
import { execSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let PrismaClient;
try {
  PrismaClient = require("@prisma/client").PrismaClient;
} catch {
  try {
    execSync("npx prisma generate", { stdio: "ignore" });
    PrismaClient = require("@prisma/client").PrismaClient;
  } catch (err) {
    console.error("Failed to initialize Prisma Client:", err?.message || err);
  }
}

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? (PrismaClient ? new PrismaClient() : null);

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
