const STORAGE_KEY = "homepassport-ai:documents:v1";

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

/** @returns {DocumentRecord[]} */
export function loadDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {DocumentRecord[]} list */
function saveDocuments(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "QuotaExceededError") {
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
