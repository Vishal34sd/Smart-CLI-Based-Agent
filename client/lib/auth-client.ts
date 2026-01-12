import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

const baseURL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    deviceAuthorizationClient(),
  ],
});