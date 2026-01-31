import chalk from "chalk";
import boxen from "boxen";
import { text, isCancel, cancel, intro, outro, confirm } from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { AIService } from "../ai/googleService.js";
import { ChatService } from "../../service/chatService.js";
import { getStoredToken } from "../../lib/token.js";
import prisma from "../../lib/db.js";
import { ensureDbConnection } from "../../lib/dbHealth.js";
import { generateApplication } from "../../config/agentConfig.js";

marked.use(markedTerminal());

let aiService;
const chatService = new ChatService();

const getEnabledToolNames = () => {
  return [];
};

const getUserFromToken = async () => {
  const token = await getStoredToken();

  if (!token?.access_token) {
    throw new Error("Not authenticated. Please run 'orbital login' first.");
  }

  const dbOk = await ensureDbConnection();
  if (!dbOk) {
    throw new Error(
      "Database unavailable. Fix DATABASE_URL/connectivity and try again."
    );
  }

  const spinner = yoctoSpinner({ text: "Authenticating..." }).start();

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: { token: token.access_token },
      },
    },
  });

  if (!user) {
    spinner.error("User not found");
    throw new Error("User not found. Please login again");
  }

  spinner.success(`Welcome back, ${user.name}!`);
  return user;
};

const initConversation = async (userId, conversationId = null, mode = "tool") => {
  const spinner = yoctoSpinner({ text: "Loading conversation..." }).start();

  const conversation = await chatService.getOrCreateConversation(
    userId,
    conversationId,
    mode
  );

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
  return await chatService.addMessage(conversationId, role, content);
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
      const result = await generateApplication(
        userInput,
        aiService,
        process.cwd()
      );

      if (!result || !result.success) {
        throw new Error("Generation returned no result.");
      }

      const responseMessage =
        `Generated application: ${result.folderName}\n` +
        `Files created: ${result.files.length}\n` +
        `Location: ${result.appDir}\n\n` +
        `Setup commands:\n${result.commands.join("\n")}`;

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
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error(
        "Gemini API key is not set. Run: orbital setkey <your-gemini-api-key>"
      );
    }

    aiService = new AIService();

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
