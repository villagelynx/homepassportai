const STORAGE_KEY = "homepassport-ai:openai-api-key";

/** Older keys — migrated on load; cleared only when user removes the key. */
const LEGACY_KEYS = [
  "homepassport-ai:openai-api-key:v1",
  "home-passport:openai-api-key:v1",
  "home-passport:openai-api-key",
  "openai-api-key",
];

function readStoredKey(storage, key) {
  try {
    return storage.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

function migrateApiKeyStorage() {
  try {
    const current = readStoredKey(localStorage, STORAGE_KEY);
    if (current) return;

    for (const key of LEGACY_KEYS) {
      const legacy = readStoredKey(localStorage, key);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        return;
      }
    }

    for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
      const legacy = readStoredKey(sessionStorage, key);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        sessionStorage.removeItem(key);
        return;
      }
    }
  } catch {
    // private mode / quota
  }
}

migrateApiKeyStorage();

/** @returns {string} */
export function loadApiKey() {
  migrateApiKeyStorage();
  return readStoredKey(localStorage, STORAGE_KEY);
}

/** @param {string} key */
export function saveApiKey(key) {
  const trimmed = key.trim();
  if (!trimmed) {
    clearApiKey();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    // private mode / quota
  }
}

export function clearApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
    for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
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
