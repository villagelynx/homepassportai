/** Where to find model/serial labels — shown after step 1 when type is known. */
export const LABEL_HINTS = {
  dishwasher: "Dishwasher detected. The model label is usually on the inside edge of the door.",
  refrigerator: "Refrigerator detected. The label is often inside the fresh-food compartment on the left wall.",
  fridge: "Refrigerator detected. The label is often inside the fresh-food compartment on the left wall.",
  oven: "Range or oven detected. Check the door frame, drawer opening, or behind the storage drawer.",
  range: "Range detected. The rating plate is often on the door frame or behind the bottom drawer.",
  microwave: "Microwave detected. Look inside the door area or on the back of the unit.",
  washer: "Washer detected. The label is often on the inside of the door or the back panel.",
  dryer: "Dryer detected. Check inside the door opening, the back, or the side panel.",
  "water heater": "Water heater detected. The label is usually near the bottom on the front or side.",
  furnace: "Furnace detected. The label is often on the inside of the front access panel.",
  hvac: "HVAC unit detected. Check the inside of the service panel or the side of the air handler.",
  disposal: "Disposal detected. The label may be on the bottom or side of the unit under the sink.",
  default:
    "Take a clear close-up of the manufacturer’s sticker with model and serial numbers. Good lighting helps.",
};

/**
 * @param {string | null | undefined} applianceType
 * @returns {string}
 */
export function hintForType(applianceType) {
  if (!applianceType?.trim()) return LABEL_HINTS.default;
  const key = applianceType.trim().toLowerCase();
  for (const [pattern, text] of Object.entries(LABEL_HINTS)) {
    if (pattern === "default") continue;
    if (key.includes(pattern)) return text;
  }
  const titled = applianceType.trim();
  return `${titled} detected. ${LABEL_HINTS.default}`;
}
