import chalk from "chalk";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";
import { getStoredToken } from "../../../lib/token.js";
import { select, password, isCancel, cancel } from "@clack/prompts";
import { startChat } from "../../../cli/chat/chat-with-ai.js";
import { startToolChat } from "../../../cli/chat/chat-with-ai-tools.js";
import { startAgentChat } from "../../../cli/chat/chat-with-ai-agent.js";
import { apiRequestSafe } from "../../utils/apiClient.js";
import {
  getApiKey,
  setApiKey,
  getSelectedModel,
  saveSelectedModel,
} from "../../../lib/orbitalConfig.js";
import {
  AI_PROVIDERS,
  getModelSelectOptions,
  parseModelChoice,
  getModelDisplayName,
} from "../../../config/aiConfig.js";

const wakeUpAction = async () => {
  const token = await getStoredToken();
  if (!token?.access_token) {
    console.log(chalk.red("Not Authenticated. Please run 'orbital login' first."));
    return;
  }

  const spinner = yoctoSpinner({ text: "Fetching user information..." });
  spinner.start();

  let user;
  try {
    const result = await apiRequestSafe("/api/cli/me");
    user = result?.user;
  } finally {
    spinner.stop();
  }

  if (!user) {
    console.log(chalk.red("User not found. Please log in again with 'orbital login'."));
    return;
  }

  console.log(chalk.green(`Welcome back, ${user.name}! \n`));

  // 1. Ask user to select the AI model FIRST
  const savedModel = await getSelectedModel();
  const modelOptions = getModelSelectOptions();
  const defaultModelValue = `${savedModel.provider}:${savedModel.model}`;

  const selectedModelChoice = await select({
    message: "Select an AI Model:",
    options: modelOptions,
    initialValue: modelOptions.some((o) => o.value === defaultModelValue)
      ? defaultModelValue
      : undefined,
  });

  if (isCancel(selectedModelChoice)) {
    cancel("Model selection cancelled.");
    return;
  }

  const { provider, model } = parseModelChoice(selectedModelChoice);
  await saveSelectedModel({ provider, model });

  // 2. Ensure API key is configured for the chosen model/provider
  let apiKey = await getApiKey(provider);
  if (!apiKey) {
    const provInfo = AI_PROVIDERS[provider];
    console.log(
      chalk.yellow(
        `\n${provInfo?.name || provider} API key is required. (Obtain one at: ${provInfo?.docsUrl || "provider portal"})`
      )
    );

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

    await setApiKey(provider, enteredKey);
    console.log(chalk.green(`✔ ${provInfo?.name || provider} API key saved securely.\n`));
  }

  console.log(
    chalk.cyan(`Active AI Model: ${chalk.bold(getModelDisplayName(provider, model))}\n`)
  );

  // 3. Mode selection
  const choice = await select({
    message: "Select an Option",
    options: [
      {
        value: "chat",
        label: "Chat",
        hint: "Simple chat with AI",
      },
      {
        value: "tool",
        label: "Tool Calling",
        hint: "Chat with tools and code execution",
      },
      {
        value: "agent",
        label: "Agentic Mode",
        hint: "Fullstack application generation agent",
      },
    ],
  });

  if (isCancel(choice)) {
    cancel("Operation cancelled.");
    return;
  }

  const modelConfig = { provider, model };

  switch (choice) {
    case "chat":
      await startChat("chat", null, modelConfig);
      break;
    case "tool":
      await startToolChat(modelConfig);
      break;
    case "agent":
      await startAgentChat(modelConfig);
      break;
  }
};

export const wakeUp = new Command("wakeup")
  .description("Wake up the AI")
  .alias("wake-up")
  .alias("wakup")
  .action(wakeUpAction);