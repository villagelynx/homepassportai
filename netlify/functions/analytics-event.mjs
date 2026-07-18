const ALLOWED_EVENTS = new Set([
  "appliance_added",
  "room_scanned",
  "document_saved",
  "manual_lookup",
  "inventory_viewed",
  "reports_viewed",
]);

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function response(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function deviceType(userAgent) {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "other";
}

function countryCode(headers) {
  const raw =
    headers["x-country"] ||
    headers["x-nf-country"] ||
    headers["cloudfront-viewer-country"] ||
    "";
  const normalized = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

async function authenticatedUser(supabaseUrl, anonKey, authHeader) {
  if (!authHeader.startsWith("Bearer ")) return null;
  const result = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) return null;
  return result.json();
}

/** @param {import("@netlify/functions").HandlerEvent} event */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return response(204, {});
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid JSON" });
  }

  const eventName = typeof body.eventName === "string" ? body.eventName : "";
  if (!ALLOWED_EVENTS.has(eventName)) {
    return response(400, { error: "Unknown event" });
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const user = await authenticatedUser(supabaseUrl, anonKey, authHeader);
    const insert = await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: user?.id || null,
        event_name: eventName,
        country_code: countryCode(event.headers),
        device_type: deviceType(event.headers["user-agent"] || ""),
      }),
      signal: AbortSignal.timeout(8000),
    });

    // Analytics must never block the product. A missing migration is treated as
    // unavailable collection and is surfaced in the admin dashboard instead.
    if (!insert.ok) return response(204, {});
    return response(202, { ok: true });
  } catch {
    return response(204, {});
  }
}
