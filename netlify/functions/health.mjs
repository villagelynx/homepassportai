const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-OpenAI-Api-Key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** @param {string} apiKey */
async function verifyOpenAiKey(apiKey) {
  if (!apiKey) {
    return { provided: false, valid: null };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      return { provided: true, valid: true };
    }
    if (res.status === 401) {
      return { provided: true, valid: false, error: "Invalid API key" };
    }
    return { provided: true, valid: false, error: `OpenAI returned HTTP ${res.status}` };
  } catch {
    return { provided: true, valid: false, error: "Could not reach OpenAI" };
  }
}

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const userKey = (
    event.headers["x-openai-api-key"] ||
    event.headers["X-OpenAI-Api-Key"] ||
    ""
  ).trim();
  const userKeyStatus = await verifyOpenAiKey(userKey);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify({
      ok: true,
      requiresUserKey: true,
      userKey: userKeyStatus,
      userKeySupported: true,
      analyzePath: "/api/analyze",
      hosting: "netlify",
    }),
  };
}
