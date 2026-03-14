import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { API_BASE } from "../config/api";

const baseURL = API_BASE;

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    deviceAuthorizationClient(),
  ],
});