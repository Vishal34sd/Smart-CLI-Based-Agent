import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from the server package root (server/.env) regardless of where the process is started.
const serverEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: serverEnvPath });
