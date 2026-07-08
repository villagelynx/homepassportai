const STORAGE_KEY = "homepassport-ai:theme";

/** @type {readonly ["system", "light", "dark"]} */
export const THEME_OPTIONS = ["system", "light", "dark"];

/** @returns {"system" | "light" | "dark"} */
export function loadThemePreference() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // private mode
  }
  return "system";
}

/** @param {"system" | "light" | "dark"} preference */
export function saveThemePreference(preference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // ignore
  }
  applyTheme(preference);
}

/** @param {"system" | "light" | "dark"} preference */
export function applyTheme(preference) {
  const root = document.documentElement;
  if (preference === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;

  const prefersDark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  meta.setAttribute("content", prefersDark ? "#1d6fd8" : "#f4f7fb");
}

export function initTheme() {
  applyTheme(loadThemePreference());

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", () => {
    if (loadThemePreference() === "system") applyTheme("system");
  });
}
