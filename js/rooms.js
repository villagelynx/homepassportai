/** Canonical room order for grouping, filter chips, and select lists. */
export const BUILDING_GROUP_LABEL = "Building";

/** @readonly Filter chip id for all building subcategories. */
export const BUILDING_FILTER_ID = "building";

/** Home systems and structural categories grouped under Building. */
export const BUILDING_ROOMS = [
  "Flooring",
  "Bathroom fixtures",
  "Kitchen fixtures",
  "Plumbing and heating",
  "Lighting",
  "Fireplace",
  "Windows",
  "Doors",
];

export const OUTDOOR_GROUP_LABEL = "Outdoor";

/** @readonly Filter chip id for deck, patio, and general outdoor items. */
export const OUTDOOR_FILTER_ID = "outdoor-group";

/** Outdoor living subcategories grouped under Outdoor. */
export const OUTDOOR_ROOMS = ["Deck", "Patio"];

export const ROOM_ORDER = [
  "Kitchen",
  "Pantry",
  "Dining room",
  "Living room",
  "Den",
  "Office",
  "Bedroom 1",
  "Bedroom 2",
  "Bedroom 3",
  "Bedroom 4",
  "Bedroom 5",
  "Bedroom",
  "Bathroom",
  "Primary bathroom",
  "Half bath",
  "Laundry",
  "Mudroom",
  "Garage",
  "Basement",
  "Attic",
  "Utility",
  ...BUILDING_ROOMS,
  ...OUTDOOR_ROOMS,
  "Outdoor",
  "Other",
];

/** @param {string} room */
export function isBuildingRoom(room) {
  return BUILDING_ROOMS.includes(room);
}

/** @param {string} room */
export function isOutdoorGroupRoom(room) {
  return OUTDOOR_ROOMS.includes(room) || room === "Outdoor";
}

/** @type {Record<string, string>} */
const ROOM_LABELS = {
  Utility: "Utility / mechanical",
  Flooring: "Flooring",
  "Bathroom fixtures": "Bathroom fixtures",
  "Kitchen fixtures": "Kitchen fixtures",
  "Plumbing and heating": "Plumbing and heating",
  Lighting: "Lighting",
  Fireplace: "Fireplace",
  Windows: "Windows",
  Doors: "Doors",
  Building: "Building",
  Deck: "Deck",
  Patio: "Patio",
  Outdoor: "Outdoor (yard & garden)",
};

/** @type {Record<string, string>} */
const ROOM_ICONS = {
  Kitchen: "🍴",
  Pantry: "🫙",
  "Dining room": "🍽️",
  "Living room": "🛋️",
  Den: "📚",
  Office: "💼",
  "Bedroom 1": "🛏️",
  "Bedroom 2": "🛏️",
  "Bedroom 3": "🛏️",
  "Bedroom 4": "🛏️",
  "Bedroom 5": "🛏️",
  Bedroom: "🛏️",
  Bathroom: "🚿",
  "Primary bathroom": "🛁",
  "Half bath": "🚽",
  Laundry: "🧺",
  Mudroom: "👟",
  Garage: "🚗",
  Basement: "🏚️",
  Attic: "📦",
  Utility: "⚙️",
  Flooring: "🪵",
  "Bathroom fixtures": "🚿",
  "Kitchen fixtures": "🍳",
  "Plumbing and heating": "🔧",
  Lighting: "💡",
  Fireplace: "🔥",
  Windows: "🪟",
  Doors: "🚪",
  Building: "🏗️",
  Deck: "🪵",
  Patio: "⛱️",
  Outdoor: "🌳",
  Other: "📍",
};

/** @param {string} room */
export function roomIcon(room) {
  return ROOM_ICONS[room] ?? "📍";
}

/** @param {string} room */
export function roomDisplayName(room) {
  return ROOM_LABELS[room] ?? room;
}

const SVG_NS = "http://www.w3.org/2000/svg";

