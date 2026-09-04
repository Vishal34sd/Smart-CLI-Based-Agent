import "./env.js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { normalizeProviderName, requireApiKeySync } from "../lib/orbitalConfig.js";

export const AI_PROVIDERS = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    docsUrl: "https://aistudio.google.com/app/apikey",
    models: [
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        hint: "Google (Fast & versatile - Recommended)",
        isDefault: true,
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        hint: "Google (Complex reasoning & large context)",
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        hint: "Google (Lightweight & efficient)",
      },
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        hint: "Google (Extended analysis)",
      },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o",
    envKey: "OPENAI_API_KEY",
    docsUrl: "https://platform.openai.com/api-keys",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        hint: "OpenAI (Flagship multimodal intelligence)",
        isDefault: true,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        hint: "OpenAI (Fast & cost-effective)",
      },
    ],
  },
  grok: {
    id: "grok",
    name: "Grok (xAI)",
    defaultModel: "grok-2-latest",
    envKey: "XAI_API_KEY",
    docsUrl: "https://console.x.ai/",
    models: [
      {
        id: "grok-2-latest",
        name: "Grok 2",
        hint: "xAI (Frontier model with advanced reasoning)",
        isDefault: true,
      },
      {
        id: "grok-beta",
        name: "Grok Beta",
        hint: "xAI (Experimental release)",
      },
    ],
  },
};

/**
 * Returns options list suitable for @clack/prompts select()
 */
export const getModelSelectOptions = () => {
  const options = [];
  for (const provider of Object.values(AI_PROVIDERS)) {
    for (const model of provider.models) {
      options.push({
        value: `${provider.id}:${model.id}`,
        label: `${provider.name} - ${model.name}`,
        hint: model.hint,
      });
    }
  }
  return options;
};

/**
 * Parse a compound value like "openai:gpt-4o" or separate provider/model inputs
 */
export const parseModelChoice = (choice) => {
  if (!choice) return { provider: "gemini", model: "gemini-2.5-flash" };
  if (typeof choice === "object") {
    const provider = normalizeProviderName(choice.provider || "gemini");
    const defaultModel = AI_PROVIDERS[provider]?.defaultModel || "gemini-2.5-flash";
    let model = choice.model || defaultModel;
    if (model.includes("gemini-2.0")) model = "gemini-2.5-flash";
    return {
      provider,
      model,
    };
  }

  if (typeof choice === "string" && choice.includes(":")) {
    const [p, m] = choice.split(":");
    const provider = normalizeProviderName(p);
    const model = m.includes("gemini-2.0") ? "gemini-2.5-flash" : m;
    return { provider, model };
  }

  // If only provider name is given
  const provider = normalizeProviderName(choice);
  return {
    provider,
    model: AI_PROVIDERS[provider]?.defaultModel || choice,
  };
};


export const getModelDisplayName = (provider, modelId) => {
  const norm = normalizeProviderName(provider);
  const provInfo = AI_PROVIDERS[norm];
  if (!provInfo) return `${provider} (${modelId})`;
  const modelInfo = provInfo.models.find((m) => m.id === modelId);
  return modelInfo ? `${provInfo.name} (${modelInfo.name})` : `${provInfo.name} (${modelId})`;
};

/**
 * Creates a language model instance for Vercel AI SDK
 */
export const createModelInstance = (provider, modelName, apiKey = null) => {
  const norm = normalizeProviderName(provider);
  const key = apiKey || requireApiKeySync(norm);

  switch (norm) {
    case "openai": {
      const openai = createOpenAI({ apiKey: key });
      return openai(modelName);
    }
    case "grok": {
      const xai = createXai({ apiKey: key });
      return xai(modelName);
    }
    case "gemini":
    default: {
      const google = createGoogleGenerativeAI({ apiKey: key });
      return google(modelName);
    }
  }
};
