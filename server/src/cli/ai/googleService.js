import { google } from "@ai-sdk/google";
import { streamText, generateObject } from "ai";
import { config } from "../../config/googleConfig.js";
import chalk from "chalk";

export class AIService {
  constructor() {
    if (!config.googleApiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in env");
    }

    this.model = google(config.model, {
      apiKey: config.googleApiKey,
    });
  }

  async sendMessage(messages, onChunk, tools = undefined, onToolCall = null) {
    try {
      const streamConfig = {
        model: this.model,
        messages,
        temperature: config.temperature,
      };

      if (tools && Object.keys(tools).length > 0) {
        streamConfig.tools = tools;
        streamConfig.maxSteps = 5;
        console.log(
          chalk.gray(`[DEBUG] Tools enabled: ${Object.keys(tools).join(", ")}`)
        );
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
      console.error(chalk.red("AI Service Error:"), error?.message || error);
      throw error;
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

