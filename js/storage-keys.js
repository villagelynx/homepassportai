const LEGACY_PREFIX = "home-passport";
export const APP_STORAGE_PREFIX = "homepassport-ai";

/** @param {string} suffix */
export function storageKey(suffix) {
  return `${APP_STORAGE_PREFIX}:${suffix}`;
}

/** @param {string} newKey @param {string} legacyKey */
export function migrateLegacyStorageKey(newKey, legacyKey) {
  try {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy != null && localStorage.getItem(newKey) == null) {
      localStorage.setItem(newKey, legacy);
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // private mode / quota
  }
}

/** @param {string} suffix */
export function migrateFromLegacyPrefix(suffix) {
  const newKey = storageKey(suffix);
  const legacyKey = `${LEGACY_PREFIX}:${suffix}`;
  migrateLegacyStorageKey(newKey, legacyKey);
}
