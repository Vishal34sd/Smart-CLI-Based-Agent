import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

const baseURL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ??
  (typeof window !== "undefined"
    ? window.location.origin
    : "https://smart-cli-based-agent-t7x4.vercel.app");

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    deviceAuthorizationClient(),
  ],
});