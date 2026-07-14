import {
  ANALYZE_APPLIANCE_ONLY_PROMPT,
  ANALYZE_FACEBOOK_MARKETPLACE_PROMPT,
  ANALYZE_LABEL_ONLY_PROMPT,
  ANALYZE_PROMPT,
  documentPromptForMode,
  mapAnalyzeResponse,
  mapFacebookMarketplaceResponse,
  mapInsurancePolicyResponse,
  mapPropertyTaxResponse,
} from "../../js/analyze-fields.js";
import { ALL_DOCUMENT_MODES } from "../../js/document-types.js";
import {
  resolveAiProvider,
  resolveUserApiKey,
  userApiKeyRequiredMessage,
  visionJson,
} from "./lib/vision.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, X-OpenAI-Api-Key, X-Anthropic-Api-Key, X-AI-Provider",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const MAX_BODY_BYTES = 5_500_000;
const DOCUMENT_MODES = new Set(ALL_DOCUMENT_MODES);

/** @param {number} code @param {object} payload */
function respond(code, payload) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify(payload),
  };
}

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return respond(405, { error: "Method not allowed" });
    }

    const rawBody = event.body || "";
    if (rawBody.length > MAX_BODY_BYTES) {
      return respond(413, {
        error: "Photos are too large for upload. Retake closer photos or try again on Wi-Fi.",
      });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return respond(400, { error: "Invalid JSON" });
    }

    const provider = resolveAiProvider(event);
    const apiKey = resolveUserApiKey(event, provider);
    if (!apiKey) {
      return respond(401, { error: userApiKeyRequiredMessage(provider) });
    }

    const mode = String(body.mode || "").trim();
    const documentPhoto = body.documentPhotoDataUrl || body.document_photo;
    const appliance = body.appliancePhotoDataUrl || body.appliance_photo;
    const label = body.labelPhotoDataUrl || body.label_photo;
    const receipt = body.receiptPhotoDataUrl || body.receipt_photo;
    const labelOnly = mode === "labelOnly";

    if (mode === "facebookMarketplace") {
      if (!appliance && !label && !receipt) {
        return respond(400, { error: "At least one item photo is required" });
      }

      const item = body.item && typeof body.item === "object" ? body.item : {};
      const itemSummary = `Item details:\n${JSON.stringify(item, null, 2)}`;
      /** @type {Array<Record<string, unknown>>} */
      const content = [
        { type: "text", text: `${ANALYZE_FACEBOOK_MARKETPLACE_PROMPT}\n\n${itemSummary}` },
      ];
      if (appliance) {
        content.push({ type: "text", text: "Photo: main item (appliance)" });
        content.push({ type: "image_url", image_url: { url: appliance } });
      }
      if (label) {
        content.push({ type: "text", text: "Photo: label / serial close-up" });
        content.push({ type: "image_url", image_url: { url: label } });
      }
      if (receipt) {
        content.push({ type: "text", text: "Photo: purchase receipt" });
        content.push({ type: "image_url", image_url: { url: receipt } });
      }

      const parsed = await visionJson(provider, apiKey, content, { maxTokens: 1100 });
      return respond(200, mapFacebookMarketplaceResponse(parsed));
    }

    if (DOCUMENT_MODES.has(mode)) {
      if (!documentPhoto) {
        return respond(400, { error: "documentPhotoDataUrl is required" });
      }

      const prompt = documentPromptForMode(mode);
      const mapper =
        mode === "insurancePolicy" ? mapInsurancePolicyResponse : mapPropertyTaxResponse;

      const parsed = await visionJson(
        provider,
        apiKey,
        [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: documentPhoto } },
        ],
        { maxTokens: 900 },
      );
      return respond(200, mapper(parsed));
    }

    if (labelOnly) {
      if (!label) {
        return respond(400, { error: "labelPhotoDataUrl is required for label-only analysis" });
      }
    } else if (!appliance) {
      return respond(400, { error: "appliancePhotoDataUrl is required" });
    }

    const content = labelOnly
      ? [
          { type: "text", text: ANALYZE_LABEL_ONLY_PROMPT },
          { type: "image_url", image_url: { url: label } },
        ]
      : [
          { type: "text", text: label ? ANALYZE_PROMPT : ANALYZE_APPLIANCE_ONLY_PROMPT },
          { type: "image_url", image_url: { url: appliance } },
          ...(label ? [{ type: "image_url", image_url: { url: label } }] : []),
        ];

    const parsed = await visionJson(provider, apiKey, content, { maxTokens: 850 });
    return respond(200, mapAnalyzeResponse(parsed));
  } catch (err) {
    console.error("analyze error:", err);
    return respond(500, {
      error: err instanceof Error ? err.message : "Analysis failed",
    });
  }
}
