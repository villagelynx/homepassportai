const STORAGE_KEY = "homepassport-ai:prefs:room-chips";

/** @returns {boolean} */
export function loadRoomChipsEnabled() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "0" || value === "false") return false;
  } catch {
    // private mode
  }
  return true;
}

/** @param {boolean} enabled */
export function saveRoomChipsEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}
