import { config, isSupabaseConfigured } from "./config.js";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let client = null;
/** @type {Promise<import("@supabase/supabase-js").SupabaseClient | null> | null} */
let clientPromise = null;

/** @returns {Promise<import("@supabase/supabase-js").SupabaseClient | null>} */
export async function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
      client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return client;
    })();
  }
  return clientPromise;
}
