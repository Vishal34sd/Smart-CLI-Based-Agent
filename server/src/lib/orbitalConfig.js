import fs from "fs";
import fsPromises from "fs/promises";
import os from "os";
import path from "path";

export const ORBITAL_CONFIG_DIR = path.join(os.homedir(), ".orbital");
export const ORBITAL_CONFIG_FILE = path.join(ORBITAL_CONFIG_DIR, "config.json");

export const readOrbitalConfigSync = () => {
  try {
    if (!fs.existsSync(ORBITAL_CONFIG_FILE)) return {};
    const raw = fs.readFileSync(ORBITAL_CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const getGeminiApiKeySync = () => {
  const config = readOrbitalConfigSync();
  const key = config?.geminiApiKey;
  return typeof key === "string" ? key.trim() : "";
};

export const setGeminiApiKey = async (apiKey) => {
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmed) throw new Error("API key is required");

  await fsPromises.mkdir(ORBITAL_CONFIG_DIR, { recursive: true });

  const nextConfig = {
    geminiApiKey: trimmed,
    updatedAt: new Date().toISOString(),
  };

  await fsPromises.writeFile(
    ORBITAL_CONFIG_FILE,
    JSON.stringify(nextConfig, null, 2),
    "utf-8",
  );

  return true;
};
