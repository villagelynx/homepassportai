import { getSupabase } from "./supabase-client.js";

/** @type {import("@supabase/supabase-js").Session | null} */
let session = null;

/** @param {(signedIn: boolean) => void} [listener] */
let onAuthChange = null;

/** @type {(() => void) | null} */
let onRecovery = null;

let sessionExpired = false;

const AUTH_EXPIRED_RE =
  /jwt expired|invalid refresh|refresh token|session.*expired|token.*expired/i;

/** @param {unknown} err */
export function isAuthExpiredError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return AUTH_EXPIRED_RE.test(msg);
}

/** @param {unknown} err */
export function friendlyAuthMessage(err) {
  if (isAuthExpiredError(err)) {
    return "Your sign-in expired. Please sign in again.";
  }
  return err instanceof Error ? err.message : String(err ?? "Authentication failed");
}

export function wasSessionExpired() {
  return sessionExpired;
}

export function clearSessionExpiredFlag() {
  sessionExpired = false;
}

export function setAuthListener(listener) {
  onAuthChange = listener;
}

/** @param {() => void} listener Called when the user arrives via a password-reset link. */
export function setRecoveryListener(listener) {
  onRecovery = listener;
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

/** Clear local session when tokens are no longer valid. */
async function clearInvalidSession() {
  session = null;
  const supabase = await getSupabase();
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore — tokens may already be invalid.
  }
}

/** @param {unknown} err @returns {Promise<boolean>} true if handled as expired session */
export async function handleAuthFailure(err) {
  if (!isAuthExpiredError(err)) return false;
  sessionExpired = true;
  await clearInvalidSession();
  onAuthChange?.(false);
  return true;
}

async function refreshStoredSession() {
  if (!session) return session;
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    if (isAuthExpiredError(error)) {
      sessionExpired = true;
      await clearInvalidSession();
      onAuthChange?.(false);
      return null;
    }
    throw error;
  }

  session = data.session;
  return session;
}

export async function initAuth() {
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (isAuthExpiredError(error)) {
      await clearInvalidSession();
      return null;
    }
    throw error;
  }
  session = data.session;

  if (session) {
    try {
      await refreshStoredSession();
    } catch (err) {
      if (isAuthExpiredError(err)) {
        await clearInvalidSession();
        return null;
      }
      throw err;
    }
  }

  supabase.auth.onAuthStateChange((event, newSession) => {
    session = newSession;
    if (event === "PASSWORD_RECOVERY") {
      onRecovery?.();
      return;
    }
    if (event === "SIGNED_OUT" && !newSession) {
      onAuthChange?.(false);
      return;
    }
    if (event === "TOKEN_REFRESHED" && newSession) {
      session = newSession;
      return;
    }
    onAuthChange?.(Boolean(newSession?.user));
  });

  return session;
}

/** Refresh tokens when the app returns to the foreground (common on iPhone). */
export async function refreshAuthIfNeeded() {
  if (!session) return;
  try {
    await refreshStoredSession();
  } catch (err) {
    if (!(await handleAuthFailure(err))) {
      console.error(err);
    }
  }
}

/** @param {string} email @param {string} password */
export async function signIn(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");

  clearSessionExpiredFlag();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = data.session;
  return data.session;
}

/** @param {string} email @param {string} password */
export async function signUp(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");

  clearSessionExpiredFlag();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  session = data.session;
  return data.session;
}

export async function signOut() {
  clearSessionExpiredFlag();
  session = null;
  const supabase = await getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error && !isAuthExpiredError(error)) throw error;
  } catch (err) {
    if (!isAuthExpiredError(err)) throw err;
    await supabase.auth.signOut({ scope: "local" });
  }
}

/** @param {string} email */
export async function sendPasswordReset(email) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");

  const redirectTo =
    typeof location !== "undefined" ? `${location.origin}/` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/** @param {string} password */
export async function updateUserPassword(password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
}
