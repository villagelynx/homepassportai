import { normalizeSignatureRegions } from "./signature-label.js";

const SHARED_INVENTORY_FIELDS = `
- color_description: visible colors, finish, or material (e.g. "stainless steel", "matte white", "gilt wood frame") or empty string
- dimensions_description: approximate size only if reasonably inferable from the photo (e.g. "large wall painting", "~36 in wide refrigerator") else empty — do not invent precise measurements without a clear scale reference`;

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
    signatureRegions: normalizeSignatureRegions(
      parsed.signature_regions || parsed.signatureRegions,
    ),
  };
}
