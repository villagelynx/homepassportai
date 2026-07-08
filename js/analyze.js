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

/** @param {string} text @param {Response} res */
function formatAnalyzeError(text, res) {
  const trimmed = text.trim();
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
 * @param {{ appliancePhotoDataUrl: string, labelPhotoDataUrl: string }} photos
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzeAppliancePhotos(photos) {
  /** @type {Record<string, string>} */
  const headers = { "Content-Type": "application/json" };
  const apiKey = loadApiKey();
  if (apiKey) {
    headers["X-OpenAI-Api-Key"] = apiKey;
  }

  let res;
  try {
    res = await fetch(config.analyzeApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(photos),
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
