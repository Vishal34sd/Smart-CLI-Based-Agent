import chalk from "chalk";
import { API_BASE } from "../../config/api.js";
import { getStoredToken, requireAuth } from "../../lib/token.js";

const buildUrl = (path) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
};

const getAuthHeader = async (isRequired) => {
  const token = isRequired ? await requireAuth() : await getStoredToken();
  if (!token?.access_token) return {};

  const headerValue = token.token_type
    ? `${token.token_type} ${token.access_token}`
    : `Bearer ${token.access_token}`;

  return { Authorization: headerValue };
};

export const apiRequest = async (
  path,
  { method = "GET", body, requireAuth: isRequired = true } = {}
) => {
  const headers = {
    "content-type": "application/json",
    ...(await getAuthHeader(isRequired)),
  };

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(`Failed to reach server at ${API_BASE}`);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || response.statusText;
    throw new Error(`${errorMessage} (HTTP ${response.status})`);
  }

  return data;
};

export const apiRequestSafe = async (...args) => {
  try {
    return await apiRequest(...args);
  } catch (error) {
    console.error(chalk.red(error?.message || "Request failed"));
    throw error;
  }
};
