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

const getGeminiApiKeyFromEnvSync = () => {
  return typeof process.env.GOOGLE_GENERATIVE_AI_API_KEY === "string"
    ? process.env.GOOGLE_GENERATIVE_AI_API_KEY.trim()
    : "";
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

export const hydrateGeminiApiKeyEnv = async () => {
  const already = getGeminiApiKeyFromEnvSync();
  if (already) return already;

  // Primary: OS credential manager via keytar.
  try {
    const fromKeytar = await getStoredApiKey();
    if (fromKeytar) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = fromKeytar;
      return fromKeytar;
    }
  } catch {
    // ignore here; requireGeminiApiKey will surface a helpful error
  }

  // One-time migration: if the key exists in legacy ~/.orbital/config.json,
  // move it into keytar and remove it from disk.
  const legacy = getLegacyGeminiApiKeyFromConfigSync();
  if (legacy) {
    await storeApiKey(legacy);
    await removeLegacyGeminiApiKeyFromConfig().catch(() => {});
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = legacy;
    return legacy;
  }

  return "";
};

export const getGeminiApiKeySync = () => getGeminiApiKeyFromEnvSync();

export const getGeminiApiKey = async () => {
  const fromEnv = getGeminiApiKeyFromEnvSync();
  if (fromEnv) return fromEnv;
  return await hydrateGeminiApiKeyEnv();
};

export const hasGeminiApiKeySync = () => Boolean(getGeminiApiKeyFromEnvSync());

export const requireGeminiApiKeySync = () => {
  const apiKey = getGeminiApiKeyFromEnvSync();
  if (!apiKey) {
    const err = new Error(
      "Gemini API key not set. Run: orbital set-key <API_KEY>"
    );
    err.code = "ORBITAL_GEMINI_API_KEY_NOT_SET";
    throw err;
  }
  return apiKey;
};

export const requireGeminiApiKey = async () => {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    const err = new Error(
      "Gemini API key not set. Run: orbital set-key <API_KEY>"
    );
    err.code = "ORBITAL_GEMINI_API_KEY_NOT_SET";
    throw err;
  }
  return apiKey;
};

export const setGeminiApiKey = async (apiKey) => {
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmed) throw new Error("API key is required");

  await storeApiKey(trimmed);
  // Ensure any legacy on-disk key is removed.
  await removeLegacyGeminiApiKeyFromConfig().catch(() => {});

  process.env.GOOGLE_GENERATIVE_AI_API_KEY = trimmed;
  return true;
};

// Back-compat exports (no longer reads from config specifically).
export const requireGeminiApiKeyFromConfigSync = requireGeminiApiKeySync;

