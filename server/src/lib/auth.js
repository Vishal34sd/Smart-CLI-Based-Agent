import "../config/env.js";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { deviceAuthorization } from "better-auth/plugins"; 
import prisma from "./db.js";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    // IMPORTANT: When the frontend proxies `/api/*` to the backend (Next.js rewrites),
    // auth cookies are set on the frontend origin. The OAuth callback must therefore
    // also land on the frontend origin to avoid `state_mismatch`.
    baseURL:
      process.env.BETTER_AUTH_BASE_URL ||
      process.env.FRONTEND_URL ||
      process.env.CLIENT_ORIGIN ||
      "http://localhost:3000",
    basePath:"/api/auth" ,
    trustedOrigins: [
      process.env.CLIENT_ORIGIN ||
        process.env.FRONTEND_URL ||
        "https://smart-cli-based-agent-t7x4.vercel.app",
      "http://localhost:3000",
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