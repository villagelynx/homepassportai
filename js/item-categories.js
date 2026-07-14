/**
 * Soft buckets for free-text `applianceType` — no schema change required.
 * First matching rule wins; keep specific patterns before broad ones.
 */

/** @typedef {{ id: string, label: string, icon: string, patterns: RegExp[] }} ItemCategory */

/** @type {ItemCategory[]} */
export const ITEM_CATEGORIES = [
  {
    id: "appliances",
    label: "Appliances",
    icon: "🔌",
    patterns: [
      /\b(dishwasher|refrigerator|fridge|freezer|oven|range|stove|cooktop|microwave|washer|washing machine|dryer|disposal|garbage disposal|water heater|furnace|boiler|hvac|air conditioner|a\/c|ac unit|dehumidifier|humidifier|vacuum|ice maker)\b/i,
    ],
  },
  {
    id: "electronics",
    label: "Electronics",
    icon: "📺",
    patterns: [
      /\b(tv|television|monitor|laptop|computer|desktop|tablet|iphone|android|phone|speaker|soundbar|stereo|receiver|console|playstation|xbox|nintendo|projector|camera|router|modem|printer|smart\s?home|echo|alexa|chromecast)\b/i,
    ],
  },
  {
    id: "furniture",
    label: "Furniture",
    icon: "🛋️",
    patterns: [
      /\b(sofa|couch|loveseat|chair|recliner|ottoman|table|desk|dresser|nightstand|bed|mattress|bookshelf|shelf|cabinet|wardrobe|bench|stool|hutch|sideboard|buffet|filing cabinet)\b/i,
    ],
  },
  {
    id: "artwork",
    label: "Artwork",
    icon: "🖼️",
    patterns: [
      /\b(painting|artwork|art print|print|canvas|sculpture|statue|poster|photograph|photo print|drawing|sketch|lithograph|giclee|fine art)\b/i,
    ],
  },
  {
    id: "decor",
    label: "Decor",
    icon: "🪴",
    patterns: [
      /\b(lamp|rug|curtain|drape|mirror|vase|plant|planter|clock|pillow|throw|candle|frame|wall art|decoration|decor)\b/i,
    ],
  },
  {
    id: "tools",
    label: "Tools & gear",
    icon: "🛠️",
    patterns: [
      /\b(tool|drill|saw|mower|lawnmower|trimmer|ladder|generator|bike|bicycle|scooter|kayak|grill|bbq|smoker|heater|fan|compressor)\b/i,
    ],
  },
];

export const OTHER_CATEGORY_ID = "other";
export const OTHER_CATEGORY_LABEL = "Other";
export const OTHER_CATEGORY_ICON = "📦";

/**
 * @param {string | null | undefined} applianceType
 * @returns {string} category id
 */
export function mapItemCategory(applianceType) {
  const text = String(applianceType || "").trim();
  if (!text) return OTHER_CATEGORY_ID;
  for (const cat of ITEM_CATEGORIES) {
    if (cat.patterns.some((re) => re.test(text))) return cat.id;
  }
  return OTHER_CATEGORY_ID;
}

/**
 * @param {string} categoryId
 * @returns {{ id: string, label: string, icon: string }}
 */
export function getItemCategoryMeta(categoryId) {
  if (categoryId === OTHER_CATEGORY_ID) {
    return { id: OTHER_CATEGORY_ID, label: OTHER_CATEGORY_LABEL, icon: OTHER_CATEGORY_ICON };
  }
  const found = ITEM_CATEGORIES.find((c) => c.id === categoryId);
  return found
    ? { id: found.id, label: found.label, icon: found.icon }
    : { id: OTHER_CATEGORY_ID, label: OTHER_CATEGORY_LABEL, icon: OTHER_CATEGORY_ICON };
}

/**
 * @param {import("./storage.js").ApplianceRecord[]} appliances
 * @returns {[string, import("./storage.js").ApplianceRecord[]][]}
 */
export function groupByItemCategory(appliances) {
  /** @type {Map<string, import("./storage.js").ApplianceRecord[]>} */
  const map = new Map();
  for (const cat of ITEM_CATEGORIES) map.set(cat.id, []);
  map.set(OTHER_CATEGORY_ID, []);

  for (const item of appliances) {
    const id = mapItemCategory(item.applianceType);
    const bucket = map.get(id) || map.get(OTHER_CATEGORY_ID);
    bucket.push(item);
  }

  /** @type {[string, import("./storage.js").ApplianceRecord[]][]} */
  const ordered = [];
  for (const cat of ITEM_CATEGORIES) {
    const items = map.get(cat.id) || [];
    if (items.length) ordered.push([cat.id, items]);
  }
  const other = map.get(OTHER_CATEGORY_ID) || [];
  if (other.length) ordered.push([OTHER_CATEGORY_ID, other]);
  return ordered;
}
