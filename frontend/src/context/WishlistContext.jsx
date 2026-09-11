import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext(null);

const STORAGE_KEY = "wishlist";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    // Old/corrupt data (non-string entries, wrong shape) is dropped rather than crashing.
    return new Set(parsed.filter((id) => typeof id === "string" && id.trim().length > 0));
  } catch {
    return new Set();
  }
}

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // localStorage unavailable (private browsing, quota) — wishlist just won't persist
    }
  }, [ids]);

  function toggleWishlist(productId) {
    setIds((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  }

  function isWishlisted(productId) {
    return ids.has(productId);
  }

  // Idempotent removal (unlike toggle, calling it twice never re-adds) — used
  // by the Wishlist page's explicit Remove action and for dropping IDs whose
  // product no longer exists.
  function removeFromWishlist(productId) {
    setIds((prev) => {
      if (!prev.has(productId)) return prev;
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }

  return (
    <WishlistContext.Provider value={{ ids, toggleWishlist, isWishlisted, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
