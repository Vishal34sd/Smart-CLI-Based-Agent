import { Command } from "commander";
import chalk from "chalk";
import { setGeminiApiKey, ORBITAL_CONFIG_FILE } from "../../../lib/orbitalConfig.js";

const setKeyAction = async (apiKey) => {
  try {
    await setGeminiApiKey(apiKey);
    console.log(chalk.green("Gemini API key saved."));
    console.log(chalk.gray(`Stored at: ${ORBITAL_CONFIG_FILE}`));
  } catch (err) {
    console.log(chalk.red("Failed to save key:"), err?.message || err);
    process.exit(1);
  }
};

export const setkey = new Command("setkey")
  .description("Set Gemini API key for Orbital")
  .argument("<apiKey>", "Your Gemini API key")
  .action(setKeyAction);
