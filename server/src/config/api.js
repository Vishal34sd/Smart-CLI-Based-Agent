const DEFAULT_API_BASE = "https://smart-cli-based-agent.onrender.com";
const DEFAULT_FRONTEND_URL = "https://smart-cli-based-agent-t7x4.vercel.app";

const stripTrailingSlash = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/\/+$/, "");
};

export const API_BASE = stripTrailingSlash(
  process.env.ORBITAL_SERVER_URL ||
    process.env.BACKEND_URL ||
    process.env.SERVER_URL ||
    DEFAULT_API_BASE
);

export const FRONTEND_URL = stripTrailingSlash(
  process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || DEFAULT_FRONTEND_URL
);

export const AUTH_BASE_URL = stripTrailingSlash(
  process.env.BETTER_AUTH_BASE_URL || API_BASE
);
