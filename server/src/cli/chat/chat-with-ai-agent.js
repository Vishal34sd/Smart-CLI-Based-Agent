import chalk from "chalk";
import boxen from "boxen";
import { text, isCancel, cancel, intro, outro, confirm } from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { getStoredToken } from "../../lib/token.js";
import {
  createApplicationFiles,
  displayFileTree,
  generateApplicationPlan,
} from "../../config/agentConfig.js";
import { apiRequestSafe } from "../utils/apiClient.js";
import { AIService } from "../ai/googleService.js";
import { requireGeminiApiKey } from "../../lib/orbitalConfig.js";

marked.use(markedTerminal());

const getEnabledToolNames = () => {
  return [];
};

const getUserFromToken = async () => {
  const token = await getStoredToken();

  if (!token?.access_token) {
    throw new Error("Not authenticated. Please run 'orbital login' first.");
  }

  const spinner = yoctoSpinner({ text: "Authenticating..." }).start();
  try {
    const result = await apiRequestSafe("/api/cli/me");
    const user = result?.user;

    if (!user) {
      spinner.error("User not found");
      throw new Error("User not found. Please login again");
    }

    spinner.success(`Welcome back, ${user.name}!`);
    return user;
  } finally {
    spinner.stop();
  }
};

const initConversation = async (userId, conversationId = null, mode = "tool") => {
  const spinner = yoctoSpinner({ text: "Loading conversation..." }).start();

  const result = await apiRequestSafe("/api/cli/conversations/init", {
    method: "POST",
    body: { conversationId, mode },
  });
  const conversation = result?.conversation;

  spinner.success("Conversation Loaded");

  const enabledToolNames = getEnabledToolNames();
  const toolsDisplay =
    enabledToolNames.length > 0
      ? `\n${chalk.gray("Active Tools:")} ${enabledToolNames.join(", ")}`
      : `\n${chalk.gray("No tools enabled")}`;

  const conversationInfo = boxen(
    `${chalk.bold("Conversation")}: ${conversation.title}\n${chalk.gray(
      "ID: " + conversation.id
    )}\n${chalk.gray("Mode: " + conversation.mode)}${toolsDisplay}\n${chalk.cyan(
      "Working Directory: "
    )}${process.cwd()}`,
    {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "magenta",
      title: "Agent Mode",
      titleAlignment: "center",
    }
  );

  console.log(conversationInfo);
  return conversation;
};

const saveMessage = async (conversationId, role, content) => {
  return await apiRequestSafe("/api/cli/messages", {
    method: "POST",
    body: { conversationId, role, content },
  });
};

const agentLoop = async (conversation) => {
  const helpBox = boxen(
    `${chalk.cyan.bold("What can the agent do?")}\n\n` +
      `${chalk.gray("• Generate complete applications from descriptions")}\n` +
      `${chalk.gray("• Create all necessary files and folders")}\n` +
      `${chalk.gray("• Include setup instructions and commands")}\n` +
      `${chalk.gray("• Generate production-ready code")}\n\n` +
      `${chalk.yellow.bold("Examples:")}\n` +
      `${chalk.white('• "Build a todo app with React and Tailwind"')}\n` +
      `${chalk.white('• "Create a REST API with Express and MongoDB"')}\n` +
      `${chalk.white('• "Make a weather app using OpenWeatherMap API"')}\n\n` +
      `${chalk.gray("Type 'exit' to end the session")}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
      title: "Agent Instructions",
    }
  );

  console.log(helpBox);

  while (true) {
    const userInput = await text({
      message: chalk.magenta("What would you like to build?"),
      placeholder: "Describe your application...",
      validate(value) {
        if (!value || value.trim().length === 0) {
          return "Description cannot be empty";
        }
        if (value.trim().length < 10) {
          return "Please provide more details (at least 10 characters)";
        }
      },
    });

    if (isCancel(userInput)) {
      console.log(chalk.yellow("\nAgent session cancelled\n"));
      process.exit(0);
    }

    if (userInput.toLowerCase() === "exit") {
      console.log(chalk.yellow("\nAgent session ended\n"));
      break;
    }

    console.log(
      boxen(chalk.white(userInput), {
        padding: 1,
        margin: { left: 2, top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "blue",
        title: "Your Request",
        titleAlignment: "left",
      })
    );

    await saveMessage(conversation.id, "user", userInput);

    try {
      await requireGeminiApiKey();
      const aiService = new AIService();
      const application = await generateApplicationPlan(userInput, aiService);

      if (!application || !Array.isArray(application.files) || application.files.length === 0) {
        throw new Error("Generation returned no files.");
      }

      displayFileTree(application.files, application.folderName);

      const appDir = await createApplicationFiles(
        process.cwd(),
        application.folderName,
        application.files
      );

      const responseMessage =
        `Generated application: ${application.folderName}\n` +
        `Files created: ${application.files.length}\n` +
        `Location: ${appDir}\n\n` +
        `Setup commands:\n${(application.setupCommands || []).join("\n")}`;

      console.log(
        boxen(chalk.green(responseMessage), {
          padding: 1,
          margin: { top: 1, bottom: 1 },
          borderStyle: "round",
          borderColor: "green",
          title: "Generation Complete",
        })
      );

      await saveMessage(conversation.id, "assistant", responseMessage);

      const continuePrompt = await confirm({
        message: chalk.cyan("Would you like to generate another?"),
        initialValue: false,
      });

      if (isCancel(continuePrompt) || !continuePrompt) {
        console.log(chalk.yellow("\nGreat! Check your new application.\n"));
        break;
      }
    } catch (error) {
      console.log(chalk.red(`\n❌ Error: ${error.message}\n`));

      await saveMessage(conversation.id, "assistant", `Error: ${error.message}`);

      const retry = await confirm({
        message: chalk.cyan("Would you like to try again?"),
        initialValue: true,
      });

      if (isCancel(retry) || !retry) {
        break;
      }
    }
  }
};

export const startAgentChat = async (conversationId = null) => {
  try {
    intro(
      boxen(
        chalk.bold.magenta("Orbital AI - Agent Mode\n\n") +
          chalk.gray("Autonomous Application Generator"),
        {
          padding: 1,
          borderStyle: "double",
          borderColor: "magenta",
        }
      )
    );

    const user = await getUserFromToken();

    const shouldContinue = await confirm({
      message: chalk.yellow(
        "The agent will create files and folders in the current directory. Continue?"
      ),
      initialValue: true,
    });

    if (isCancel(shouldContinue) || !shouldContinue) {
      cancel(chalk.yellow("Agent mode cancelled"));
      process.exit(0);
    }

    const conversation = await initConversation(user.id, conversationId);
    await agentLoop(conversation);

    outro(chalk.green.bold("\nThanks for using Agent Mode!"));
  } catch (error) {
    console.log(
      boxen(chalk.red(`Error: ${error.message}`), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "red",
      })
    );
    process.exit(1);
  }
};
