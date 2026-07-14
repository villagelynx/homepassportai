const OPENAI_KEY = "homepassport-ai:openai-api-key";
const ANTHROPIC_KEY = "homepassport-ai:anthropic-api-key";
const PROVIDER_KEY = "homepassport-ai:ai-provider";

/** @typedef {"openai" | "anthropic"} AiProvider */

/** Older OpenAI keys — migrated on load. */
const LEGACY_OPENAI_KEYS = [
  "homepassport-ai:openai-api-key:v1",
  "home-passport:openai-api-key:v1",
  "home-passport:openai-api-key",
  "openai-api-key",
];

/** @param {Storage} storage @param {string} key */
function readStoredKey(storage, key) {
  try {
    return storage.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

/** @param {string} key @param {string} value */
function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode / quota
  }
}

function migrateOpenAiKeyStorage() {
  try {
    if (readStoredKey(localStorage, OPENAI_KEY)) return;

    for (const key of LEGACY_OPENAI_KEYS) {
      const legacy = readStoredKey(localStorage, key);
      if (legacy) {
        localStorage.setItem(OPENAI_KEY, legacy);
        return;
      }
    }

    for (const key of [OPENAI_KEY, ...LEGACY_OPENAI_KEYS]) {
      const legacy = readStoredKey(sessionStorage, key);
      if (legacy) {
        localStorage.setItem(OPENAI_KEY, legacy);
        sessionStorage.removeItem(key);
        return;
      }
    }
  } catch {
    // private mode / quota
  }
}

migrateOpenAiKeyStorage();

/** @returns {AiProvider} */
export function loadAiProvider() {
  const raw = readStoredKey(localStorage, PROVIDER_KEY).toLowerCase();
  return raw === "anthropic" ? "anthropic" : "openai";
}

/** @param {AiProvider} provider */
export function saveAiProvider(provider) {
  writeStored(PROVIDER_KEY, provider === "anthropic" ? "anthropic" : "openai");
}

/** @returns {string} */
export function loadApiKey() {
  migrateOpenAiKeyStorage();
  return readStoredKey(localStorage, OPENAI_KEY);
}

/** @returns {string} */
export function loadAnthropicApiKey() {
  return readStoredKey(localStorage, ANTHROPIC_KEY);
}

/** Active provider's key. */
export function loadActiveApiKey() {
  return loadAiProvider() === "anthropic" ? loadAnthropicApiKey() : loadApiKey();
}

/** @param {string} key */
export function saveApiKey(key) {
  const trimmed = key.trim();
  if (!trimmed) {
    clearOpenAiApiKey();
    return;
  }
  writeStored(OPENAI_KEY, trimmed);
}

/** @param {string} key */
export function saveAnthropicApiKey(key) {
  const trimmed = key.trim();
  if (!trimmed) {
    clearAnthropicApiKey();
    return;
  }
  writeStored(ANTHROPIC_KEY, trimmed);
}

export function clearOpenAiApiKey() {
  try {
    localStorage.removeItem(OPENAI_KEY);
    for (const key of LEGACY_OPENAI_KEYS) localStorage.removeItem(key);
    for (const key of [OPENAI_KEY, ...LEGACY_OPENAI_KEYS]) sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearAnthropicApiKey() {
  try {
    localStorage.removeItem(ANTHROPIC_KEY);
    sessionStorage.removeItem(ANTHROPIC_KEY);
  } catch {
    // ignore
  }
}

/** Clears the active provider's key. */
export function clearApiKey() {
  if (loadAiProvider() === "anthropic") clearAnthropicApiKey();
  else clearOpenAiApiKey();
}

/** @returns {boolean} */
export function hasUserApiKey() {
  return Boolean(loadActiveApiKey());
}

/** @param {string} key */
export function maskApiKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}••••${key.slice(-4)}`;
}

export function providerDisplayName(provider = loadAiProvider()) {
  return provider === "anthropic" ? "Claude" : "OpenAI";
}
