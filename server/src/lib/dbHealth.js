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
  return ensureDbConnectionWithRetry();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const ensureDbConnectionWithRetry = async (options = {}) => {
  const {
    retries = Number(process.env.DB_CONNECT_RETRIES || 6),
    initialDelayMs = 500,
    maxDelayMs = 5000,
    logAttempts = true,
  } = options;

  const attempts = Math.max(1, Number(retries) + 1);
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      const isConnectionError = isPrismaDbConnectionError(error);
      const isLastAttempt = attempt === attempts;

      if (!isLastAttempt && isConnectionError) {
        if (logAttempts) {
          const hostHint = getDatabaseHostHint();
          const hostLine = hostHint ? ` (${hostHint})` : "";
          console.log(
            chalk.yellow(
              `Database not reachable${hostLine}. Retry ${attempt}/${attempts - 1} in ${delayMs}ms...`
            )
          );
        }
        await sleep(delayMs);
        delayMs = Math.min(maxDelayMs, Math.floor(delayMs * 1.8));
        continue;
      }

      if (isConnectionError) {
        console.log(formatDbConnectionTroubleshooting());
        return false;
      }

      console.log(chalk.red(`Database error: ${error?.message || error}`));
      return false;
    }
  }

  return false;
};

export const ensureDbConnectionOrExit = async (options = {}) => {
  const ok = await ensureDbConnectionWithRetry(options);
  if (ok) return true;

  // eslint-disable-next-line no-console
  console.error(chalk.red("\nServer cannot start without database connectivity. Exiting."));
  process.exit(1);
};
