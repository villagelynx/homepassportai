/**
 * Shared OpenAI / Anthropic vision helpers for Netlify functions.
 */

/** @param {import("@netlify/functions").HandlerEvent} event */
export function resolveAiProvider(event) {
  const raw = (
    event.headers["x-ai-provider"] ||
    event.headers["X-AI-Provider"] ||
    "openai"
  )
    .trim()
    .toLowerCase();
  return raw === "anthropic" ? "anthropic" : "openai";
}

/** @param {import("@netlify/functions").HandlerEvent} event @param {"openai"|"anthropic"} provider */
export function resolveUserApiKey(event, provider = resolveAiProvider(event)) {
  if (provider === "anthropic") {
    return (
      event.headers["x-anthropic-api-key"] ||
      event.headers["X-Anthropic-Api-Key"] ||
      ""
    ).trim();
  }
  return (event.headers["x-openai-api-key"] || event.headers["X-OpenAI-Api-Key"] || "").trim();
}

export function userApiKeyRequiredMessage(provider) {
  return provider === "anthropic"
    ? "Claude API key required. Add your Anthropic key in Settings."
    : "OpenAI API key required. Add your own key in Settings.";
}

/** @param {string} dataUrl */
export function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(dataUrl || "");
  if (!match) throw new Error("Invalid image data URL");
  return { mediaType: match[1], data: match[2] };
}

/**
 * Convert OpenAI-style vision content blocks to Anthropic Messages content.
 * @param {Array<{ type: string, text?: string, image_url?: { url: string } }>} content
 */
export function toAnthropicContent(content) {
  /** @type {object[]} */
  const out = [];
  for (const block of content) {
    if (block.type === "text") {
      out.push({ type: "text", text: block.text || "" });
      continue;
    }
    if (block.type === "image_url" && block.image_url?.url) {
      const { mediaType, data } = parseDataUrl(block.image_url.url);
      out.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data,
        },
      });
    }
  }
  return out;
}

/**
 * @param {string} apiKey
 * @param {Array<object>} openaiStyleContent
 * @param {{ maxTokens?: number, model?: string }} [opts]
 */
export async function openaiVisionJson(apiKey, openaiStyleContent, opts = {}) {
  const model = opts.model || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const maxTokens = opts.maxTokens || 900;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: openaiStyleContent }],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed (HTTP ${res.status})`);
  }
  const raw = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(raw);
}

/**
 * @param {string} apiKey
 * @param {Array<object>} openaiStyleContent
 * @param {{ maxTokens?: number, model?: string }} [opts]
 */
export async function anthropicVisionJson(apiKey, openaiStyleContent, opts = {}) {
  const model = opts.model || process.env.ANTHROPIC_VISION_MODEL || "claude-sonnet-4-20250514";
  const maxTokens = opts.maxTokens || 900;
  const content = toAnthropicContent(openaiStyleContent);

  // Claude does not always honor JSON-only without an explicit cue.
  if (content[0]?.type === "text") {
    content[0].text = `${content[0].text}\n\nRespond with JSON only. No markdown.`;
  } else {
    content.unshift({ type: "text", text: "Respond with JSON only. No markdown." });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Claude request failed (HTTP ${res.status})`);
  }

  const text = (data.content || [])
    .filter((part) => part?.type === "text")
    .map((part) => part.text || "")
    .join("\n")
    .trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return JSON");
  return JSON.parse(jsonMatch[0]);
}

/**
 * @param {"openai"|"anthropic"} provider
 * @param {string} apiKey
 * @param {Array<object>} openaiStyleContent
 * @param {{ maxTokens?: number }} [opts]
 */
export async function visionJson(provider, apiKey, openaiStyleContent, opts = {}) {
  if (provider === "anthropic") {
    return anthropicVisionJson(apiKey, openaiStyleContent, opts);
  }
  return openaiVisionJson(apiKey, openaiStyleContent, opts);
}

/** @param {string} apiKey */
export async function verifyOpenAiKey(apiKey) {
  if (!apiKey) return { provided: false, valid: null };
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { provided: true, valid: true };
    if (res.status === 401) return { provided: true, valid: false, error: "Invalid API key" };
    return { provided: true, valid: false, error: `OpenAI returned HTTP ${res.status}` };
  } catch {
    return { provided: true, valid: false, error: "Could not reach OpenAI" };
  }
}

/** @param {string} apiKey */
export async function verifyAnthropicKey(apiKey) {
  if (!apiKey) return { provided: false, valid: null };
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { provided: true, valid: true };
    if (res.status === 401 || res.status === 403) {
      return { provided: true, valid: false, error: "Invalid API key" };
    }
    // Some accounts return 404 on /v1/models; try a tiny messages call.
    if (res.status === 404) {
      const probe = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_VISION_MODEL || "claude-sonnet-4-20250514",
          max_tokens: 8,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (probe.ok || probe.status === 400) return { provided: true, valid: true };
      if (probe.status === 401 || probe.status === 403) {
        return { provided: true, valid: false, error: "Invalid API key" };
      }
      return { provided: true, valid: false, error: `Claude returned HTTP ${probe.status}` };
    }
    return { provided: true, valid: false, error: `Claude returned HTTP ${res.status}` };
  } catch {
    return { provided: true, valid: false, error: "Could not reach Claude" };
  }
}
