import {
  resolveAiProvider,
  resolveUserApiKey,
  userApiKeyRequiredMessage,
  visionJson,
} from "./lib/vision.mjs";

const ROOM_PROMPT = `You analyze still frames from a ~60 second smartphone video of a home room for an inventory app.

The images are frames sampled across the room scan, in order.

Identify distinct inventory-worthy items you can see — appliances, furniture, electronics, fixtures worth listing (TV, sofa, fridge, washer, microwave, lamp, etc.). Skip walls, floors, ceilings, and tiny clutter.

Return JSON only:
{
  "room_guess": "Kitchen" | "Pantry" | "Dining room" | "Living room" | "Den" | "Office" | "Bedroom 1" | "Bedroom 2" | "Bedroom 3" | "Bedroom 4" | "Bedroom 5" | "Bedroom" | "Bathroom" | "Primary bathroom" | "Half bath" | "Laundry" | "Mudroom" | "Garage" | "Basement" | "Attic" | "Utility" | "Outdoor" | "Other",
  "items": [
    {
      "nickname": "short friendly name",
      "appliance_type": "item type (Refrigerator, TV, Sofa, etc.)",
      "brand": "brand if readable else empty string",
      "model_number": "model if readable else empty string",
      "serial_number": "",
      "confidence": "high" | "medium" | "low",
      "estimated_current_value": "USD with $ if estimable else empty string",
      "suggested_retail_price": "original MSRP or new retail with $ if known else empty string",
      "frame_index": 0
    }
  ]
}

Rules:
- Deduplicate the same physical item across frames.
- frame_index is the 0-based index of the best frame showing that item.
- Prefer 3–20 items; do not invent items you cannot see.
- model_number / serial_number will usually be empty from a room walk-through.
- estimated_current_value and suggested_retail_price: approximate USD values with $ when reasonably inferable from visible type/brand/model; else empty.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, X-OpenAI-Api-Key, X-Anthropic-Api-Key, X-AI-Provider",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const MAX_BODY_BYTES = 5_500_000;
const MAX_FRAMES = 10;

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
        error: "Room scan frames are too large. Record a shorter clip or try again on Wi-Fi.",
      });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return respond(400, { error: "Invalid JSON" });
    }

    const frames = Array.isArray(body.frames) ? body.frames.filter((f) => typeof f === "string" && f) : [];
    if (frames.length < 2) {
      return respond(400, { error: "Send at least 2 video frames to analyze the room" });
    }
    if (frames.length > MAX_FRAMES) {
      return respond(400, { error: `Too many frames (max ${MAX_FRAMES})` });
    }

    const provider = resolveAiProvider(event);
    const apiKey = resolveUserApiKey(event, provider);
    if (!apiKey) {
      return respond(401, { error: userApiKeyRequiredMessage(provider) });
    }

    const content = [
      {
        type: "text",
        text: `${ROOM_PROMPT}\n\nThere are ${frames.length} frames (indices 0–${frames.length - 1}).`,
      },
      ...frames.map((url) => ({
        type: "image_url",
        image_url: { url, detail: "low" },
      })),
    ];

    const parsed = await visionJson(provider, apiKey, content, { maxTokens: 2000 });
    const items = normalizeItems(parsed, frames.length);

    return respond(200, {
      roomGuess: String(parsed.room_guess || parsed.roomGuess || "Other").trim() || "Other",
      items,
      demoMode: false,
    });
  } catch (err) {
    console.error("analyze-room error:", err);
    return respond(500, {
      error: err instanceof Error ? err.message : "Room analysis failed",
    });
  }
}

/** @param {object} parsed @param {number} frameCount */
function normalizeItems(parsed, frameCount) {
  const list = Array.isArray(parsed.items) ? parsed.items : [];
  return list
    .map((item, i) => {
      const frameIndex = Number(item.frame_index ?? item.frameIndex ?? 0);
      const clamped = Number.isFinite(frameIndex)
        ? Math.max(0, Math.min(frameCount - 1, Math.round(frameIndex)))
        : Math.min(i, frameCount - 1);
      const applianceType = String(item.appliance_type || item.applianceType || item.type || "").trim();
      const brand = String(item.brand || "").trim();
      const nickname =
        String(item.nickname || "").trim() ||
        [brand, applianceType].filter(Boolean).join(" ").trim() ||
        `Item ${i + 1}`;
      return {
        nickname,
        applianceType: applianceType || "Item",
        brand,
        modelNumber: String(item.model_number || item.modelNumber || "").trim(),
        serialNumber: String(item.serial_number || item.serialNumber || "").trim(),
        estimatedCurrentValue: String(
          item.estimated_current_value || item.estimatedCurrentValue || "",
        ).trim(),
        suggestedRetailPrice: String(
          item.suggested_retail_price || item.suggestedRetailPrice || "",
        ).trim(),
        confidence: String(item.confidence || "medium").trim().toLowerCase(),
        frameIndex: clamped,
      };
    })
    .filter((item) => item.nickname)
    .slice(0, 30);
}
