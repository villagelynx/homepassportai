export const ALLOWED_EVENTS = new Set([
  "appliance_added",
  "room_scanned",
  "document_saved",
  "manual_lookup",
  "inventory_viewed",
  "reports_viewed",
]);

/** @param {string | undefined} raw */
export function detectDeviceType(raw) {
  const ua = String(raw || "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

/**
 * Prefer CDN/edge geo headers. Never trust client-provided country codes.
 * @param {Record<string, string | undefined>} headers
 */
export function detectCountryCode(headers) {
  const candidates = [
    headers["x-country"],
    headers["x-nf-country"],
    headers["x-vercel-ip-country"],
    headers["cf-ipcountry"],
  ];
  for (const value of candidates) {
    const code = String(value || "")
      .trim()
      .toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && code !== "XX") return code;
  }
  return null;
}

/**
 * @param {Record<string, string | string[] | undefined>} headers
 * @returns {Record<string, string | undefined>}
 */
export function normalizeHeaders(headers) {
  /** @type {Record<string, string | undefined>} */
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    out[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

/**
 * @param {string} supabaseUrl
 * @param {string} anonKey
 * @param {string} accessToken
 */
export async function verifyUserToken(supabaseUrl, anonKey, accessToken) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * @param {{
 *   supabaseUrl: string;
 *   anonKey: string;
 *   serviceKey: string;
 *   accessToken: string;
 *   eventName: string;
 *   userAgent?: string;
 *   headers?: Record<string, string | string[] | undefined>;
 * }} opts
 */
export async function recordAnalyticsEvent(opts) {
  const eventName = String(opts.eventName || "").trim();
  if (!ALLOWED_EVENTS.has(eventName)) {
    return { status: 400, body: { error: "Unsupported analytics event." } };
  }

  const user = await verifyUserToken(opts.supabaseUrl, opts.anonKey, opts.accessToken);
  if (!user?.id) {
    return { status: 401, body: { error: "Sign in required." } };
  }

  const headers = normalizeHeaders(opts.headers || {});
  const deviceType = detectDeviceType(opts.userAgent || headers["user-agent"]);
  const countryCode = detectCountryCode(headers);

  const res = await fetch(`${opts.supabaseUrl}/rest/v1/analytics_events`, {
    method: "POST",
    headers: {
      apikey: opts.serviceKey,
      Authorization: `Bearer ${opts.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: user.id,
      event_name: eventName,
      country_code: countryCode,
      device_type: deviceType,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text();
    if (/analytics_events/i.test(text) && /does not exist|schema cache/i.test(text)) {
      return {
        status: 503,
        body: {
          error: "Analytics table is not migrated yet.",
          analyticsAvailable: false,
        },
      };
    }
    throw new Error(`Failed to record analytics event (${res.status}): ${text}`);
  }

  return {
    status: 204,
    body: null,
  };
}
