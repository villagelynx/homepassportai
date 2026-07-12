import { normalizeSignatureRegions } from "./signature-label.js";

const SHARED_INVENTORY_FIELDS = `
- color_description: visible colors, finish, or material (e.g. "stainless steel", "matte white", "gilt wood frame") or empty string
- dimensions_description: approximate size only if reasonably inferable from the photo (e.g. "large wall painting", "~36 in wide refrigerator") else empty — do not invent precise measurements without a clear scale reference
- estimated_current_value: estimated current replacement value in USD with $ (e.g. "$850") based on type, brand, model, age, and condition cues. For insurance documentation. Empty if unable to estimate confidently.
- suggested_retail_price: original MSRP or typical new retail price in USD with $ when reasonably known for this product. Empty if unknown.
Value fields are approximate AI estimates for insurance documentation, not professional appraisals. Do not invent prices without reasonable basis.`;

const ARTWORK_SIGNATURE_FIELDS = `
- signature_regions: for paintings, prints, or artwork with visible artist signatures or inscriptions near corners ONLY. Up to 2 tight bounding boxes as percent of the full image (0–100): [{ "corner": "top_left"|"top_right"|"bottom_left"|"bottom_right", "x_percent", "y_percent", "width_percent", "height_percent" }]. Empty array if not artwork or no signature visible.
- For artwork: put artist name in brand, title or medium in model_number, readable inscription in serial_number when visible.`;

export const ANALYZE_PROMPT = `You analyze photos for a home inventory app (appliances, furniture, electronics, artwork, etc.).

Image 1: the whole item.
Image 2: close-up of the manufacturer label / rating plate (or signature detail).

Return JSON only with these keys:
- appliance_type: short type (e.g. Dishwasher, Painting, Sofa, TV)
- brand: manufacturer brand, or artist name for artwork, or empty string
- model_number: model number from the label, or title/medium for artwork, or empty string
- serial_number: serial from the label, or inscription text for artwork, or empty string
- confidence: "high", "medium", or "low"
- nickname: short friendly label combining brand/artist + type
${SHARED_INVENTORY_FIELDS}
${ARTWORK_SIGNATURE_FIELDS}

Read the label image carefully when provided. If unreadable, use empty strings and lower confidence.`;

export const ANALYZE_LABEL_ONLY_PROMPT = `You analyze a close-up photo of a manufacturer label, rating plate, or artwork signature for a home inventory app.

Image 1: close-up label or signature area.

Return JSON only with these keys:
- appliance_type: short type if visible, else empty string
- brand: manufacturer or artist or empty string
- model_number: model number or artwork title/medium or empty string
- serial_number: serial or inscription text or empty string
- confidence: "high", "medium", or "low"
- nickname: empty string
${SHARED_INVENTORY_FIELDS}

Read carefully. If unreadable, use empty strings and low confidence.`;

export const ANALYZE_APPLIANCE_ONLY_PROMPT = `You analyze a photo for a home inventory app (appliances, furniture, electronics, artwork, etc.).

Image 1: the whole item.

Return JSON only with these keys:
- appliance_type: short type (e.g. Dishwasher, Painting, Sofa, TV)
- brand: manufacturer or artist if visible, else empty string
- model_number: empty string unless visible on the item
- serial_number: empty string unless visible on the item
- confidence: "high", "medium", or "low"
- nickname: short friendly label like "KitchenAid dishwasher" or "Landscape oil painting"
${SHARED_INVENTORY_FIELDS}
${ARTWORK_SIGNATURE_FIELDS}

If no label photo is provided, leave model_number and serial_number empty unless printed on the item.`;

export const ANALYZE_INSURANCE_POLICY_PROMPT = `You analyze a photo of a homeowners or renters insurance policy document, declarations page, or insurance ID card for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- insurer_name: insurance company name
- policy_number: policy or account number
- policy_type: e.g. Homeowners, Renters, Condo
- named_insureds: primary named insured(s), comma-separated if multiple
- property_address: insured property address
- effective_date: policy start date as shown
- expiration_date: policy end or renewal date
- dwelling_coverage: dwelling or structure coverage limit with $ if shown
- personal_property_coverage: personal property or contents limit with $ if shown
- liability_coverage: liability limit with $ if shown
- deductible: deductible amount(s) with $ if shown
- annual_premium: total premium with $ if shown
- agent_name: agent or agency name if shown
- agent_phone: agent phone if shown
- nickname: short friendly label like "State Farm Homeowners 2026"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values. If the image is not an insurance document, use empty strings and low confidence.`;

