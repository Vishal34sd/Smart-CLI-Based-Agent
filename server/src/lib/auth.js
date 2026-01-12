import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { deviceAuthorization } from "better-auth/plugins"; 

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    baseURL:
      process.env.BETTER_AUTH_BASE_URL ||
      process.env.CLIENT_ORIGIN ||
      "http://localhost:3000",
    basePath:"/api/auth" ,
    trustedOrigins : ["http://localhost:3000"],
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