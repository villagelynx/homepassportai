import { migrateLegacyStorageKey, storageKey } from "./storage-keys.js";

const STORAGE_KEY = storageKey("documents:v1");
const LEGACY_KEY = "home-passport:documents:v1";
const ALT_KEYS = [
  STORAGE_KEY,
  LEGACY_KEY,
  "homepassport-ai:documents:v1",
  "home-passport:documents",
  "homepassport-ai:documents",
];

migrateLegacyStorageKey(STORAGE_KEY, LEGACY_KEY);

/**
 * @typedef {"insurancePolicy" | "propertyTax" | "propertyAssessment" | "propertyTaxDeferment" | "taxUtilities" | "propertyMap"} DocumentType
 */

/**
 * @typedef {object} InsurancePolicyFields
 * @property {string} insurerName
 * @property {string} policyNumber
 * @property {string} policyType
 * @property {string} namedInsureds
 * @property {string} propertyAddress
 * @property {string} effectiveDate
 * @property {string} expirationDate
 * @property {string} dwellingCoverage
 * @property {string} personalPropertyCoverage
 * @property {string} liabilityCoverage
 * @property {string} deductible
 * @property {string} annualPremium
 * @property {string} agentName
 * @property {string} agentPhone
 */

/**
 * @typedef {object} PropertyTaxFields
 * @property {string} taxingAuthority
 * @property {string} parcelNumber
 * @property {string} propertyAddress
 * @property {string} taxYear
 * @property {string} assessedValue
 * @property {string} taxAmount
 * @property {string} dueDates
 * @property {string} exemptions
 */

/**
 * @typedef {object} DocumentRecord
 * @property {string} id
 * @property {DocumentType} type
 * @property {string} nickname
 * @property {string} photoDataUrl
 * @property {InsurancePolicyFields | PropertyTaxFields | Record<string, string>} extracted
 * @property {string} confidence
 * @property {string} scannedAt ISO timestamp
 */

/** @param {unknown} item @returns {item is DocumentRecord} */
function looksLikeDocument(item) {
  if (!item || typeof item !== "object") return false;
  const doc = /** @type {Record<string, unknown>} */ (item);
  return typeof doc.id === "string" && typeof doc.type === "string" && typeof doc.scannedAt === "string";
}

/** @param {string | null} raw @returns {DocumentRecord[]} */
function parseDocumentList(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(looksLikeDocument);
  } catch {
    return [];
  }
}

/** @returns {DocumentRecord[]} */
export function loadDocuments() {
  try {
    return parseDocumentList(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** @param {unknown} err */
function isQuotaExceededError(err) {
  if (!err || typeof err !== "object") return false;
  const name = /** @type {{ name?: string }} */ (err).name;
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /quota.?exceeded|storage full/i.test(msg);
}

/** @param {DocumentRecord[]} list */
function saveDocuments(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      throw new Error("Storage full — try removing an older saved document.");
    }
    throw err;
  }
}

/** @param {DocumentRecord} record */
export function addDocument(record) {
  const list = loadDocuments();
  list.unshift(record);
  saveDocuments(list);
  return record;
}

/** @param {string} id */
export function deleteDocument(id) {
  const list = loadDocuments().filter((doc) => doc.id !== id);
  saveDocuments(list);
}

/** @param {string} id @returns {DocumentRecord | undefined} */
export function getDocument(id) {
  return loadDocuments().find((doc) => doc.id === id);
}

/** @param {DocumentType} type @returns {DocumentRecord[]} */
export function loadDocumentsByType(type) {
  return loadDocuments().filter((doc) => doc.type === type);
}

/** Scan known + any localStorage keys that look like document lists. */
export function scanAllDocumentStorage() {
  /** @type {string[]} */
  const matchedKeys = [];
  /** @type {DocumentRecord[]} */
  const documents = [];
  const seen = new Set();

  /** @param {string} key @param {string | null} raw */
  function ingest(key, raw) {
    const list = parseDocumentList(raw);
    if (list.length === 0) return;
    matchedKeys.push(key);
    for (const doc of list) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        documents.push(doc);
      }
    }
  }

  for (const key of ALT_KEYS) {
    try {
      ingest(key, localStorage.getItem(key));
    } catch {
      // ignore
    }
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || ALT_KEYS.includes(key)) continue;
      if (!/document/i.test(key)) continue;
      ingest(key, localStorage.getItem(key));
    }
  } catch {
    // private mode
  }

  return { matchedKeys, documents };
}

/** @param {string[]} matchedKeys */
function removeExtraDocumentKeys(matchedKeys) {
  for (const key of matchedKeys) {
    if (key === STORAGE_KEY) continue;
    try {
      localStorage.removeItem(key);
    } catch {
      // private mode
    }
  }
}

/**
 * Merge recovered documents into the canonical key.
 * Soft-fails on quota so automatic recovery never becomes an unhandled rejection.
 * @returns {number} total documents after recovery
 */
export function tryRecoverDocuments() {
  const current = loadDocuments();
  const { matchedKeys, documents: found } = scanAllDocumentStorage();
  if (found.length === 0) return current.length;

  const seen = new Set(current.map((d) => d.id));
  const merged = [...current];
  for (const doc of found) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      merged.push(doc);
    }
  }

  if (merged.length === current.length) {
    removeExtraDocumentKeys(matchedKeys);
    return current.length;
  }

  merged.sort((a, b) => String(b.scannedAt).localeCompare(String(a.scannedAt)));

  try {
    saveDocuments(merged);
    removeExtraDocumentKeys(matchedKeys);
    return merged.length;
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err;
  }

  removeExtraDocumentKeys(matchedKeys);
  try {
    saveDocuments(merged);
    return merged.length;
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err;
    console.warn("Could not recover documents — browser storage is full.");
    return current.length;
  }
}

/** @param {DocumentRecord[]} list */
export function replaceDocuments(list) {
  saveDocuments(list.filter(looksLikeDocument));
}

/**
 * Import documents from backup payload (array or { documents: [] }).
 * @param {unknown} payload
 * @returns {number} newly added count
 */
export function importDocumentsBackup(payload) {
  /** @type {unknown[]} */
  let incoming = [];
  if (Array.isArray(payload)) {
    incoming = payload;
  } else if (payload && typeof payload === "object") {
    const docs = /** @type {Record<string, unknown>} */ (payload).documents;
    if (Array.isArray(docs)) incoming = docs;
  }

  const valid = incoming.filter(looksLikeDocument);
  if (valid.length === 0) return 0;

  const existing = loadDocuments();
  const seen = new Set(existing.map((d) => d.id));
  let added = 0;
  for (const doc of valid) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    existing.unshift(doc);
    added += 1;
  }
  if (added > 0) saveDocuments(existing);
  return added;
}
