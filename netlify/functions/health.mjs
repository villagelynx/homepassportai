import {
  resolveAiProvider,
  resolveUserApiKey,
  verifyAnthropicKey,
  verifyOpenAiKey,
} from "./lib/vision.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, X-OpenAI-Api-Key, X-Anthropic-Api-Key, X-AI-Provider",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const provider = resolveAiProvider(event);
  const userKey = resolveUserApiKey(event, provider);
  const userKeyStatus =
    provider === "anthropic" ? await verifyAnthropicKey(userKey) : await verifyOpenAiKey(userKey);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify({
      ok: true,
      requiresUserKey: true,
      provider,
      userKey: userKeyStatus,
      userKeySupported: true,
      analyzePath: "/api/analyze",
      hosting: "netlify",
    }),
  };
}
