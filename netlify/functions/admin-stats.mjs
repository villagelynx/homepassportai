import {
  buildAdminStats,
  parseAdminEmails,
} from "./lib/admin-stats-core.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-OpenAI-Api-Key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "Admin stats are not configured on the server." }),
    };
  }

  if (adminEmails.length === 0) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: "ADMIN_EMAILS is not configured." }),
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

  try {
    const result = await buildAdminStats({
      supabaseUrl,
      anonKey,
      serviceKey,
      adminEmails,
      accessToken,
    });

    return {
      statusCode: result.status,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify(result.body),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load admin stats";
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS },
      body: JSON.stringify({ error: message }),
    };
  }
}
