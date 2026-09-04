import fs from "fs";
import fsPromises from "fs/promises";
import os from "os";
import path from "path";

import { getStoredApiKey, storeApiKey } from "./credentialStore.js";

export const ORBITAL_CONFIG_DIR = path.join(os.homedir(), ".orbital");
export const ORBITAL_CONFIG_FILE = path.join(ORBITAL_CONFIG_DIR, "config.json");

const normalizeOrbitalConfig = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const next = { ...value };

  // Legacy metadata (no longer written).
  if ("updatedAt" in next) delete next.updatedAt;

  // The Gemini API key is no longer stored on disk.
  if ("gemini_api_key" in next) delete next.gemini_api_key;
  if ("geminiApiKey" in next) delete next.geminiApiKey;

  return next;
};

export const readOrbitalConfigSync = () => {
  try {
    if (!fs.existsSync(ORBITAL_CONFIG_FILE)) return {};
    const raw = fs.readFileSync(ORBITAL_CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return normalizeOrbitalConfig(parsed);
  } catch {
    return {};
  }
};

const readOrbitalConfigRawSync = () => {
  try {
    if (!fs.existsSync(ORBITAL_CONFIG_FILE)) return {};
    const raw = fs.readFileSync(ORBITAL_CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

export const readOrbitalConfig = async () => {
  try {
    if (!fs.existsSync(ORBITAL_CONFIG_FILE)) return {};
    const raw = await fsPromises.readFile(ORBITAL_CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return normalizeOrbitalConfig(parsed);
  } catch {
    return {};
  }
};

export const writeOrbitalConfig = async (nextConfig) => {
  await fsPromises.mkdir(ORBITAL_CONFIG_DIR, { recursive: true });

  const normalized = normalizeOrbitalConfig(nextConfig);
  const tmpFile = path.join(
    ORBITAL_CONFIG_DIR,
    `config.json.${process.pid}.${Date.now()}.tmp`
  );

  await fsPromises.writeFile(tmpFile, JSON.stringify(normalized, null, 2), "utf-8");
  try {
    await fsPromises.rename(tmpFile, ORBITAL_CONFIG_FILE);
  } catch (err) {
    // Windows cannot rename over an existing file.
    await fsPromises.unlink(ORBITAL_CONFIG_FILE).catch(() => {});
    await fsPromises.rename(tmpFile, ORBITAL_CONFIG_FILE);
  }

  return true;
};

export const updateOrbitalConfig = async (patch = {}) => {
  const current = await readOrbitalConfig();
  const nextConfig = normalizeOrbitalConfig({ ...current, ...patch });
  await writeOrbitalConfig(nextConfig);
  return nextConfig;
};

// --- Model Preference Persistence ---

export const getSelectedModel = async () => {
  const cfg = await readOrbitalConfig();
  let model = cfg.selectedModel || "gemini-2.5-flash";
  if (model.includes("gemini-2.0")) model = "gemini-2.5-flash";
  return {
    provider: cfg.selectedProvider || "gemini",
    model,
  };
};

export const getSelectedModelSync = () => {
  const cfg = readOrbitalConfigSync();
  let model = cfg.selectedModel || "gemini-2.5-flash";
  if (model.includes("gemini-2.0")) model = "gemini-2.5-flash";
  return {
    provider: cfg.selectedProvider || "gemini",
    model,
  };
};

export const saveSelectedModel = async ({ provider, model }) => {
  return await updateOrbitalConfig({
    selectedProvider: provider,
    selectedModel: model,
  });
};

// --- Multi-Provider API Key Management ---

export const normalizeProviderName = (provider = "gemini") => {
  const p = (provider || "gemini").toLowerCase().trim();
  if (p === "google" || p === "gemini") return "gemini";
  if (p === "openai") return "openai";
  if (p === "xai" || p === "grok") return "grok";
  return p;
};

export const getApiKeyFromEnvSync = (provider = "gemini") => {
  const norm = normalizeProviderName(provider);
  if (norm === "gemini") {
    return (
      (typeof process.env.GOOGLE_GENERATIVE_AI_API_KEY === "string" &&
        process.env.GOOGLE_GENERATIVE_AI_API_KEY.trim()) ||
      (typeof process.env.GEMINI_API_KEY === "string" &&
        process.env.GEMINI_API_KEY.trim()) ||
      ""
    );
  }
  if (norm === "openai") {
    return (
      (typeof process.env.OPENAI_API_KEY === "string" &&
        process.env.OPENAI_API_KEY.trim()) ||
      ""
    );
  }
  if (norm === "grok") {
    return (
      (typeof process.env.XAI_API_KEY === "string" &&
        process.env.XAI_API_KEY.trim()) ||
      (typeof process.env.GROK_API_KEY === "string" &&
        process.env.GROK_API_KEY.trim()) ||
      ""
    );
  }
  return "";
};

const getLegacyGeminiApiKeyFromConfigSync = () => {
  const config = readOrbitalConfigRawSync();
  const key =
    (typeof config?.gemini_api_key === "string" && config.gemini_api_key.trim()) ||
    (typeof config?.geminiApiKey === "string" && config.geminiApiKey.trim()) ||
    "";
  return key;
};

const removeLegacyGeminiApiKeyFromConfig = async () => {
  const currentRaw = readOrbitalConfigRawSync();
  if (!currentRaw || typeof currentRaw !== "object") return false;
  if (!("gemini_api_key" in currentRaw) && !("geminiApiKey" in currentRaw)) return false;

  const next = { ...currentRaw };
  if ("gemini_api_key" in next) delete next.gemini_api_key;
  if ("geminiApiKey" in next) delete next.geminiApiKey;
  await writeOrbitalConfig(next);
  return true;
};

export const hydrateApiKeyEnv = async (provider = "gemini") => {
  const norm = normalizeProviderName(provider);
  const already = getApiKeyFromEnvSync(norm);
  if (already) return already;

  // OS credential manager via keytar
  try {
    const fromKeytar = await getStoredApiKey(norm);
    if (fromKeytar) {
      if (norm === "gemini") {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = fromKeytar;
      } else if (norm === "openai") {
        process.env.OPENAI_API_KEY = fromKeytar;
      } else if (norm === "grok") {
        process.env.XAI_API_KEY = fromKeytar;
      }
      return fromKeytar;
    }
  } catch {
    // Ignore keytar error; will be handled in requireApiKey
  }

  // One-time migration for legacy Gemini key on disk
  if (norm === "gemini") {
    const legacy = getLegacyGeminiApiKeyFromConfigSync();
    if (legacy) {
      await storeApiKey(legacy, "gemini");
      await removeLegacyGeminiApiKeyFromConfig().catch(() => {});
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = legacy;
      return legacy;
    }
  }

  return "";
};

export const hydrateAllApiKeysEnv = async () => {
  await Promise.all([
    hydrateApiKeyEnv("gemini"),
    hydrateApiKeyEnv("openai"),
    hydrateApiKeyEnv("grok"),
  ]);
};

export const getApiKeySync = (provider = "gemini") => {
  return getApiKeyFromEnvSync(provider);
};

export const getApiKey = async (provider = "gemini") => {
  const norm = normalizeProviderName(provider);
  const fromEnv = getApiKeyFromEnvSync(norm);
  if (fromEnv) return fromEnv;
  return await hydrateApiKeyEnv(norm);
};

export const hasApiKeySync = (provider = "gemini") => {
  return Boolean(getApiKeyFromEnvSync(provider));
};

export const requireApiKeySync = (provider = "gemini") => {
  const norm = normalizeProviderName(provider);
  const apiKey = getApiKeyFromEnvSync(norm);
  if (!apiKey) {
    const displayName =
      norm === "gemini" ? "Gemini" : norm === "openai" ? "OpenAI" : "Grok (xAI)";
    const err = new Error(
      `${displayName} API key not set. Run: orbital set-key --provider ${norm} <API_KEY>`
    );
    err.code = `ORBITAL_${norm.toUpperCase()}_API_KEY_NOT_SET`;
    throw err;
  }
  return apiKey;
};

export const requireApiKey = async (provider = "gemini") => {
  const norm = normalizeProviderName(provider);
  const apiKey = await getApiKey(norm);
  if (!apiKey) {
    const displayName =
      norm === "gemini" ? "Gemini" : norm === "openai" ? "OpenAI" : "Grok (xAI)";
    const err = new Error(
      `${displayName} API key not set. Run: orbital set-key --provider ${norm} <API_KEY>`
    );
    err.code = `ORBITAL_${norm.toUpperCase()}_API_KEY_NOT_SET`;
    throw err;
  }
  return apiKey;
};

export const setApiKey = async (provider = "gemini", apiKey) => {
  const norm = normalizeProviderName(provider);
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmed) throw new Error("API key is required");

  await storeApiKey(trimmed, norm);

  if (norm === "gemini") {
    await removeLegacyGeminiApiKeyFromConfig().catch(() => {});
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = trimmed;
    process.env.GEMINI_API_KEY = trimmed;
  } else if (norm === "openai") {
    process.env.OPENAI_API_KEY = trimmed;
  } else if (norm === "grok") {
    process.env.XAI_API_KEY = trimmed;
    process.env.GROK_API_KEY = trimmed;
  }

  return true;
};

// --- Back-compatibility exports for Gemini ---

export const hydrateGeminiApiKeyEnv = () => hydrateApiKeyEnv("gemini");
export const getGeminiApiKeySync = () => getApiKeySync("gemini");
export const getGeminiApiKey = () => getApiKey("gemini");
export const hasGeminiApiKeySync = () => hasApiKeySync("gemini");
export const requireGeminiApiKeySync = () => requireApiKeySync("gemini");
export const requireGeminiApiKey = () => requireApiKey("gemini");
export const setGeminiApiKey = (apiKey) => setApiKey("gemini", apiKey);
export const requireGeminiApiKeyFromConfigSync = requireGeminiApiKeySync;
