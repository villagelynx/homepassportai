const STORAGE_KEY = "homepassport-ai:prefs:room-chips";
const AXIS_KEY = "homepassport-ai:prefs:filter-axis";

/** @typedef {"room" | "type"} HomeFilterAxis */

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

/** @returns {HomeFilterAxis} */
export function loadHomeFilterAxis() {
  try {
    const value = localStorage.getItem(AXIS_KEY);
    if (value === "type") return "type";
  } catch {
    // private mode
  }
  return "room";
}

/** @param {HomeFilterAxis} axis */
export function saveHomeFilterAxis(axis) {
  try {
    localStorage.setItem(AXIS_KEY, axis === "type" ? "type" : "room");
  } catch {
    // ignore
  }
}
