import { cancel, confirm, intro, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod";
import dotenv from "dotenv";
import prisma from "../../../lib/db.js";

dotenv.config();

const URL = "http://localhost:8080";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

export const loginAction = async (cmdOptions) => {
  const schema = z.object({
    serverUrl: z.string().optional(),
    clientId: z.string().optional(),
  });

  const options = schema.parse({
    serverUrl: cmdOptions.serverUrl,
    clientId: cmdOptions.clientId,
  });

  const serverUrl = options.serverUrl || URL;
  const clientId = options.clientId || CLIENT_ID;

  intro(chalk.bold("Auth CLI Login"));

  // TODO: Replace with real token logic
  const existingToken = false;
  const expired = false;

  if (existingToken && !expired) {
    const shouldReAuth = await confirm({
      message: "You are already logged in. Do you want to login again?",
      initialValue: false,
    });

    if (isCancel(shouldReAuth)) {
      cancel("Login cancelled");
      process.exit(0);
    }

    if (!shouldReAuth) {
      cancel("Login aborted");
      process.exit(0);
    }
  }

  
};

// Commander setup
export const login = new Command("login")
  .description("Login to Better Auth")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
  .action(loginAction);
