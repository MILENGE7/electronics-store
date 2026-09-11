import { createContext, useContext, useEffect, useState } from "react";

const ComparisonContext = createContext(null);

const STORAGE_KEY = "fk_comparison";
const MAX_COMPARE = 4;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Normalize: strings only, deduped, capped — recovers from corrupt/old data
    // (an object instead of an array, non-string entries, duplicates, an
    // oversized list) rather than crashing.
    const seen = new Set();
    const clean = [];
    for (const entry of parsed) {
      if (typeof entry !== "string" || !entry.trim() || seen.has(entry)) continue;
      seen.add(entry);
      clean.push(entry);
      if (clean.length >= MAX_COMPARE) break;
    }
    return clean;
  } catch {
    return [];
  }
}

function writeStored(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private browsing, quota) — comparison just won't persist
  }
}

export function ComparisonProvider({ children }) {
  const [ids, setIds] = useState(readStored);

  useEffect(() => {
    writeStored(ids);
  }, [ids]);

  function isComparing(productId) {
    return ids.includes(productId);
  }

  // Returns "added" | "removed" | "limit" so the caller (ProductCard) can
  // show the right feedback — an at-limit attempt is never a silent no-op.
  function toggleCompare(productId) {
    if (!productId) return "error";
    if (ids.includes(productId)) {
      setIds((prev) => prev.filter((id) => id !== productId));
      return "removed";
    }
    if (ids.length >= MAX_COMPARE) {
      return "limit";
    }
    setIds((prev) => [...prev, productId]);
    return "added";
  }

  function removeFromComparison(productId) {
    setIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : prev));
  }

  function clearComparison() {
    setIds([]);
  }

  return (
    <ComparisonContext.Provider
      value={{ ids, isComparing, toggleCompare, removeFromComparison, clearComparison, maxCompare: MAX_COMPARE }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  return useContext(ComparisonContext);
}
