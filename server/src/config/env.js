import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from the server package root (server/.env) regardless of where the process is started.
const serverEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: serverEnvPath });

const stripWrappingQuotes = (value) => {
	if (typeof value !== "string") return value;
	return value.replace(/^\s*"|"\s*$/g, "").trim();
};

const normalizeNeonPostgresUrl = (raw) => {
	const cleaned = stripWrappingQuotes(raw);
	if (!cleaned) return cleaned;

	try {
		const url = new URL(cleaned);
		const host = url.hostname || "";

		const isNeon = host.endsWith("neon.tech");
		if (!isNeon) return cleaned;

		const isPooler = host.includes("-pooler.");

		// Neon requires TLS.
		if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");

		// When using Neon pooler (PgBouncer), Prisma should run in PgBouncer mode
		// and keep connection limits low.
		if (isPooler && !url.searchParams.has("pgbouncer")) {
			url.searchParams.set("pgbouncer", "true");
		}
		if (isPooler && !url.searchParams.has("connection_limit")) {
			url.searchParams.set("connection_limit", "1");
		}

		// Avoid long hangs on cold/paused branches or blocked networks.
		if (!url.searchParams.has("connect_timeout")) {
			url.searchParams.set("connect_timeout", "10");
		}

		return url.toString();
	} catch {
		return cleaned;
	}
};

if (process.env.DATABASE_URL) {
	process.env.DATABASE_URL = normalizeNeonPostgresUrl(process.env.DATABASE_URL);
}

if (process.env.DIRECT_DATABASE_URL) {
	process.env.DIRECT_DATABASE_URL = normalizeNeonPostgresUrl(
		process.env.DIRECT_DATABASE_URL
	);
}

// Helpful warnings for common Neon misconfigurations.
try {
	if (process.env.DATABASE_URL) {
		const url = new URL(process.env.DATABASE_URL);
		if (url.hostname.includes("-pooler.") && url.searchParams.get("pgbouncer") !== "true") {
			// eslint-disable-next-line no-console
			console.warn(
				"[env] DATABASE_URL points to a Neon pooler host but is missing `pgbouncer=true`. Add it to avoid Prisma connection issues."
			);
		}
		if (url.hostname.endsWith("neon.tech") && url.searchParams.get("sslmode") !== "require") {
			// eslint-disable-next-line no-console
			console.warn(
				"[env] Neon Postgres should use TLS. Ensure DATABASE_URL includes `sslmode=require`."
			);
		}
	}
} catch {
	// ignore
}
