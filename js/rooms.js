/** Canonical room order for grouping, filter chips, and select lists. */
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
  "Outdoor",
  "Other",
];

/** @type {Record<string, string>} */
const ROOM_LABELS = {
  Utility: "Utility / mechanical",
};

/** @param {string} room */
export function roomDisplayName(room) {
  return ROOM_LABELS[room] ?? room;
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
    outdoor: "Outdoor",
    outside: "Outdoor",
    patio: "Outdoor",
    deck: "Outdoor",
    yard: "Outdoor",
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
    option.textContent = roomDisplayName(room);
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
