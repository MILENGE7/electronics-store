import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "cart";

function readStoredItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  // [{ productId, name, price, quantity }] — persisted to localStorage so the
  // cart survives a refresh/reopen. No payment data ever touches this store.
  const [items, setItems] = useState(readStoredItems);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage unavailable (private browsing, quota) — cart just won't persist
    }
  }, [items]);

  function addItem(product, quantity = 1) {
    // Cap at product.stock so repeated adds (e.g. clicking "Add to Cart" a
    // few times, or Buy Now on top of an existing cart entry) can't push a
    // line's quantity past what's actually available — a per-call quantity
    // selector capped at product.stock isn't enough on its own since it
    // doesn't know what's already in the cart for that same product.
    const stock = typeof product.stock === "number" ? product.stock : Infinity;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, stock);
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: nextQuantity } : i));
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: Math.min(quantity, stock) }];
    });
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQuantity(productId, quantity) {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
