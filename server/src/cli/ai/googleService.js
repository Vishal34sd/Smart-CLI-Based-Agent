import { streamText, generateObject } from "ai";
import { config } from "../../config/googleConfig.js";
import chalk from "chalk";
import {
  normalizeProviderName,
  getSelectedModelSync,
} from "../../lib/orbitalConfig.js";
import {
  AI_PROVIDERS,
  createModelInstance,
  getModelDisplayName,
  parseModelChoice,
} from "../../config/aiConfig.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 3000; // 3 seconds

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
  constructor(modelConfig = null) {
    let resolved;

    if (modelConfig) {
      resolved = parseModelChoice(modelConfig);
    } else {
      const saved = getSelectedModelSync();
      const provider = process.env.ORBITAL_PROVIDER || saved?.provider || "gemini";
      const model =
        process.env.ORBITAL_MODEL ||
        saved?.model ||
        AI_PROVIDERS[normalizeProviderName(provider)]?.defaultModel ||
        "gemini-2.5-flash";
      resolved = { provider: normalizeProviderName(provider), model };

    }

    this.provider = resolved.provider;
    this.modelName = resolved.model;
    this.model = createModelInstance(this.provider, this.modelName);
  }

  getDisplayName() {
    return getModelDisplayName(this.provider, this.modelName);
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
        }

        const result = await streamText(streamConfig);

        let fullResponse = "";

        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            const chunk = part.text ?? part.textDelta ?? "";
            fullResponse += chunk;
            if (onChunk) onChunk(chunk);
          }
        }



        if (!fullResponse) {
          try {
            fullResponse = (await result.text) || "";
          } catch {
            // ignore if result.text is not available
          }
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

        if (!fullResponse && toolResults.length > 0) {
          fullResponse = toolResults
            .map((tr) => {
              const output = tr.output ?? tr.result;
              const resStr =
                typeof output === "object"
                  ? JSON.stringify(output)
                  : String(output);
              return `Tool ${tr.toolName} output: ${resStr}`;
            })
            .join("\n");
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
              `\n⚠ Rate limit hit (429) on ${this.getDisplayName()}. Retrying in ${delaySec}s... (attempt ${attempt}/${MAX_RETRIES})`
            )
          );
          await sleep(delayMs);
          continue;
        }

        // Provide actionable provider-specific error messages
        if (isRateLimitError(error)) {
          const provInfo = AI_PROVIDERS[this.provider];
          console.error(
            chalk.red(
              `\n✖ ${this.getDisplayName()} rate limit / quota exhausted. All retry attempts failed.`
            )
          );
          console.error(
            chalk.yellow(
              `  Possible fixes:\n` +
                `  1. Wait a moment and try again\n` +
                `  2. Check your quota & billing at: ${provInfo?.docsUrl || "provider portal"}\n` +
                `  3. Switch to another model or update your API key: orbital set-key --provider ${this.provider} <KEY>`
            )
          );
        } else {
          const detailedMsg =
            error?.data?.error?.message ||
            error?.message ||
            error;
          console.error(
            chalk.red(`AI Service Error (${this.getDisplayName()}):`),
            detailedMsg
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
        chalk.red(`AI Structured Generation Error (${this.getDisplayName()}):`),
        error?.message || error
      );
      throw error;
    }
  }
}