const ROOM_ICON_STROKE = {
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.8",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

/** @type {Record<string, string[]>} */
const ROOM_ICON_PATHS = {
  all: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  kitchen: ["M7 3v11", "M5 6h4", "M5 9h4", "M17 3v18", "M14 7h6"],
  pantry: ["M4 7h16", "M4 12h16", "M4 17h16", "M6 7v10", "M18 7v10"],
  dining: ["M4 10h16v2H4z", "M6 12v6", "M18 12v6"],
  living: ["M4 12h16a2 2 0 0 1 2 2v3H2v-3a2 2 0 0 1 2-2z", "M5 12V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"],
  den: ["M4 7h16v9H4z", "M9 20h6", "M12 16v4"],
  office: ["M5 5h14v9H5z", "M9 18h6", "M12 14v4"],
  bedroom: ["M3 13h18v5H3z", "M5 13V9h6v4", "M13 13V9h6v4"],
  bathroom: ["M4 12h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z", "M6 12V9a2 2 0 0 1 2-2h1", "M15 7v2"],
  "half-bath": ["M6 15h12", "M8 15c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5", "M12 8V5"],
  laundry: ["M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M12 13a2.5 2.5 0 1 0 0 .01"],
  mudroom: ["M12 4v3", "M9 7h6", "M10 7v10", "M14 7v10"],
  garage: ["M3 13h18v5H3z", "M6 13l2.5-5h7L18 13"],
  basement: ["M4 6h6v4H4z", "M10 10h6v4h-6z", "M16 14h4v4h-4z"],
  attic: ["M3 12 12 5l9 7", "M6 12v7h12v-7"],
  utility: ["M12 9a3 3 0 1 0 0 .01", "M12 3v2", "M12 19v2", "M5.6 5.6l1.4 1.4", "M17 17l1.4 1.4", "M3 12h2", "M19 12h2", "M5.6 18.4l1.4-1.4", "M17 7l1.4-1.4"],
  outdoor: ["M12 4v2", "M12 18v2", "M4.9 7.1l1.4 1.4", "M17.7 16.5l1.4 1.4", "M3 12h2", "M19 12h2", "M4.9 16.9l1.4-1.4", "M17.7 6.9l1.4-1.4", "M8 20h8"],
  other: ["M5 4h14v16H5z", "M9 12h6"],
  flooring: ["M4 18h16", "M4 14h6v4H4z", "M10 14h10v4H10z", "M4 10h16"],
  "bathroom-fixtures": ["M8 10h8", "M10 10v8", "M14 10v8", "M6 18h12"],
  "kitchen-fixtures": ["M6 8h12v10H6z", "M9 8V5h6v3"],
  plumbing: ["M10 4v4", "M14 4v4", "M8 8h8v3", "M12 11v9"],
  lighting: ["M12 3v2", "M8 10a4 4 0 1 0 8 0", "M10 18h4v3h-4z"],
  fireplace: ["M6 20h12", "M8 20V10l4-4 4 4v10", "M12 14v2"],
  windows: ["M4 6h16v12H4z", "M12 6v12", "M4 12h16"],
  doors: ["M8 4h8v16H8z", "M14 12h.01"],
  building: ["M4 20V9l8-5 8 5v11", "M10 20v-6h4v6"],
  deck: ["M4 18h16", "M6 14h3v4H6z", "M15 14h3v4h-3z", "M4 10h16"],
  patio: ["M5 18h14", "M8 18V8h8v10", "M11 8V5h2v3"],
};

/** @type {Record<string, string>} */
const ROOM_ICON_KIND = {
  Kitchen: "kitchen",
  Pantry: "pantry",
  "Dining room": "dining",
  "Living room": "living",
  Den: "den",
  Office: "office",
  Bathroom: "bathroom",
  "Primary bathroom": "bathroom",
  "Half bath": "half-bath",
  Laundry: "laundry",
  Mudroom: "mudroom",
  Garage: "garage",
  Basement: "basement",
  Attic: "attic",
  Utility: "utility",
  Flooring: "flooring",
  "Bathroom fixtures": "bathroom-fixtures",
  "Kitchen fixtures": "kitchen-fixtures",
  "Plumbing and heating": "plumbing",
  Lighting: "lighting",
  Fireplace: "fireplace",
  Windows: "windows",
  Doors: "doors",
  Building: "building",
  Deck: "deck",
  Patio: "patio",
  Outdoor: "outdoor",
  Other: "other",
};

/** @param {string} room */
function roomIconKind(room) {
  if (room === "all") return "all";
  if (room.startsWith("Bedroom")) return "bedroom";
  return ROOM_ICON_KIND[room] ?? "other";
}

/** @param {string[]} paths @param {string} color */
function createSvgRoomIcon(paths, color) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "room-icon room-icon--svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  }
  return svg;
}

