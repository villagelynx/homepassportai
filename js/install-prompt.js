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

/** @returns {"ios" | "desktop"} */
export function installHintMode() {
  return isIosDevice() ? "ios" : "desktop";
}
