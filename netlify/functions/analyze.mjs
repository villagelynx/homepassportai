const ANALYZE_PROMPT = `You analyze photos for a home appliance inventory app.

Image 1: the whole appliance.
Image 2: close-up of the manufacturer label / rating plate.

Return JSON only with these keys:
- appliance_type: short type (e.g. Dishwasher, Refrigerator, Range)
- brand: manufacturer brand or empty string
- model_number: model number from the label or empty string
- serial_number: serial number from the label or empty string
- confidence: "high", "medium", or "low" based on label readability
- nickname: short friendly label like "KitchenAid dishwasher" combining brand + type

Read the label image carefully for model and serial. If unreadable, use empty strings and low confidence.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-OpenAI-Api-Key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** @param {number} code @param {object} payload */
function json(code, payload) {
  return new Response(JSON.stringify(payload), {
    status: code,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const appliance = body.appliancePhotoDataUrl || body.appliance_photo;
  const label = body.labelPhotoDataUrl || body.label_photo;
  if (!appliance || !label) {
    return json(400, { error: "Both appliancePhotoDataUrl and labelPhotoDataUrl are required" });
  }

  const apiKey = (
    event.headers["x-openai-api-key"] ||
    event.headers["X-OpenAI-Api-Key"] ||
    process.env.OPENAI_API_KEY ||
    ""
  ).trim();
  if (!apiKey) {
    return json(200, {
      applianceType: "Appliance",
      brand: "",
      modelNumber: "",
      serialNumber: "",
      confidence: "low",
      nickname: "",
      demoMode: true,
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
              { type: "text", text: ANALYZE_PROMPT },
              { type: "image_url", image_url: { url: appliance } },
              { type: "image_url", image_url: { url: label } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || "OpenAI request failed";
      return json(500, { error: msg });
    }

    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return json(200, {
      applianceType: String(parsed.appliance_type || parsed.applianceType || "").trim(),
      brand: String(parsed.brand || "").trim(),
      modelNumber: String(parsed.model_number || parsed.modelNumber || "").trim(),
      serialNumber: String(parsed.serial_number || parsed.serialNumber || "").trim(),
      confidence: String(parsed.confidence || "medium").trim().toLowerCase(),
      nickname: String(parsed.nickname || "").trim(),
    });
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : "Analysis failed" });
  }
}
