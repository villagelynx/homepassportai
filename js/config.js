/** @readonly */
import { runtimeConfig } from "./runtime-config.js";

export const APP_VERSION = "0.9.58";

function resolveAnalyzeApiUrl() {
  if (typeof location === "undefined") return "/api/analyze";
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || /^192\.168\.\d+\.\d+$/.test(host)) {
    return "/api/analyze";
  }
  return "/api/analyze";
}

/** @readonly */
export const config = {
  supabaseUrl: runtimeConfig.supabaseUrl,
  supabaseAnonKey: runtimeConfig.supabaseAnonKey,
  analyzeApiUrl: resolveAnalyzeApiUrl(),
  analyzeRoomApiUrl: "/api/analyze-room",
};

export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
