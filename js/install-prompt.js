const DISMISS_KEY = "homepassport-ai:install-dismissed";

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    /** @type {Window & { navigator: { standalone?: boolean } }} */ (window).navigator.standalone === true
  );
}

/** iPhone, iPad (including iPadOS desktop mode), iPod */
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function shouldShowInstallPrompt() {
  if (isStandaloneApp()) return false;
  try {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("install") === "1") return isIosDevice();
    }
    if (localStorage.getItem(DISMISS_KEY) === "1") return false;
  } catch {
    // ignore
  }
  return isIosDevice();
}

export function isInstallDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

export function resetInstallPrompt() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    // ignore
  }
}

/** @returns {"ios" | "desktop"} */
export function installHintMode() {
  return isIosDevice() ? "ios" : "desktop";
}
