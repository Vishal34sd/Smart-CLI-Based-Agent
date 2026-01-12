import { cancel, confirm, intro, outro, isCancel } from "@clack/prompts";
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
import { fileURLToPath } from "url";
import { getStoredToken, isTokenExpired, storeToken } from "../../../lib/token.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const URL = "http://localhost:8080";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

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

  const existingToken = await getStoredToken();
  const expired = await isTokenExpired();

  if (existingToken && !expired) {
    const shouldReAuth = await confirm({
      message: "Your are already logged-In. Do You want to login Again",
      initialValue: false,
    });

    if (isCancel(shouldReAuth) || !shouldReAuth) {
      cancel("Login Cancelled");
      process.exit(0);
    }
  }

  const authClient = createAuthClient({
    baseURL: serverUrl,
    plugins: [deviceAuthorizationClient()],
  });

  const spinner = yoctoSpinner({
    text: "Requesting device authorization...",
  }).start();

  try {
    const { data, error } = await authClient.device.code({
      client_id: clientId,
      scope: "openid profile email",
    });

    spinner.stop();

    if (error || !data) {
      const errorMessage =
        error?.error_description ||
        error?.message ||
        JSON.stringify(error) ||
        "Unknown error";
      console.error(
        chalk.red(`Failed to request device authorization: ${errorMessage}`),
      );
      process.exit(1);
    }

    const {
      user_code,
      verification_uri,
      verification_uri_complete,
      expires_in,
      device_code,
      interval,
    } = data;

    console.log(chalk.cyan("\nDevice Authorization Required"));
    console.log(
      `Visit: ${chalk.underline.blue(
        verification_uri_complete || verification_uri,
      )}`,
    );
    console.log(`Enter Code: ${chalk.bold.green(user_code)}\n`);

    const shouldOpen = await confirm({
      message: "Open browser automatically?",
      initialValue: true,
    });

    if (!isCancel(shouldOpen) && shouldOpen) {
      const uriToOpen = verification_uri_complete || verification_uri;
      await open(uriToOpen);
    }

    console.log(
      chalk.gray(
        `Waiting for authorization (expires in ${Math.floor(
          expires_in / 60,
        )} minutes)...`,
      ),
    );

    const token = await pollForToken(
      authClient,
      device_code,
      clientId,
      interval,
    );

    if (token) {
      const saved = await storeToken(token);

      if (!saved) {
        console.log(chalk.yellow("\n Warming: Could not save authentication token."));
        console.log(chalk.yellow("You may need to login again on next use."));
      }

      outro(chalk.green("Login successfull !"));

      console.log(chalk.gray(`\n Token saved to: ${TOKEN_FILE}`));

      console.log(
        chalk.gray("You can now use AI commands without logging in again. \n "),
      );
    }
  } catch (err) {
    spinner.stop();
    console.error(chalk.red("Login failed:"), err);
    process.exit(1);
  }
};

const pollForToken = async (
  authClient,
  deviceCode,
  clientId,
  initialInterval,
) => {
  let pollingInterval = initialInterval;
  let dots = 0;

  const spinner = yoctoSpinner({ text: "", color: "cyan" });

  return new Promise((resolve, reject) => {
    const poll = async () => {
      dots = (dots + 1) % 4;
      spinner.text = chalk.gray(
        `Polling for authorization ${".".repeat(dots)}${" ".repeat(3 - dots)}`,
      );

      if (!spinner.isSpinning) spinner.start();

      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: clientId,
          fetchOptions: {
            headers: {
              "user-agent": `My CLI`,
            },
          },
        });

        if (data?.access_token) {
          console.log(
            chalk.bold.yellow(`Your access token: ${data.access_token}`),
          );

          spinner.stop();
          resolve(data);
          return;
        } else if (error) {
          switch (error.error) {
            case "authorization_pending":
              break;
            case "slow_down":
              pollingInterval += 5;
              break;
            case "access_denied":
              spinner.stop();
              console.error("Access was denied by the user");
              reject(new Error("access_denied"));
              return;
            case "expired_token":
              spinner.stop();
              console.error("The device code has expired. Please try again.");
              reject(new Error("expired_token"));
              return;
            default:
              spinner.stop();
              logger.error(`Error: ${error.error_description}`);
              reject(
                new Error(error.error_description || "Unknown device error"),
              );
              return;
          }
        }
      } catch (err) {
        spinner.stop();
        logger.error(`Error: ${err?.message || err}`);
        return;
      }

      setTimeout(poll, pollingInterval * 1000);
    };

    setTimeout(poll, pollingInterval * 1000);
  });
};

export const login = new Command("login")
  .description("Login to Better Auth")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
  .action(loginAction);