export const ANALYZE_PROPERTY_TAX_PROMPT = `You analyze a photo of a property tax bill, tax assessment notice, or county tax statement for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- taxing_authority: county, city, or assessor name
- parcel_number: parcel, APN, or tax ID number
- property_address: property address on the bill
- tax_year: assessment or tax year
- assessed_value: total assessed value with $ if shown
- tax_amount: total tax due with $ if shown
- due_dates: payment due date(s) as shown on bill
- exemptions: any exemptions, homestead, or special assessments noted
- nickname: short friendly label like "King County Property Tax 2026"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values. If the image is not a property tax document, use empty strings and low confidence.`;

export const ANALYZE_FACEBOOK_MARKETPLACE_PROMPT = `You help a homeowner create a Facebook Marketplace listing to sell a household item they inventoried in a home app.

You receive item details (type, brand, model, color, dimensions, estimated values) and one or more photos: main item photo, optional label/serial close-up, optional purchase receipt.

Write honest, friendly Marketplace copy. Price competitively for a local used sale — typically below estimated replacement value unless the item appears nearly new. Be specific; mention brand and model when known.

Return JSON only with these keys:
- title: short Marketplace title (under 60 characters), specific not generic
- price: suggested listing price for Facebook (e.g. "$120" or "Free") — USD only, no "obo" in this field
- description: 2–4 short paragraphs for the listing description. Include brand, model, condition, color/dimensions if known, local pickup note, and honest wear. Plain text only — no hashtags. Ready to paste into Facebook.
- condition: one of "New", "Used - Like new", "Used - Good", "Used - Fair", "For parts"
- category_hint: best Facebook Marketplace category guess (e.g. "Home & Garden > Appliances")
- photo_recommendations: for each photo type provided, an entry { "photo": "appliance"|"label"|"receipt", "include": true|false, "note": "short reason, e.g. Hero shot showing overall condition" }
- selling_tips: array of 1–3 brief seller tips (e.g. "Respond quickly to messages")
- confidence: "high", "medium", or "low"

Do not invent model numbers or features not supported by the item data or photos. If a receipt photo is provided, you may note original purchase receipt is available.`;

/** @param {object} parsed */
export function mapInsurancePolicyResponse(parsed) {
  return {
    insurerName: String(parsed.insurer_name || parsed.insurerName || "").trim(),
    policyNumber: String(parsed.policy_number || parsed.policyNumber || "").trim(),
    policyType: String(parsed.policy_type || parsed.policyType || "").trim(),
    namedInsureds: String(parsed.named_insureds || parsed.namedInsureds || "").trim(),
    propertyAddress: String(parsed.property_address || parsed.propertyAddress || "").trim(),
    effectiveDate: String(parsed.effective_date || parsed.effectiveDate || "").trim(),
    expirationDate: String(parsed.expiration_date || parsed.expirationDate || "").trim(),
    dwellingCoverage: String(parsed.dwelling_coverage || parsed.dwellingCoverage || "").trim(),
    personalPropertyCoverage: String(
      parsed.personal_property_coverage || parsed.personalPropertyCoverage || "",
    ).trim(),
    liabilityCoverage: String(parsed.liability_coverage || parsed.liabilityCoverage || "").trim(),
    deductible: String(parsed.deductible || "").trim(),
    annualPremium: String(parsed.annual_premium || parsed.annualPremium || "").trim(),
    agentName: String(parsed.agent_name || parsed.agentName || "").trim(),
    agentPhone: String(parsed.agent_phone || parsed.agentPhone || "").trim(),
    nickname: String(parsed.nickname || "").trim(),
    confidence: String(parsed.confidence || "medium").trim().toLowerCase(),
  };
}

