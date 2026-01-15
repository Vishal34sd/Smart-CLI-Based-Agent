import chalk from "chalk";
import prisma from "./db.js";

const stripWrappingQuotes = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/^\s*"|"\s*$/g, "").trim();
};

export const getDatabaseHostHint = () => {
  const raw = stripWrappingQuotes(process.env.DATABASE_URL);
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const port = url.port || "5432";
    return `${url.hostname}:${port}`;
  } catch {
    return undefined;
  }
};

export const isPrismaDbConnectionError = (error) => {
  const message = String(error?.message || "");
  return (
    error?.name === "PrismaClientInitializationError" ||
    message.includes("Can't reach database server") ||
    message.includes("P1001")
  );
};

export const formatDbConnectionTroubleshooting = () => {
  const hostHint = getDatabaseHostHint();
  const hostLine = hostHint ? ` at ${hostHint}` : "";

  return [
    chalk.red(`Database connection failed${hostLine}.`),
    chalk.gray("\nFix checklist:"),
    chalk.gray("- Verify `server/.env` has a valid `DATABASE_URL`"),
    chalk.gray("- Ensure your Neon project/branch is running (not paused)"),
    chalk.gray("- Check VPN/firewall/outbound access to port 5432"),
    chalk.gray("- If you changed schema, run: `npm run prisma:migrate` in server/"),
  ].join("\n");
};

export const ensureDbConnection = async () => {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    if (isPrismaDbConnectionError(error)) {
      console.log(formatDbConnectionTroubleshooting());
      return false;
    }

    console.log(chalk.red(`Database error: ${error?.message || error}`));
    return false;
  }
};
