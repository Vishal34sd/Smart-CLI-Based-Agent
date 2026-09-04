import { google } from "@ai-sdk/google";
import chalk from "chalk";
import {
  normalizeProviderName,
  requireApiKeySync,
  hasApiKeySync,
} from "../lib/orbitalConfig.js";

export const availableTools = [
  // Google Gemini Native Tools
  {
    id: "google_search",
    name: "Google Search",
    description:
      "Access the latest information using Google Search. Useful for current events, news, and real-time information",
    provider: "gemini",
    getTool: () => google.tools.googleSearch({}),
    enabled: false,
  },
  {
    id: "code_execution",
    name: "Code Execution",
    description:
      "Generate and execute Python code to perform calculations, solve problems or provide accurate information",
    provider: "gemini",
    getTool: () => google.tools.codeExecution({}),
    enabled: false,
  },
  {
    id: "url_context",
    name: "URL Context",
    description:
      "Provide specific URLs that you want the model to analyse directly from the prompt. Supports up to 20 URLs per request.",
    provider: "gemini",
    getTool: () => google.tools.urlContext({}),
    enabled: false,
  },
];

export const getToolsForProvider = (provider = "gemini") => {
  const norm = normalizeProviderName(provider);
  return availableTools.filter(
    (tool) => tool.provider === "all" || tool.provider === norm
  );
};

export const getEnabledTools = (provider = "gemini") => {
  const norm = normalizeProviderName(provider);
  const tools = {};

  try {
    const providerTools = getToolsForProvider(norm);

    for (const toolConfig of providerTools) {
      if (toolConfig.enabled) {
        if (toolConfig.provider === "gemini" && !hasApiKeySync("gemini")) {
          requireApiKeySync("gemini");
        }
        tools[toolConfig.id] = toolConfig.getTool();
      }
    }

    return Object.keys(tools).length > 0 ? tools : undefined;
  } catch (error) {
    console.error(
      chalk.red(`[ERROR] Failed to initialize tools:`),
      error?.message || error
    );
    return undefined;
  }
};

export const toggleTool = (toolId) => {
  const tool = availableTools.find((t) => t.id === toolId);

  if (tool) {
    tool.enabled = !tool.enabled;
    return tool.enabled;
  }

  return false;
};

export const toogleTool = toggleTool;

export const enableTools = (toolIds = []) => {
  availableTools.forEach((tool) => {
    tool.enabled = toolIds.includes(tool.id);
  });
};

export const getEnabledToolNames = () => {
  return availableTools.filter((t) => t.enabled).map((t) => t.name);
};

export const resetTools = () => {
  availableTools.forEach((tool) => {
    tool.enabled = false;
  });
};

