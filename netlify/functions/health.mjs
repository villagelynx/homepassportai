const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-OpenAI-Api-Key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify({
      ok: true,
      openai: Boolean((process.env.OPENAI_API_KEY || "").trim()),
      userKeySupported: true,
      analyzePath: "/api/analyze",
      hosting: "netlify",
    }),
  };
}
