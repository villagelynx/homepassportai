import { loadApiKey } from "./api-key.js";
import { config } from "./config.js";

/**
 * @typedef {object} AnalysisResult
 * @property {string} applianceType
 * @property {string} brand
 * @property {string} modelNumber
 * @property {string} serialNumber
 * @property {string} confidence low | medium | high
 * @property {string} [nickname]
 */

/**
 * @typedef {object} RoomItemResult
 * @property {string} nickname
 * @property {string} applianceType
 * @property {string} brand
 * @property {string} modelNumber
 * @property {string} serialNumber
 * @property {string} confidence
 * @property {number} frameIndex
 */

/**
 * @typedef {object} RoomAnalysisResult
 * @property {string} roomGuess
 * @property {RoomItemResult[]} items
 * @property {boolean} [demoMode]
 */

/** @param {string} text @param {Response} res */
function formatAnalyzeError(text, res) {
  const trimmed = text.trim();
  if (
    trimmed.includes("lambda") ||
    trimmed.includes("decoding") ||
    trimmed.includes("status code returned")
  ) {
    return "Photo analysis timed out or photos were too large. Try again on Wi-Fi, or add your OpenAI key in Settings.";
  }
  if (
    trimmed.includes("Error response") ||
    trimmed.includes("<title>Error") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html")
  ) {
    return (
      "Server not reachable. On your Mac run: cd ~/Documents/homepassport-ai && ./serve.sh " +
      "(do not use python3 -m http.server)"
    );
  }
  if (res.status === 404) {
    return "Analyze API not found — restart with ./serve.sh from homepassport-ai";
  }
  return trimmed.slice(0, 200) || `Analysis failed (HTTP ${res.status})`;
}

/**
 * @param {{ appliancePhotoDataUrl: string, labelPhotoDataUrl?: string | null }} photos
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzeAppliancePhotos(photos) {
  /** @type {Record<string, string>} */
  const headers = { "Content-Type": "application/json" };
  const apiKey = loadApiKey();
  if (apiKey) {
    headers["X-OpenAI-Api-Key"] = apiKey;
  }

  /** @type {Record<string, string>} */
  const body = { appliancePhotoDataUrl: photos.appliancePhotoDataUrl };
  if (photos.labelPhotoDataUrl) {
    body.labelPhotoDataUrl = photos.labelPhotoDataUrl;
  }

  let res;
  try {
    res = await fetch(config.analyzeApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Cannot reach the Mac server. Same Wi-Fi? Run ./serve.sh and use the http:// address shown (port 8080)."
    );
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(formatAnalyzeError(text, res));
  }

  if (!res.ok) {
    throw new Error(data.error || formatAnalyzeError(text, res));
  }

  return /** @type {AnalysisResult} */ (data);
}

/**
 * Analyze still frames extracted from a room-scan video.
 * @param {string[]} frames data URLs
 * @returns {Promise<RoomAnalysisResult>}
 */
export async function analyzeRoomFrames(frames) {
  /** @type {Record<string, string>} */
  const headers = { "Content-Type": "application/json" };
  const apiKey = loadApiKey();
  if (apiKey) {
    headers["X-OpenAI-Api-Key"] = apiKey;
  }

  let res;
  try {
    res = await fetch(config.analyzeRoomApiUrl || "/api/analyze-room", {
      method: "POST",
      headers,
      body: JSON.stringify({ frames }),
    });
  } catch {
    throw new Error(
      "Cannot reach the Mac server. Same Wi-Fi? Run ./serve.sh and use the http:// address shown (port 8080)."
    );
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(formatAnalyzeError(text, res));
  }

  if (!res.ok) {
    throw new Error(data.error || formatAnalyzeError(text, res));
  }

  const items = Array.isArray(data.items) ? data.items : [];
  return {
    roomGuess: String(data.roomGuess || data.room_guess || "Other"),
    demoMode: Boolean(data.demoMode),
    items: items.map((item, i) => ({
      nickname: String(item.nickname || `Item ${i + 1}`),
      applianceType: String(item.applianceType || item.appliance_type || "Item"),
      brand: String(item.brand || ""),
      modelNumber: String(item.modelNumber || item.model_number || ""),
      serialNumber: String(item.serialNumber || item.serial_number || ""),
      confidence: String(item.confidence || "medium").toLowerCase(),
      frameIndex: Number(item.frameIndex ?? item.frame_index ?? 0) || 0,
    })),
  };
}

/**
 * @returns {Promise<boolean>}
 */
export async function checkAnalyzeServer() {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch("/api/health", { cache: "no-store", signal: ctrl.signal });
    window.clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

/**
 * @param {File} file
 * @returns {Promise<string>} data URL
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
