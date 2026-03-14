import "../config/env.js";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { deviceAuthorization } from "better-auth/plugins"; 
import prisma from "./db.js";
import { FRONTEND_URL } from "../config/api.js";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    // IMPORTANT: When the frontend proxies `/api/*` to the backend (Next.js rewrites),
    // auth cookies are set on the frontend origin. The OAuth callback must therefore
    // also land on the frontend origin to avoid `state_mismatch`.
    baseURL:
      process.env.FRONTEND_URL ||
      process.env.CLIENT_ORIGIN ||
      FRONTEND_URL,
    basePath:"/api/auth" ,
    trustedOrigins: [
      process.env.CLIENT_ORIGIN ||
        process.env.FRONTEND_URL ||
        FRONTEND_URL,
      FRONTEND_URL,
    ],
    plugins: [
    deviceAuthorization({ 
      verificationUri: "/device", 
    }), 
  ],
    socialProviders :{
        github : {
            clientId : process.env.GITHUB_CLIENT_ID ,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
        }
    }
});