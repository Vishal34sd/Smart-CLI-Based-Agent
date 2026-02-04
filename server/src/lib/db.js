import "dotenv/config";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

// Safety net: generate client if missing
try {
  execSync("npx prisma generate", { stdio: "ignore" });
} catch {}

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
