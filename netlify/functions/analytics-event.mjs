import { recordAnalyticsEvent } from "./lib/analytics-core.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Analytics is not configured on the server." }),
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!accessToken) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Sign in required." }),
    };
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  try {
    const result = await recordAnalyticsEvent({
      supabaseUrl,
      anonKey,
      serviceKey,
      accessToken,
      eventName: payload.eventName || payload.event_name || "",
      userAgent: event.headers["user-agent"] || event.headers["User-Agent"] || "",
      headers: event.headers,
    });

    if (result.status === 204) {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    return {
      statusCode: result.status,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify(result.body),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record analytics event";
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: message }),
    };
  }
}
