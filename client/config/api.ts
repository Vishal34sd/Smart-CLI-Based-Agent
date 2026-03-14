const DEFAULT_API_BASE = "https://smart-cli-based-agent.onrender.com";
const DEFAULT_FRONTEND_URL = "https://smart-cli-based-agent-t7x4.vercel.app";

const stripTrailingSlash = (value?: string) => {
  if (!value) return value;
  return value.replace(/\/+$/, "");
};

export const API_BASE = stripTrailingSlash(
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
    process.env.NEXT_PUBLIC_ORBITAL_API_BASE ||
    DEFAULT_API_BASE
);

export const FRONTEND_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_FRONTEND_URL || DEFAULT_FRONTEND_URL
);
