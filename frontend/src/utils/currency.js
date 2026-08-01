// Rwandan francs don't carry meaningful subunits in everyday use, so amounts
// are shown as whole numbers with thousands separators, e.g. "RWF 25,000".
export function formatRWF(amount) {
  return `RWF ${Math.round(Number(amount)).toLocaleString()}`;
}
