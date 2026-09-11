import { createContext, useContext, useEffect, useState } from "react";

const RecentlyViewedContext = createContext(null);

const STORAGE_KEY = "fk_recently_viewed";
const MAX_ITEMS = 10;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // Old/corrupt data (wrong shape, non-string entries) is dropped rather than crashing.
    return arr.filter((id) => typeof id === "string" && id.trim().length > 0).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeStored(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private browsing, quota) — history just won't persist
  }
}

export function RecentlyViewedProvider({ children }) {
  const [ids, setIds] = useState(readStored);

  useEffect(() => {
    writeStored(ids);
  }, [ids]);

  // Called when a ProductDetail page successfully loads a real product.
  // Moves the product to the front; a repeat view of the already-most-recent
  // product is a no-op so it doesn't churn state on re-renders.
  function recordView(productId) {
    if (!productId || typeof productId !== "string") return;
    setIds((prev) => {
      if (prev[0] === productId) return prev;
      return [productId, ...prev.filter((id) => id !== productId)].slice(0, MAX_ITEMS);
    });
  }

  // Used to silently drop IDs whose product no longer exists server-side.
  function removeId(productId) {
    setIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : prev));
  }

  return (
    <RecentlyViewedContext.Provider value={{ ids, recordView, removeId }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}
