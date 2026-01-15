import chalk from "chalk";
import boxen from "boxen";
import {
  text,
  isCancel,
  cancel,
  intro,
  outro,
  multiselect,
} from "@clack/prompts";
import yoctoSpinner from "yocto-spinner";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { AIService } from "../ai/googleService.js";
import { ChatService } from "../../service/chatService.js";
import { getStoredToken } from "../../lib/token.js";
import prisma from "../../lib/db.js";
import { ensureDbConnection } from "../../lib/dbHealth.js";
import {
  availableTools,
  enableTools,
  getEnabledTools,
  getEnabledToolNames,
  resetTools,
} from "../../config/toolConfig.js";

marked.use(
  markedTerminal({
    code: chalk.cyan,
    blockquote: chalk.gray.italic,
    heading: chalk.green.bold,
    firstHeading: chalk.magenta.underline.bold,
    hr: chalk.reset,
    listitem: chalk.reset,
    list: chalk.reset,
    paragraph: chalk.reset,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow.bgBlack,
    del: chalk.dim.gray.strikethrough,
    link: chalk.blue.underline,
    href: chalk.blue.underline,
  })
);

const aiService = new AIService();
const chatService = new ChatService();

const getUserFromToken = async () => {
  const token = await getStoredToken();

  if (!token?.access_token) {
    throw new Error("Not authenticated. Please run 'orbital login' first.");
  }

  const dbOk = await ensureDbConnection();
  if (!dbOk) {
    throw new Error("Database unavailable. Fix DATABASE_URL/connectivity and try again.");
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

const selectTools = async () => {
  const truncateHint = (text, maxLen = 70) => {
    if (!text) return "";
    const singleLine = String(text).replace(/\s+/g, " ").trim();
    if (singleLine.length <= maxLen) return singleLine;
    return singleLine.slice(0, Math.max(0, maxLen - 3)) + "...";
  };

  const toolOptions = availableTools.map((tool) => ({
    value: tool.id,
    label: tool.name,
    // Long hints wrap in the terminal and look like duplicated options.
    hint: truncateHint(tool.description),
  }));

  const selectedTools = await multiselect({
    message: chalk.cyan(
      "Select tools to enable (Space to select, Enter to confirm):"
    ),
    options: toolOptions,
    required: false,
  });

  if (isCancel(selectedTools)) {
    cancel(chalk.yellow("Tool selection cancelled"));
    process.exit(0);
  }

  enableTools(selectedTools);

  if (selectedTools.length === 0) {
    console.log(chalk.yellow("\nNo tools selected. AI will work without tools.\n"));
  } else {
    const toolBox = boxen(
      chalk.green(
        `Enabled tools:\n${selectedTools
          .map((id) => {
            const tool = availableTools.find((t) => t.id === id);
            return tool ? ` • ${tool.name}` : ` • ${id}`;
          })
          .join("\n")}`
      ),
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "green",
        title: "Active Tools",
        titleAlignment: "center",
      }
    );
    console.log(toolBox);
  }

  return selectedTools.length > 0;
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
    )}\n${chalk.gray("Mode: " + conversation.mode)}${toolsDisplay}`,
    {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
      title: "Chat Session",
      titleAlignment: "center",
    }
  );

  console.log(conversationInfo);

  if (conversation.messages?.length > 0) {
    console.log(chalk.yellow("Previous Messages:\n"));
    displayMessages(conversation.messages);
  }

  return conversation;
};

const displayMessages = (messages) => {
  messages.forEach((msg) => {
    if (msg.role === "user") {
      const userBox = boxen(chalk.white(msg.content), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderStyle: "round",
        borderColor: "blue",
        title: "You",
        titleAlignment: "left",
      });
      console.log(userBox);
    } else {
      const renderedContent = marked.parse(msg.content);
      const assistantBox = boxen(renderedContent.trim(), {
        padding: 1,
        margin: { left: 2, bottom: 1 },
        borderStyle: "round",
        borderColor: "green",
        title: "Assistant",
        titleAlignment: "left",
      });
      console.log(assistantBox);
    }
  });
};

const updateConversationTitle = async (conversationId, userInput, messageCount) => {
  if (messageCount === 1) {
    const title = userInput.slice(0, 50) + (userInput.length > 50 ? "..." : "");
    await chatService.updateTitle(conversationId, title);
  }
};

const saveMessage = async (conversationId, role, content) => {
  return await chatService.addMessage(conversationId, role, content);
};

const getAIResponse = async (conversationId) => {
  const spinner = yoctoSpinner({ text: "AI is thinking..." }).start();

  const dbMessages = await chatService.getMessages(conversationId);
  const aiMessages = chatService.formatMessageForAI(dbMessages);

  const tools = getEnabledTools();

  let fullResponse = "";
  let isFirstChunk = true;
  const toolCallsDetected = [];

  try {
    const result = await aiService.sendMessage(
      aiMessages,
      (chunk) => {
        if (isFirstChunk) {
          spinner.stop();
          console.log("\n");
          console.log(chalk.green.bold("Assistant: "));
          console.log(chalk.gray("-".repeat(60)));
          isFirstChunk = false;
        }
        fullResponse += chunk;
      },
      tools,
      (toolCall) => {
        toolCallsDetected.push(toolCall);
      }
    );

    // If the model returned without streaming any chunks, stop the spinner here
    // so it doesn't keep animating into the next prompt.
    if (isFirstChunk) {
      spinner.stop();
      console.log("\n");
      console.log(chalk.green.bold("Assistant: "));
      console.log(chalk.gray("-".repeat(60)));
      isFirstChunk = false;
    }

    if (toolCallsDetected.length > 0) {
      console.log("\n");
      const toolCallBox = boxen(
        toolCallsDetected
          .map(
            (tc) =>
              `${chalk.cyan("Tool:")} ${tc.toolName}\n${chalk.gray("Args:")} ${JSON.stringify(
                tc.args,
                null,
                2
              )}`
          )
          .join("\n\n"),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "cyan",
          title: "Tool Calls",
        }
      );
      console.log(toolCallBox);
    }

    if (result?.toolResults && result.toolResults.length > 0) {
      const toolResultBox = boxen(
        result.toolResults
          .map(
            (tr) =>
              `${chalk.green("✓ Tool:")} ${tr.toolName}\n${chalk.gray(
                "Result:"
              )} ${String(JSON.stringify(tr.result, null, 2)).slice(0, 200)}...`
          )
          .join("\n\n"),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          title: "🧰 Tool Results",
        }
      );
      console.log(toolResultBox);
    }

    console.log("\n");
    console.log(marked.parse(fullResponse));
    console.log(chalk.gray("-".repeat(60)));
    console.log("\n");

    return result?.content ?? fullResponse.trim();
  } catch (error) {
    spinner.error("Failed to get AI response");
    throw error;
  }
};

const chatLoop = async (conversation) => {
  const enabledToolNames = getEnabledToolNames();

  const helpText = [
    "• Type your message and press Enter",
    `• AI has access to: ${
      enabledToolNames.length > 0 ? enabledToolNames.join(", ") : "No tools"
    }`,
    '• Type "exit" to end conversation',
    "• Press Ctrl+C to quit anytime",
  ]
    .map((line) => chalk.gray(line))
    .join("\n");

  console.log(
    boxen(helpText, {
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: "round",
      borderColor: "gray",
      dimBorder: true,
    })
  );

  while (true) {
    const userInput = await text({
      message: chalk.blue("Your message"),
      placeholder: "Type your message...",
      validate(value) {
        if (!value || value.trim().length === 0) return "Message cannot be empty";
      },
    });

    if (isCancel(userInput)) {
      console.log(
        boxen(chalk.yellow("Chat session ended. Goodbye!"), {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "yellow",
        })
      );
      process.exit(0);
    }

    if (userInput.trim().toLowerCase() === "exit") {
      console.log(
        boxen(chalk.yellow("Chat session ended. Goodbye!"), {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "yellow",
        })
      );
      break;
    }

    console.log(
      boxen(chalk.white(userInput), {
        padding: 1,
        margin: { left: 2, top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "blue",
        title: "You",
        titleAlignment: "left",
      })
    );

    await saveMessage(conversation.id, "user", userInput);
    const messages = await chatService.getMessages(conversation.id);

    const aiResponse = await getAIResponse(conversation.id);
    await saveMessage(conversation.id, "assistant", aiResponse);

    await updateConversationTitle(conversation.id, userInput, messages.length);
  }
};

export const startToolChat = async (conversationId) => {
  try {
    intro(
      boxen(chalk.bold.cyan("Orbital AI - Tool Calling Mode"), {
        padding: 1,
        borderStyle: "double",
        borderColor: "cyan",
      })
    );

    const user = await getUserFromToken();

    await selectTools();

    const conversation = await initConversation(user.id, conversationId, "tool");

    await chatLoop(conversation);

    resetTools();
    outro(chalk.green("Thanks for using tools"));
  } catch (error) {
    console.log(
      boxen(chalk.red(`Error: ${error.message}`), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "red",
      })
    );
    resetTools();
    process.exit(1);
  }
};