/** @param {object} parsed */
export function mapPropertyTaxResponse(parsed) {
  return {
    taxingAuthority: String(parsed.taxing_authority || parsed.taxingAuthority || "").trim(),
    parcelNumber: String(parsed.parcel_number || parsed.parcelNumber || "").trim(),
    propertyAddress: String(parsed.property_address || parsed.propertyAddress || "").trim(),
    taxYear: String(parsed.tax_year || parsed.taxYear || "").trim(),
    assessedValue: String(parsed.assessed_value || parsed.assessedValue || "").trim(),
    taxAmount: String(parsed.tax_amount || parsed.taxAmount || "").trim(),
    dueDates: String(parsed.due_dates || parsed.dueDates || "").trim(),
    exemptions: String(parsed.exemptions || "").trim(),
    nickname: String(parsed.nickname || "").trim(),
    confidence: String(parsed.confidence || "medium").trim().toLowerCase(),
  };
}

/** @param {boolean} [demoMode] */
export function emptyInsurancePolicyResponse(demoMode = false) {
  return {
    insurerName: "",
    policyNumber: "",
    policyType: "",
    namedInsureds: "",
    propertyAddress: "",
    effectiveDate: "",
    expirationDate: "",
    dwellingCoverage: "",
    personalPropertyCoverage: "",
    liabilityCoverage: "",
    deductible: "",
    annualPremium: "",
    agentName: "",
    agentPhone: "",
    nickname: "",
    confidence: "low",
    ...(demoMode ? { demoMode: true } : {}),
  };
}

/** @param {boolean} [demoMode] */
export function emptyPropertyTaxResponse(demoMode = false) {
  return {
    taxingAuthority: "",
    parcelNumber: "",
    propertyAddress: "",
    taxYear: "",
    assessedValue: "",
    taxAmount: "",
    dueDates: "",
    exemptions: "",
    nickname: "",
    confidence: "low",
    ...(demoMode ? { demoMode: true } : {}),
  };
}

/** @param {unknown} raw */
function normalizePhotoRecommendations(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const photo = String(entry.photo || "").trim().toLowerCase();
      if (photo !== "appliance" && photo !== "label" && photo !== "receipt") return null;
      return {
        photo,
        include: Boolean(entry.include),
        note: String(entry.note || "").trim(),
      };
    })
    .filter(Boolean);
}

/** @param {object} parsed */
export function mapFacebookMarketplaceResponse(parsed) {
  const tips = parsed.selling_tips || parsed.sellingTips;
  return {
    title: String(parsed.title || "").trim(),
    price: String(parsed.price || "").trim(),
    description: String(parsed.description || "").trim(),
    condition: String(parsed.condition || "").trim(),
    categoryHint: String(parsed.category_hint || parsed.categoryHint || "").trim(),
    photoRecommendations: normalizePhotoRecommendations(
      parsed.photo_recommendations || parsed.photoRecommendations,
    ),
    sellingTips: Array.isArray(tips) ? tips.map((t) => String(t || "").trim()).filter(Boolean) : [],
    confidence: String(parsed.confidence || "medium").trim().toLowerCase(),
  };
}

/** @param {boolean} [demoMode] */
export function emptyFacebookMarketplaceResponse(demoMode = false) {
  return {
    title: "",
    price: "",
    description: "",
    condition: "",
    categoryHint: "",
    photoRecommendations: [],
    sellingTips: [],
    confidence: "low",
    ...(demoMode ? { demoMode: true } : {}),
  };
}

/** @param {object} parsed */
export function mapAnalyzeResponse(parsed) {
  return {
    applianceType: String(parsed.appliance_type || parsed.applianceType || "").trim(),
    brand: String(parsed.brand || "").trim(),
    modelNumber: String(parsed.model_number || parsed.modelNumber || "").trim(),
    serialNumber: String(parsed.serial_number || parsed.serialNumber || "").trim(),
    confidence: String(parsed.confidence || "medium").trim().toLowerCase(),
    nickname: String(parsed.nickname || "").trim(),
    colorDescription: String(parsed.color_description || parsed.colorDescription || "").trim(),
    dimensionsDescription: String(
      parsed.dimensions_description || parsed.dimensionsDescription || "",
    ).trim(),
    estimatedCurrentValue: String(
      parsed.estimated_current_value || parsed.estimatedCurrentValue || "",
    ).trim(),
    suggestedRetailPrice: String(
      parsed.suggested_retail_price || parsed.suggestedRetailPrice || "",
    ).trim(),
    signatureRegions: normalizeSignatureRegions(
      parsed.signature_regions || parsed.signatureRegions,
    ),
  };
}
