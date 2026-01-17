import "./config/env.js";
import express from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import { auth } from "./lib/auth.js";
import prisma from "./lib/db.js";
import { ensureDbConnectionOrExit } from "./lib/dbHealth.js";


const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(express.json());

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/api/me" , async (req, res)=>{
  const session = await auth.api.getSession({
    headers : fromNodeHeaders (req.headers),
  });

  if (session) {
    return res.json(session);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json(null);
  }

  const [scheme, credentials] = authHeader.split(" ");
  if (!scheme || !credentials || scheme.toLowerCase() !== "bearer") {
    return res.status(400).json({ error: "Invalid Authorization header" });
  }

  const dbSession = await prisma.session.findUnique({
    where: { token: credentials },
    include: { user: true },
  });

  if (!dbSession) {
    return res.status(401).json(null);
  }

  if (dbSession.expiresAt && dbSession.expiresAt.getTime() <= Date.now()) {
    return res.status(401).json({ error: "Session expired" });
  }

  return res.json({
    user: dbSession.user,
    session: {
      id: dbSession.id,
      expiresAt: dbSession.expiresAt,
    },
  });
});

app.get("/device" , async(req , res)=>{
  const {user_code} = req.query;
  res.redirect(`http://localhost:3000/device?user_code=${user_code}`)
});

const start = async () => {
  await ensureDbConnectionOrExit({
    retries: Number(process.env.DB_CONNECT_RETRIES || 10),
    initialDelayMs: Number(process.env.DB_CONNECT_INITIAL_DELAY_MS || 500),
    maxDelayMs: Number(process.env.DB_CONNECT_MAX_DELAY_MS || 5000),
  });

  const server = app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`\nReceived ${signal}. Shutting down...`);
      server.close(() => {
        process.exitCode = 0;
      });
      await prisma.$disconnect();
    } catch {
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start();