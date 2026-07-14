import { config, isSupabaseConfigured } from "./config.js";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let client = null;
/** @type {Promise<import("@supabase/supabase-js").SupabaseClient | null> | null} */
let clientPromise = null;

/** @type {Promise<{ createClient: Function } > | null} */
let supabaseLibPromise = null;

/**
 * Load Supabase from the local vendor UMD (no CDN).
 * Avoids iPhone Safari "Importing a module script failed" when esm.sh is blocked or offline.
 * @returns {Promise<{ createClient: Function }>}
 */
function loadSupabaseLib() {
  if (globalThis.supabase?.createClient) {
    return Promise.resolve(globalThis.supabase);
  }
  if (!supabaseLibPromise) {
    supabaseLibPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-supabase-vendor="1"]');
      if (existing) {
        existing.addEventListener("load", () => {
          if (globalThis.supabase?.createClient) resolve(globalThis.supabase);
          else reject(new Error("Supabase library loaded but createClient is missing."));
        });
        existing.addEventListener("error", () =>
          reject(new Error("Could not load Supabase library from this device.")),
        );
        return;
      }

      const script = document.createElement("script");
      script.src = new URL("./vendor/supabase.umd.js", import.meta.url).href;
      script.async = true;
      script.dataset.supabaseVendor = "1";
      script.onload = () => {
        if (globalThis.supabase?.createClient) resolve(globalThis.supabase);
        else reject(new Error("Supabase library loaded but createClient is missing."));
      };
      script.onerror = () =>
        reject(
          new Error(
            "Could not load Supabase. Keep ./serve.sh running and refresh — check you are on the same Wi‑Fi as your Mac.",
          ),
        );
      document.head.append(script);
    });
  }
  return supabaseLibPromise;
}

/** @returns {Promise<import("@supabase/supabase-js").SupabaseClient | null>} */
export async function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const { createClient } = await loadSupabaseLib();
        client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        return client;
      } catch (err) {
        clientPromise = null;
        throw err;
      }
    })();
  }
  return clientPromise;
}
