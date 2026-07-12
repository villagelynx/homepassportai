import {
  ANALYZE_APPLIANCE_ONLY_PROMPT,
  ANALYZE_FACEBOOK_MARKETPLACE_PROMPT,
  ANALYZE_INSURANCE_POLICY_PROMPT,
  ANALYZE_LABEL_ONLY_PROMPT,
  ANALYZE_PROPERTY_TAX_PROMPT,
  ANALYZE_PROMPT,
  mapAnalyzeResponse,
  mapFacebookMarketplaceResponse,
  mapInsurancePolicyResponse,
  mapPropertyTaxResponse,
} from "../../js/analyze-fields.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-OpenAI-Api-Key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const MAX_BODY_BYTES = 5_500_000;
const DOCUMENT_MODES = new Set(["insurancePolicy", "propertyTax"]);
const USER_API_KEY_REQUIRED = "OpenAI API key required. Add your own key in Settings.";

/** @param {import("@netlify/functions").HandlerEvent} event */
function resolveUserApiKey(event) {
  return (event.headers["x-openai-api-key"] || event.headers["X-OpenAI-Api-Key"] || "").trim();
}

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

      const apiKey = resolveUserApiKey(event);

      if (!apiKey) {
        return respond(401, { error: USER_API_KEY_REQUIRED });
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

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
          max_tokens: 1100,
        }),
      });

      const data = await openaiRes.json();
      if (!openaiRes.ok) {
        const msg = data?.error?.message || "OpenAI request failed";
        return respond(500, { error: msg });
      }

      const raw = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      return respond(200, mapFacebookMarketplaceResponse(parsed));
    }

    if (DOCUMENT_MODES.has(mode)) {
      if (!documentPhoto) {
        return respond(400, { error: "documentPhotoDataUrl is required" });
      }

      const apiKey = resolveUserApiKey(event);

      if (!apiKey) {
        return respond(401, { error: USER_API_KEY_REQUIRED });
      }

      const prompt =
        mode === "insurancePolicy" ? ANALYZE_INSURANCE_POLICY_PROMPT : ANALYZE_PROPERTY_TAX_PROMPT;
      const mapper =
        mode === "insurancePolicy" ? mapInsurancePolicyResponse : mapPropertyTaxResponse;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: documentPhoto } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 900,
        }),
      });

      const data = await openaiRes.json();
      if (!openaiRes.ok) {
        const msg = data?.error?.message || "OpenAI request failed";
        return respond(500, { error: msg });
      }

      const raw = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      return respond(200, mapper(parsed));
    }

    if (labelOnly) {
      if (!label) {
        return respond(400, { error: "labelPhotoDataUrl is required for label-only analysis" });
      }
    } else if (!appliance) {
      return respond(400, { error: "appliancePhotoDataUrl is required" });
    }

    const apiKey = resolveUserApiKey(event);

    if (!apiKey) {
      return respond(401, { error: USER_API_KEY_REQUIRED });
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

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 850,
      }),
    });

    const data = await openaiRes.json();
    if (!openaiRes.ok) {
      const msg = data?.error?.message || "OpenAI request failed";
      return respond(500, { error: msg });
    }

    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return respond(200, mapAnalyzeResponse(parsed));
  } catch (err) {
    console.error("analyze error:", err);
    return respond(500, {
      error: err instanceof Error ? err.message : "Analysis failed",
    });
  }
}
