import { google } from "@ai-sdk/google";
import { streamText, generateObject } from "ai";
import { config } from "../../config/googleConfig.js";
import chalk from "chalk";
import { requireGeminiApiKeySync } from "../../lib/orbitalConfig.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000; // 5 seconds

const isRateLimitError = (error) => {
  if (!error) return false;
  const message = (error?.message || "").toLowerCase();
  const statusCode = error?.status || error?.statusCode || error?.data?.code;
  return (
    statusCode === 429 ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("quota")
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class AIService {
  constructor() {
    const apiKey = requireGeminiApiKeySync();

    this.model = google(config.model, {
      apiKey,
    });
  }

  async sendMessage(messages, onChunk, tools = undefined, onToolCall = null) {
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const streamConfig = {
          model: this.model,
          messages,
          temperature: config.temperature,
        };

        if (tools && Object.keys(tools).length > 0) {
          streamConfig.tools = tools;
          streamConfig.maxSteps = 5;
          if (attempt === 1) {
            console.log(
              chalk.gray(
                `[DEBUG] Tools enabled: ${Object.keys(tools).join(", ")}`
              )
            );
          }
        }

        const result = await streamText(streamConfig);

        let fullResponse = "";

        for await (const chunk of result.textStream) {
          fullResponse += chunk;
          if (onChunk) onChunk(chunk);
        }

        const toolCalls = [];
        const toolResults = [];

        const steps = await Promise.resolve(result.steps);

        if (Array.isArray(steps)) {
          for (const step of steps) {
            if (
              step?.toolCalls &&
              Array.isArray(step.toolCalls) &&
              step.toolCalls.length > 0
            ) {
              for (const toolCall of step.toolCalls) {
                toolCalls.push(toolCall);
                if (onToolCall) onToolCall(toolCall);
              }
            }

            if (
              step?.toolResults &&
              Array.isArray(step.toolResults) &&
              step.toolResults.length > 0
            ) {
              toolResults.push(...step.toolResults);
            }
          }
        }

        return {
          content: fullResponse,
          finishReason: result.finishReason,
          usage: result.usage,
          toolCalls,
          toolResults,
          steps,
        };
      } catch (error) {
        lastError = error;

        if (isRateLimitError(error) && attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          const delaySec = Math.round(delayMs / 1000);
          console.log(
            chalk.yellow(
              `\n⚠ Rate limit hit (429). Retrying in ${delaySec}s... (attempt ${attempt}/${MAX_RETRIES})`
            )
          );
          await sleep(delayMs);
          continue;
        }

        // Provide an actionable message for rate-limit errors.
        if (isRateLimitError(error)) {
          console.error(
            chalk.red(
              "\n✖ Gemini API quota exhausted. All retry attempts failed."
            )
          );
          console.error(
            chalk.yellow(
              "  Possible fixes:\n" +
                "  1. Wait a few minutes and try again (free-tier resets per minute)\n" +
                "  2. Check your quota: https://ai.google.dev/gemini-api/docs/rate-limits\n" +
                "  3. Upgrade your Gemini API plan for higher limits\n" +
                "  4. Use a different API key with available quota"
            )
          );
        } else {
          console.error(
            chalk.red("AI Service Error:"),
            error?.message || error
          );
        }

        throw error;
      }
    }
  }

  async getMessage(messages, tools = undefined) {
    const result = await this.sendMessage(messages, null, tools);
    return result.content;
  }

  async generateStructured(schema, prompt) {
    try {
      const result = await generateObject({
        model: this.model,
        schema,
        prompt,
      });

      return result.object;
    } catch (error) {
      console.log(
        chalk.red("AI Structured Generation Error:"),
        error?.message || error
      );
      throw error;
    }
  }
}

