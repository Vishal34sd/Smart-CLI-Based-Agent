import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { FRONTEND_URL } from "../config/api";

const baseURL =
  typeof window !== "undefined" ? window.location.origin : FRONTEND_URL;

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    deviceAuthorizationClient(),
  ],
});