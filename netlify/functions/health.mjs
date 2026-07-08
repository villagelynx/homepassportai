const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-OpenAI-Api-Key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      openai: Boolean((process.env.OPENAI_API_KEY || "").trim()),
      userKeySupported: true,
      analyzePath: "/api/analyze",
      hosting: "netlify",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    }
  );
}
