import { cancel, confirm, intro, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod";
import dotenv from "dotenv";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { logger } from "better-auth";

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

  const authClient = createAuthClient({
    baseURL: serverUrl,
    plugins: [
      deviceAuthorizationClient({
        provider: "github",
      }),
    ],
  });

  const spinner = yoctoSpinner({
    text: "Requesting device authorization...",
  }).start();

  try {
    const { data, error } = await authClient.device.code
    ({
      client_id: clientId,
      scope: "openid profile email",
    });

    spinner.stop();

    if (error || !data) {
      logger.error(
        `Failed to request device authorization: ${error?.error_description}`
      );
      process.exit(1);
    }

    const {
      user_code,
      verification_uri,
      verification_uri_complete,
      expires_in,
    } = data;

    console.log(chalk.cyan("\nDevice Authorization Required"));
    console.log(
      `Visit: ${chalk.underline.blue(
        verification_uri_complete || verification_uri
      )}`
    );
    console.log(`Enter Code: ${chalk.bold.green(user_code)}\n`);

    const shouldOpen = await confirm({
      message: "Open browser automatically?",
      initialValue: true,
    });

    if (!isCancel(shouldOpen) && shouldOpen) {
      const uriToOpen =
        verification_uri_complete || verification_uri;
      await open(uriToOpen);
    }

    console.log(
      chalk.gray(
        `Waiting for authorization (expires in ${Math.floor(
          expires_in / 60
        )} minutes)...`
      )
    );
  } catch (err) {
    spinner.stop();
    console.error(chalk.red("Login failed:"), err);
    process.exit(1);
  }
};

// Commander setup
export const login = new Command("login")
  .description("Login to Better Auth")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
  .action(loginAction);
