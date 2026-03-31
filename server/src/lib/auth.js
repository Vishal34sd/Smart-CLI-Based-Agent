import "../config/env.js";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { deviceAuthorization } from "better-auth/plugins";
import prisma from "./db.js";
import { AUTH_BASE_URL, FRONTEND_URL } from "../config/api.js";

const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN ||
  process.env.FRONTEND_URL ||
  FRONTEND_URL;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: AUTH_BASE_URL,
  basePath: "/api/auth",

  trustedOrigins: [CLIENT_ORIGIN],

  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },

  plugins: [
    deviceAuthorization({
      verificationUri: "/device",
    }),
  ],

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
});