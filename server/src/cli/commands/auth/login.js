import "../../../config/env.js";
import { cancel, confirm, intro, outro, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import open from "open";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod";

import { fileURLToPath } from "url";
import { getStoredToken, isTokenExpired, storeToken ,TOKEN_FILE } from "../../../lib/token.js";
import { API_BASE } from "../../../config/api.js";
import { apiRequestSafe } from "../../utils/apiClient.js";
import { requireGeminiApiKey } from "../../../lib/orbitalConfig.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = API_BASE;

/**
 * Request a device authorization code from the server via direct fetch.
 * Replaces: authClient.device.code()
 */
const safeJson = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const requestDeviceCode = async (serverUrl, clientId, scope) => {
  const res = await fetch(`${serverUrl}/api/auth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, scope }),
  });

  const body = await safeJson(res);

  if (!res.ok) {
    return { data: null, error: body || { message: `HTTP ${res.status}` } };
  }
  return { data: body, error: null };
};

/**
 * Poll for a device token from the server via direct fetch.
 * Replaces: authClient.device.token()
 */
const requestDeviceToken = async (serverUrl, deviceCode, clientId) => {
  const res = await fetch(`${serverUrl}/api/auth/device/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": "Orbital CLI",
    },
    body: JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: clientId,
    }),
  });

  const body = await safeJson(res);

  if (!res.ok) {
    return { data: null, error: body || { message: `HTTP ${res.status}` } };
  }
  return { data: body, error: null };
};

const resolveClientId = async (cliClientId) => {
  const resolved = (cliClientId || "").trim();
  if (resolved.length > 0) return resolved;

  const response = await apiRequestSafe("/auth/github/client-id", {
    method: "GET",
    requireAuth: false,
  });

  const clientId = typeof response?.client_id === "string" ? response.client_id.trim() : "";
  return clientId.length > 0 ? clientId : undefined;
};


export const loginAction = async (cmdOptions) => {
  try {
    await requireGeminiApiKey();
  } catch {
    console.log(chalk.red("Gemini API key not set. Run: orbital set-key <API_KEY>"));
    process.exit(1);
  }

  const schema = z.object({
    serverUrl: z.string().optional(),
    clientId: z.string().optional(),
  });

  const options = schema.parse({
    serverUrl: cmdOptions.serverUrl,
    clientId: cmdOptions.clientId,
  });

  const serverUrl = options.serverUrl || URL;
  const clientId = await resolveClientId(options.clientId);

  if (!clientId) {
    console.error(chalk.red("GitHub OAuth client ID is not available from the server."));
    console.log(
      chalk.gray(
        "Make sure the backend is deployed and configured with GITHUB_CLIENT_ID.",
      ),
    );
    process.exit(1);
  }

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

  const spinner = yoctoSpinner({
    text: "Requesting device authorization...",
  }).start();

  try {
    const { data, error } = await requestDeviceCode(
      serverUrl,
      clientId,
      "openid profile email",
    );

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
      serverUrl,
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
  serverUrl,
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
        const { data, error } = await requestDeviceToken(
          serverUrl,
          deviceCode,
          clientId,
        );

        if (data?.access_token) {
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
              console.error(`Error: ${error.error_description}`);
              reject(
                new Error(error.error_description || "Unknown device error"),
              );
              return;
          }
        }
      } catch (err) {
        spinner.stop();
        console.error(`Error: ${err?.message || err}`);
        return;
      }

      setTimeout(poll, pollingInterval * 1000);
    };

    setTimeout(poll, pollingInterval * 1000);
  });
};

export const login = new Command("login")
  .description("Login to Orbital CLI")
  .option("--server-url <url>", "The server URL", URL)
  .option("--client-id <id>", "The OAuth client ID")
  .action(loginAction);
