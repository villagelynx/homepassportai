/**
 * Document scan types for the Reports hub.
 * Tax-like types share the same extracted field shape (PropertyTaxFields).
 */

/** @typedef {"insurancePolicy" | "propertyTax" | "propertyAssessment" | "propertyTaxDeferment" | "taxUtilities" | "propertyMap"} DocumentType */

/**
 * @typedef {object} DocumentTypeMeta
 * @property {DocumentType} id
 * @property {string} label
 * @property {string} sub
 * @property {string} scanTitle
 * @property {string} scanLede
 * @property {string} reviewTitle
 * @property {string} defaultNickname
 * @property {"insurance" | "taxLike"} form
 * @property {{ authority: string, year: string, assessed: string, amount: string, dates: string, notes: string, nicknamePlaceholder: string }} [taxLabels]
 */

/** @type {DocumentTypeMeta[]} */
export const DOCUMENT_TYPE_LIST = [
  {
    id: "insurancePolicy",
    label: "Insurance policy",
    sub: "Coverage, policy #, renewal",
    scanTitle: "Insurance policy",
    scanLede: "Photograph your declarations page, policy summary, or insurance ID card.",
    reviewTitle: "Confirm policy details",
    defaultNickname: "Insurance policy",
    form: "insurance",
  },
  {
    id: "propertyTax",
    label: "Property tax bill",
    sub: "Assessed value, amount due",
    scanTitle: "Property tax bill",
    scanLede: "Photograph your county property tax bill or tax statement.",
    reviewTitle: "Confirm tax bill details",
    defaultNickname: "Property tax bill",
    form: "taxLike",
    taxLabels: {
      authority: "Taxing authority",
      year: "Tax year",
      assessed: "Assessed value",
      amount: "Tax amount",
      dates: "Due date(s)",
      notes: "Exemptions / notes",
      nicknamePlaceholder: "King County Property Tax 2026",
    },
  },
  {
    id: "propertyAssessment",
    label: "Property assessment",
    sub: "Land & improvement values",
    scanTitle: "Property assessment",
    scanLede: "Photograph your assessment notice or valuation statement from the assessor.",
    reviewTitle: "Confirm assessment details",
    defaultNickname: "Property assessment",
    form: "taxLike",
    taxLabels: {
      authority: "Assessor / authority",
      year: "Assessment year",
      assessed: "Total assessed value",
      amount: "Land / improvement split",
      dates: "Notice / appeal date(s)",
      notes: "Classifications / notes",
      nicknamePlaceholder: "County Assessment 2026",
    },
  },
  {
    id: "propertyTaxDeferment",
    label: "Property tax deferment",
    sub: "Deferral status & amounts",
    scanTitle: "Property tax deferment",
    scanLede: "Photograph your tax deferment or deferral program notice or approval letter.",
    reviewTitle: "Confirm deferment details",
    defaultNickname: "Property tax deferment",
    form: "taxLike",
    taxLabels: {
      authority: "Program / authority",
      year: "Tax year",
      assessed: "Assessed value",
      amount: "Amount deferred",
      dates: "Effective / renewal date(s)",
      notes: "Program status / notes",
      nicknamePlaceholder: "Senior Tax Deferment 2026",
    },
  },
  {
    id: "taxUtilities",
    label: "Tax utilities",
    sub: "Utility tax or utility bills",
    scanTitle: "Tax utilities",
    scanLede: "Photograph a utility tax statement or utilities bill you want on file.",
    reviewTitle: "Confirm utilities details",
    defaultNickname: "Tax utilities",
    form: "taxLike",
    taxLabels: {
      authority: "Utility / issuer",
      year: "Billing period / year",
      assessed: "Service address note",
      amount: "Amount due",
      dates: "Due date(s)",
      notes: "Account # / notes",
      nicknamePlaceholder: "Utilities Tax 2026",
    },
  },
  {
    id: "propertyMap",
    label: "Property map",
    sub: "Parcel / plat / assessor map",
    scanTitle: "Property map",
    scanLede: "Photograph a parcel map, plat map, or assessor map for your property.",
    reviewTitle: "Confirm map details",
    defaultNickname: "Property map",
    form: "taxLike",
    taxLabels: {
      authority: "Source / county",
      year: "Map year / edition",
      assessed: "Map / page reference",
      amount: "Lot / tract size",
      dates: "Recorded date",
      notes: "Legal description / notes",
      nicknamePlaceholder: "Parcel Map",
    },
  },
];

/** @type {Record<string, DocumentTypeMeta>} */
export const DOCUMENT_TYPES = Object.fromEntries(DOCUMENT_TYPE_LIST.map((meta) => [meta.id, meta]));

/** @param {string} type */
export function getDocumentTypeMeta(type) {
  return DOCUMENT_TYPES[type] || DOCUMENT_TYPES.propertyTax;
}

/** @param {string} type */
export function documentTypeLabel(type) {
  return getDocumentTypeMeta(type).label;
}

/** @param {string} type */
export function isTaxLikeDocument(type) {
  return getDocumentTypeMeta(type).form === "taxLike";
}

export const TAX_LIKE_DOCUMENT_MODES = DOCUMENT_TYPE_LIST.filter((m) => m.form === "taxLike").map(
  (m) => m.id,
);

export const ALL_DOCUMENT_MODES = DOCUMENT_TYPE_LIST.map((m) => m.id);
