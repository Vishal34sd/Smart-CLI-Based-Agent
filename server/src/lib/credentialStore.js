const ORBITAL_KEYTAR_SERVICE = "orbital-cli";
const ORBITAL_API_KEY_ACCOUNT = "api-key";

const loadKeytar = async () => {
  try {
    const mod = await import("keytar");
    return mod?.default ?? mod;
  } catch (err) {
    const wrapped = new Error(
      "keytar is not available. Install it and ensure your OS keychain is supported."
    );
    wrapped.cause = err;
    wrapped.code = "ORBITAL_KEYTAR_NOT_AVAILABLE";
    throw wrapped;
  }
};

export const getCredentialServiceName = () => ORBITAL_KEYTAR_SERVICE;
export const getApiKeyAccountName = (provider = "gemini") => {
  const p = (provider || "gemini").toLowerCase().trim();
  if (p === "google" || p === "gemini") return "api-key-gemini";
  if (p === "openai") return "api-key-openai";
  if (p === "xai" || p === "grok") return "api-key-grok";
  return `api-key-${p}`;
};

export const getStoredApiKey = async (provider = "gemini") => {
  const keytar = await loadKeytar();
  const account = getApiKeyAccountName(provider);
  let value = await keytar.getPassword(ORBITAL_KEYTAR_SERVICE, account);

  // Backward-compatibility for Gemini: fall back to legacy ORBITAL_API_KEY_ACCOUNT
  const p = (provider || "gemini").toLowerCase().trim();
  if (!value && (p === "gemini" || p === "google")) {
    value = await keytar.getPassword(
      ORBITAL_KEYTAR_SERVICE,
      ORBITAL_API_KEY_ACCOUNT
    );
  }

  return typeof value === "string" ? value.trim() : "";
};

export const storeApiKey = async (apiKey, provider = "gemini") => {
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmed) throw new Error("API key is required");

  const keytar = await loadKeytar();
  const account = getApiKeyAccountName(provider);
  await keytar.setPassword(ORBITAL_KEYTAR_SERVICE, account, trimmed);

  // For Gemini, also keep legacy account updated for backward compatibility
  const p = (provider || "gemini").toLowerCase().trim();
  if (p === "gemini" || p === "google") {
    await keytar.setPassword(
      ORBITAL_KEYTAR_SERVICE,
      ORBITAL_API_KEY_ACCOUNT,
      trimmed
    );
  }

  return true;
};

export const deleteStoredApiKey = async (provider = "gemini") => {
  const keytar = await loadKeytar();
  const account = getApiKeyAccountName(provider);
  await keytar.deletePassword(ORBITAL_KEYTAR_SERVICE, account);

  const p = (provider || "gemini").toLowerCase().trim();
  if (p === "gemini" || p === "google") {
    await keytar.deletePassword(
      ORBITAL_KEYTAR_SERVICE,
      ORBITAL_API_KEY_ACCOUNT
    );
  }

  return true;
};

