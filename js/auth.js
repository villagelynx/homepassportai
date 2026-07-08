import { getSupabase } from "./supabase-client.js";

/** @type {import("@supabase/supabase-js").Session | null} */
let session = null;

/** @param {(signedIn: boolean) => void} [listener] */
let onAuthChange = null;

export function setAuthListener(listener) {
  onAuthChange = listener;
}

export function getSession() {
  return session;
}

export function getUserEmail() {
  return session?.user?.email ?? "";
}

export function isSignedIn() {
  return Boolean(session?.user);
}

export async function initAuth() {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  session = data.session;

  supabase.auth.onAuthStateChange((_event, newSession) => {
    session = newSession;
    onAuthChange?.(Boolean(newSession?.user));
  });

  return session;
}

/** @param {string} email @param {string} password */
export async function signIn(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = data.session;
  return data.session;
}

/** @param {string} email @param {string} password */
export async function signUp(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  session = data.session;
  return data.session;
}

export async function signOut() {
  const supabase = await getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  session = null;
}
