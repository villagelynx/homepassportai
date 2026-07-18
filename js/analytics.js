import { getSession, isSignedIn } from "./auth.js";

const ANALYTICS_URL = "/api/analytics/event";

/** @type {Set<string>} */
const recentKeys = new Set();

/**
 * Fire-and-forget product analytics. Never throws to callers.
 * Only event names are sent; device/country are derived server-side.
 * @param {string} eventName
 * @param {{ dedupeKey?: string, dedupeMs?: number }} [opts]
 */
export function trackEvent(eventName, opts = {}) {
  try {
    if (!isSignedIn()) return;
    const session = getSession();
    const token = session?.access_token;
    if (!token || !eventName) return;

    const dedupeKey = opts.dedupeKey || `${eventName}:${Math.floor(Date.now() / 30000)}`;
    if (recentKeys.has(dedupeKey)) return;
    recentKeys.add(dedupeKey);
    const clearAfter = opts.dedupeMs ?? 30_000;
    setTimeout(() => recentKeys.delete(dedupeKey), clearAfter);

    void fetch(ANALYTICS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ eventName }),
      keepalive: true,
    }).catch(() => {
      // Analytics must never block product flows.
    });
  } catch {
    // ignore
  }
}

/** @deprecated Prefer trackEvent */
export const trackAnalyticsEvent = trackEvent;
