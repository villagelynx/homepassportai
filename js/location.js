import { migrateLegacyStorageKey, storageKey } from "./storage-keys.js";

const LOCATION_KEY = storageKey("location:v1");
const LEGACY_KEY = "home-passport:location:v1";

migrateLegacyStorageKey(LOCATION_KEY, LEGACY_KEY);

/**
 * @typedef {object} HomeLocation
 * @property {string} [zip]
 * @property {string} [label] Human-readable area, e.g. "Portland, OR"
 * @property {number} [lat]
 * @property {number} [lng]
 */

/** @returns {HomeLocation | null} */
export function loadLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** @param {HomeLocation | null} location */
export function saveLocation(location) {
  if (!location || (!location.zip && !location.label && location.lat == null)) {
    localStorage.removeItem(LOCATION_KEY);
    return;
  }
  localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
}

/** @param {HomeLocation | null} */
export function locationDisplayLabel(location) {
  if (!location) return "";
  if (location.label?.trim()) return location.label.trim();
  if (location.zip?.trim()) return location.zip.trim();
  if (location.lat != null && location.lng != null) {
    return `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`;
  }
  return "";
}

/** @returns {Promise<HomeLocation>} */
export function detectCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Current location",
        });
      },
      (err) => {
        const msg =
          err.code === 1
            ? "Location permission denied — enter a ZIP code instead."
            : "Could not get location — enter a ZIP code instead.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  });
}
