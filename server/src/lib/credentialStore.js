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
export const getApiKeyAccountName = () => ORBITAL_API_KEY_ACCOUNT;

export const getStoredApiKey = async () => {
  const keytar = await loadKeytar();
  const value = await keytar.getPassword(
    ORBITAL_KEYTAR_SERVICE,
    ORBITAL_API_KEY_ACCOUNT
  );
  return typeof value === "string" ? value.trim() : "";
};

export const storeApiKey = async (apiKey) => {
  const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmed) throw new Error("API key is required");

  const keytar = await loadKeytar();
  await keytar.setPassword(
    ORBITAL_KEYTAR_SERVICE,
    ORBITAL_API_KEY_ACCOUNT,
    trimmed
  );
  return true;
};

export const deleteStoredApiKey = async () => {
  const keytar = await loadKeytar();
  await keytar.deletePassword(ORBITAL_KEYTAR_SERVICE, ORBITAL_API_KEY_ACCOUNT);
  return true;
};
