import { Command } from "commander";
import chalk from "chalk";
import { setGeminiApiKey } from "../../../lib/orbitalConfig.js";
import { getCredentialServiceName } from "../../../lib/credentialStore.js";

const setKeyAction = async (apiKey) => {
  try {
    await setGeminiApiKey(apiKey);
    console.log(chalk.green("Gemini API key saved."));
    console.log(
      chalk.gray(
        `Stored securely in your OS credential manager (service: ${getCredentialServiceName()}).`
      )
    );
  } catch (err) {
    console.log(chalk.red("Failed to save key:"), err?.message || err);
    process.exit(1);
  }
};

export const setkey = new Command("set-key")
  .description("Store your Gemini API key securely (keytar)")
  .argument("<API_KEY>", "Your Gemini API key")
  .alias("set")
  .alias("setkey")
  .action(setKeyAction);
