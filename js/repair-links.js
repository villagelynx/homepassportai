/**
 * @param {{ applianceType?: string, brand?: string }} appliance
 * @param {{ label?: string, zip?: string, lat?: number, lng?: number } | null} location
 * @returns {string | null}
 */
export function localRepairSearchUrl(appliance, location) {
  if (!location) return null;

  const type = appliance.applianceType?.trim() || "appliance";
  const brand = appliance.brand?.trim() ?? "";
  const terms = [brand, type, "repair"].filter(Boolean).join(" ");

  if (location.lat != null && location.lng != null) {
    const q = encodeURIComponent(terms);
    return `https://www.google.com/maps/search/${q}/@${location.lat},${location.lng},12z`;
  }

  const area = location.zip?.trim() || location.label?.trim();
  if (!area) return null;

  const query = `${terms} near ${area}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * @param {{ applianceType?: string, brand?: string }} appliance
 * @param {{ label?: string, zip?: string } | null} location
 * @returns {string | null}
 */
export function localRepairGoogleUrl(appliance, location) {
  const area = location?.zip?.trim() || location?.label?.trim();
  if (!area) return null;

  const type = appliance.applianceType?.trim() || "appliance";
  const brand = appliance.brand?.trim() ?? "";
  const query = [brand, type, "repair", area].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
