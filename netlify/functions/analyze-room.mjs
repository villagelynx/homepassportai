const ROOM_PROMPT = `You analyze still frames from a ~60 second smartphone video of a home room for an inventory app.

The images are frames sampled across the room scan, in order.

Identify distinct inventory-worthy items you can see — appliances, furniture, electronics, fixtures worth listing (TV, sofa, fridge, washer, microwave, lamp, etc.). Skip walls, floors, ceilings, and tiny clutter.

Return JSON only:
{
  "room_guess": "Kitchen" | "Laundry" | "Garage" | "Basement" | "Utility" | "Living room" | "Bedroom" | "Bathroom" | "Office" | "Other",
  "items": [
    {
      "nickname": "short friendly name",
      "appliance_type": "item type (Refrigerator, TV, Sofa, etc.)",
      "brand": "brand if readable else empty string",
      "model_number": "model if readable else empty string",
      "serial_number": "",
      "confidence": "high" | "medium" | "low",
      "frame_index": 0
    }
  ]
}

Rules:
- Deduplicate the same physical item across frames.
- frame_index is the 0-based index of the best frame showing that item.
- Prefer 3–20 items; do not invent items you cannot see.
- model_number / serial_number will usually be empty from a room walk-through.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-OpenAI-Api-Key",
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

    const apiKey = (
      event.headers["x-openai-api-key"] ||
      event.headers["X-OpenAI-Api-Key"] ||
      process.env.OPENAI_API_KEY ||
      ""
    ).trim();

    if (!apiKey) {
      return respond(200, {
        roomGuess: "Other",
        demoMode: true,
        items: demoItems(frames.length),
      });
    }

    const content = [
      { type: "text", text: ROOM_PROMPT },
      ...frames.map((url, i) => ({
        type: "image_url",
        image_url: { url, detail: "low" },
      })),
    ];
    // Remind model of frame indices in the prompt preamble
    content[0].text += `\n\nThere are ${frames.length} frames (indices 0–${frames.length - 1}).`;

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
        max_tokens: 2000,
      }),
    });

    const data = await openaiRes.json();
    if (!openaiRes.ok) {
      const msg = data?.error?.message || "OpenAI request failed";
      return respond(500, { error: msg });
    }

    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
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
        confidence: String(item.confidence || "medium").trim().toLowerCase(),
        frameIndex: clamped,
      };
    })
    .filter((item) => item.nickname)
    .slice(0, 30);
}

/** @param {number} frameCount */
function demoItems(frameCount) {
  const mid = Math.min(1, frameCount - 1);
  return [
    {
      nickname: "Living room TV",
      applianceType: "Television",
      brand: "",
      modelNumber: "",
      serialNumber: "",
      confidence: "low",
      frameIndex: 0,
    },
    {
      nickname: "Sofa",
      applianceType: "Sofa",
      brand: "",
      modelNumber: "",
      serialNumber: "",
      confidence: "low",
      frameIndex: mid,
    },
    {
      nickname: "Lamp",
      applianceType: "Lamp",
      brand: "",
      modelNumber: "",
      serialNumber: "",
      confidence: "low",
      frameIndex: Math.max(0, frameCount - 1),
    },
  ];
}
