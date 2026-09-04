import { Command } from "commander";
import chalk from "chalk";
import { select, password, isCancel, cancel } from "@clack/prompts";
import { setApiKey, normalizeProviderName } from "../../../lib/orbitalConfig.js";
import { getCredentialServiceName } from "../../../lib/credentialStore.js";
import { AI_PROVIDERS } from "../../../config/aiConfig.js";

const setKeyAction = async (apiKeyArg, cmdOptions) => {
  try {
    let provider = cmdOptions.provider;
    let apiKey = apiKeyArg;

    // Interactive mode if key was not supplied via command line argument
    if (!apiKey) {
      if (!provider) {
        const provChoice = await select({
          message: "Select AI Provider to configure API key for:",
          options: [
            { value: "gemini", label: "Google Gemini", hint: "AI Studio API key" },
            { value: "openai", label: "OpenAI", hint: "platform.openai.com key" },
            { value: "grok", label: "Grok (xAI)", hint: "console.x.ai key" },
          ],
        });

        if (isCancel(provChoice)) {
          cancel("Operation cancelled.");
          return;
        }
        provider = provChoice;
      }

      const provInfo = AI_PROVIDERS[normalizeProviderName(provider)];
      const enteredKey = await password({
        message: `Enter your ${provInfo?.name || provider} API key:`,
        validate(value) {
          if (!value || !value.trim()) return "API key cannot be empty";
        },
      });

      if (isCancel(enteredKey)) {
        cancel("Operation cancelled.");
        return;
      }

      apiKey = enteredKey;
    }

    const norm = normalizeProviderName(provider || "gemini");
    const provInfo = AI_PROVIDERS[norm];

    await setApiKey(norm, apiKey);

    console.log(
      chalk.green(`\n✔ ${provInfo?.name || norm} API key saved successfully.`)
    );
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
  .description("Store your AI provider API key securely in keytar (Gemini, OpenAI, Grok)")
  .argument("[API_KEY]", "Your AI provider API key")
  .option(
    "-p, --provider <provider>",
    "AI provider: gemini (default), openai, or grok",
    "gemini"
  )
  .alias("set")
  .alias("setkey")
  .action(setKeyAction);
