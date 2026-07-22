import { migrateLegacyStorageKey } from "./storage-keys.js";

const STORAGE_KEY = "homepassport-ai:appliances:v1";
const LEGACY_KEY = "home-passport:appliances:v1";
const KNOWN_KEYS = [STORAGE_KEY, LEGACY_KEY, "homepassport-ai:appliances:v1"];

migrateLegacyStorageKey(STORAGE_KEY, LEGACY_KEY);

/**
 * @typedef {import("./storage.js").ApplianceRecord} ApplianceRecord
 */

/** @param {unknown} err */
export function isQuotaExceededError(err) {
  if (!err || typeof err !== "object") return false;
  const name = /** @type {{ name?: string }} */ (err).name;
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /quota.?exceeded|storage full/i.test(msg);
}

/** @returns {ApplianceRecord[]} */
export function loadLocalAppliances() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {ApplianceRecord[]} list */
export function saveLocalAppliances(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      throw new Error("Storage full — try removing old appliances or use a smaller photo.");
    }
    throw err;
  }
}

/** @param {ApplianceRecord} record */
export function addLocalAppliance(record) {
  const list = loadLocalAppliances();
  list.unshift(record);
  saveLocalAppliances(list);
  return record;
}

/** @param {string} id */
export function deleteLocalAppliance(id) {
  const list = loadLocalAppliances().filter((a) => a.id !== id);
  saveLocalAppliances(list);
}

/** @param {string} id @returns {ApplianceRecord | undefined} */
export function getLocalAppliance(id) {
  return loadLocalAppliances().find((a) => a.id === id);
}

/** @param {string} id @param {Partial<ApplianceRecord>} updates */
export function updateLocalAppliance(id, updates) {
  const list = loadLocalAppliances();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  saveLocalAppliances(list);
  return list[idx];
}

/** @param {Iterable<string>} keys */
function removeApplianceKeys(keys) {
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // private mode
    }
  }
}

/**
 * Remove every on-device appliance list (canonical, legacy, and scan matches).
 * Used after a successful cloud migrate so leftovers cannot refill localStorage.
 */
export function clearLocalAppliances() {
  /** @type {string[]} */
  let matchedKeys = [];
  try {
    matchedKeys = scanAllApplianceStorage().matchedKeys;
  } catch {
    // ignore scan failures — still clear known keys
  }
  removeApplianceKeys([...KNOWN_KEYS, ...matchedKeys]);
}

/** Scan every localStorage key for saved appliance arrays. */
export function scanAllApplianceStorage() {
  /** @type {string[]} */
  const matchedKeys = [];
  /** @type {ApplianceRecord[]} */
  const appliances = [];
  const seen = new Set();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 20) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      const first = parsed[0];
      if (!first || typeof first !== "object") continue;
      if (!first.appliancePhotoDataUrl && !first.nickname) continue;
      matchedKeys.push(key);
      for (const item of parsed) {
        if (item?.id && !seen.has(item.id)) {
          seen.add(item.id);
          appliances.push(item);
        }
      }
    } catch {
      // not appliance JSON
    }
  }

  return { matchedKeys, appliances };
}

/**
 * Consolidate leftover guest/legacy appliance keys into the canonical key.
 * Never throws on quota — automatic recovery must not surface as an app crash.
 * @returns {number}
 */
export function recoverLocalInventory() {
  const { matchedKeys, appliances: fromScan } = scanAllApplianceStorage();
  const fromLegacy = loadAllLegacyAppliances();
  const seen = new Set();
  /** @type {ApplianceRecord[]} */
  const merged = [];

  for (const item of [...fromScan, ...fromLegacy]) {
    if (item?.id && !seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }

  if (merged.length === 0) return 0;

  const current = loadLocalAppliances();
  const currentIds = new Set(current.map((item) => item.id));
  const alreadyComplete =
    current.length > 0 && merged.every((item) => item?.id && currentIds.has(item.id));

  const extras = [
    ...matchedKeys.filter((key) => key !== STORAGE_KEY),
    ...KNOWN_KEYS.filter((key) => key !== STORAGE_KEY),
  ];

  if (alreadyComplete) {
    removeApplianceKeys(extras);
    return current.length;
  }

  try {
    replaceLocalAppliances(merged);
    removeApplianceKeys(extras);
    return merged.length;
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err;
  }

  // Canonical write failed (often because legacy/duplicate keys still hold the same
  // photo-heavy payload). Free those copies, then retry once with the in-memory merge.
  removeApplianceKeys(extras);
  try {
    replaceLocalAppliances(merged);
    return merged.length;
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err;
    // Don't leave the user with nothing if canonical still won't fit — put the
    // in-memory merge back under the legacy key when possible.
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(merged));
    } catch {
      console.warn("Could not recover local inventory — browser storage is full.");
    }
    return loadLocalAppliances().length;
  }
}

/** Read legacy keys from before rebrand. @returns {ApplianceRecord[]} */
export function loadAllLegacyAppliances() {
  const keys = KNOWN_KEYS;
  const seen = new Set();
  const all = [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (item?.id && !seen.has(item.id)) {
          seen.add(item.id);
          all.push(item);
        }
      }
    } catch {
      // skip bad data
    }
  }
  return all;
}

/** @param {ApplianceRecord[]} items */
export function replaceLocalAppliances(items) {
  saveLocalAppliances(items);
}
