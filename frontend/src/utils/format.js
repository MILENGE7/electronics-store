// Presentation-only helpers: they never touch stored data, only how it renders.

const KNOWN_WORDS = {
  iphone: "iPhone",
  ipad: "iPad",
  ipod: "iPod",
  macbook: "MacBook",
  jbl: "JBL",
  led: "LED",
  tv: "TV",
  usb: "USB",
  fk: "FK",
};

function titleCaseWord(word) {
  const lower = word.toLowerCase();
  if (KNOWN_WORDS[lower]) return KNOWN_WORDS[lower];
  if (/^\d+$/.test(word)) return word;
  if (word.length <= 1) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Title-cases a string while preserving known brand/product acronyms
// (iPhone, JBL, LED, ...) and leaving numbers untouched.
export function toTitleCase(str = "") {
  return String(str)
    .split(/(\s+|-)/)
    .map((part) => (/^(\s+|-)$/.test(part) ? part : titleCaseWord(part)))
    .join("");
}

// Curated display names for known categories — these override the generic
// title-casing so store data can stay terse (e.g. "BULB") while the UI reads
// naturally (e.g. "Smart Bulbs"). Falls back to toTitleCase for anything new.
const CATEGORY_DISPLAY_OVERRIDES = {
  "iphone phone cases": "iPhone Cases",
  iphone: "iPhone",
  headphones: "Headphones",
  bulb: "Smart Bulbs",
  speakers: "Speakers",
  watches: "Watches",
};

export function formatCategoryName(name = "") {
  const key = String(name).trim().toLowerCase();
  return CATEGORY_DISPLAY_OVERRIDES[key] || toTitleCase(name);
}

export function formatProductName(name = "") {
  return toTitleCase(name);
}

export function formatBrandName(name = "") {
  return toTitleCase(name);
}
