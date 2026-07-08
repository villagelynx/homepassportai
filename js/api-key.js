import { migrateLegacyStorageKey } from "./storage-keys.js";

const STORAGE_KEY = "homepassport-ai:openai-api-key:v1";
const LEGACY_KEY = "home-passport:openai-api-key:v1";

migrateLegacyStorageKey(STORAGE_KEY, LEGACY_KEY);

/** @returns {string} */
export function loadApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

/** @param {string} key */
export function saveApiKey(key) {
  const trimmed = key.trim();
  if (!trimmed) {
    clearApiKey();
    return;
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}

/** @returns {boolean} */
export function hasUserApiKey() {
  return Boolean(loadApiKey());
}

/** @param {string} key */
export function maskApiKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}••••${key.slice(-4)}`;
}