/** @param {string} room */
export function createRoomIcon(room) {
  if (room === "Kitchen") {
    return createSvgRoomIcon(ROOM_ICON_PATHS.kitchen, "#d97706");
  }

  const icon = document.createElement("span");
  icon.className = "room-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = room === "all" ? "🏠" : roomIcon(room);
  return icon;
}

/** @param {HTMLElement} el @param {string} room @param {string} text */
export function setRoomTitleElement(el, room, text) {
  el.replaceChildren();
  el.classList.add("room-title");
  el.append(createRoomIcon(room));
  const label = document.createElement("span");
  label.className = "room-title__text";
  label.textContent = text;
  el.append(label);
}

/** @param {string} guess */
export function mapRoomGuess(guess) {
  const g = String(guess || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const map = {
    kitchen: "Kitchen",
    pantry: "Pantry",
    "dining room": "Dining room",
    dining: "Dining room",
    "living room": "Living room",
    living: "Living room",
    den: "Den",
    "family room": "Den",
    office: "Office",
    "bedroom 1": "Bedroom 1",
    "bedroom 2": "Bedroom 2",
    "bedroom 3": "Bedroom 3",
    "bedroom 4": "Bedroom 4",
    "bedroom 5": "Bedroom 5",
    bedroom: "Bedroom",
    "primary bedroom": "Bedroom 1",
    "master bedroom": "Bedroom 1",
    bathroom: "Bathroom",
    "primary bathroom": "Primary bathroom",
    "master bathroom": "Primary bathroom",
    "half bath": "Half bath",
    "half bathroom": "Half bath",
    "powder room": "Half bath",
    laundry: "Laundry",
    mudroom: "Mudroom",
    garage: "Garage",
    basement: "Basement",
    attic: "Attic",
    utility: "Utility",
    "utility / mechanical": "Utility",
    mechanical: "Utility",
    flooring: "Flooring",
    floor: "Flooring",
    hardwood: "Flooring",
    tile: "Flooring",
    carpet: "Flooring",
    "bathroom fixtures": "Bathroom fixtures",
    "bath fixtures": "Bathroom fixtures",
    "kitchen fixtures": "Kitchen fixtures",
    plumbing: "Plumbing and heating",
    heating: "Plumbing and heating",
    hvac: "Plumbing and heating",
    furnace: "Plumbing and heating",
    "water heater": "Plumbing and heating",
    lighting: "Lighting",
    lights: "Lighting",
    "light fixtures": "Lighting",
    fireplace: "Fireplace",
    hearth: "Fireplace",
    windows: "Windows",
    window: "Windows",
    doors: "Doors",
    door: "Doors",
    deck: "Deck",
    patio: "Patio",
    barbecue: "Deck",
    barbeque: "Deck",
    bbq: "Deck",
    grill: "Deck",
    "outdoor furniture": "Deck",
    outdoor: "Outdoor",
    outside: "Outdoor",
    yard: "Outdoor",
    garden: "Outdoor",
    other: "Other",
  };
  return map[g] || "Other";
}

/** @param {HTMLSelectElement | null | undefined} select @param {string | undefined} selected */
export function populateRoomSelect(select, selected) {
  if (!select) return;
  const keep = selected ?? select.value;
  const rooms = [...ROOM_ORDER];
  if (keep && !rooms.includes(keep)) {
    rooms.push(keep);
  }
  select.innerHTML = "";
  for (const room of rooms) {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = `${roomIcon(room)} ${roomDisplayName(room)}`;
    select.append(option);
  }
  if (keep && [...select.options].some((opt) => opt.value === keep)) {
    select.value = keep;
  }
}

/** Pipe-separated room_guess values for AI prompts. */
export function roomGuessPromptEnum() {
  return ROOM_ORDER.map((room) => `"${room}"`).join(" | ");
}
