/**
 * Build a web search for the owner's manual (Phase A — no manual API yet).
 * @param {{ brand?: string, modelNumber?: string, applianceType?: string }} appliance
 * @returns {string | null}
 */
export function manualSearchUrl(appliance) {
  const brand = appliance.brand?.trim() ?? "";
  const model = appliance.modelNumber?.trim() ?? "";
  const type = appliance.applianceType?.trim() ?? "";

  if (!brand && !model) return null;

  const query = [brand, model, type, "owner manual"]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * @param {{ brand?: string, modelNumber?: string }} appliance
 * @returns {string | null}
 */
export function manualsLibSearchUrl(appliance) {
  const model = appliance.modelNumber?.trim() ?? "";
  const brand = appliance.brand?.trim() ?? "";
  const q = model || brand;
  if (!q) return null;
  return `https://www.manualslib.com/products/?q=${encodeURIComponent(q)}`;
}
