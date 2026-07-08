import { migrateLegacyStorageKey } from "./storage-keys.js";

const STORAGE_KEY = "homepassport-ai:appliances:v1";
const LEGACY_KEY = "home-passport:appliances:v1";

migrateLegacyStorageKey(STORAGE_KEY, LEGACY_KEY);

/**
 * @typedef {import("./storage.js").ApplianceRecord} ApplianceRecord
 */

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
    const name = err instanceof DOMException ? err.name : "";
    if (name === "QuotaExceededError") {
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

export function clearLocalAppliances() {
  localStorage.removeItem(STORAGE_KEY);
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

/** @returns {number} */
export function recoverLocalInventory() {
  const fromScan = scanAllApplianceStorage().appliances;
  const fromLegacy = loadAllLegacyAppliances();
  const seen = new Set();
  const merged = [];

  for (const item of [...fromScan, ...fromLegacy]) {
    if (item?.id && !seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }

  if (merged.length === 0) return 0;
  replaceLocalAppliances(merged);
  return merged.length;
}

/** Read legacy keys from before rebrand. @returns {ApplianceRecord[]} */
export function loadAllLegacyAppliances() {
  const keys = [
    STORAGE_KEY,
    LEGACY_KEY,
    "homepassport-ai:appliances:v1",
  ];
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
